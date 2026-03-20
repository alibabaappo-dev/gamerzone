import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Trophy, UserPlus, Zap, BarChart3, Calendar, Filter, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useGlobalLoader } from '../App';

interface Transaction {
  id: string;
  type: 'Deposit' | 'Withdrawal' | 'Joining' | 'Prize Pool' | 'Winning' | 'Reversal' | 'Referral' | 'Task Reward' | 'Tournament Entry';
  amount: number;
  date: string;
  status: 'Completed' | 'Pending' | 'Rejected' | 'completed' | 'pending' | 'rejected';
  description?: string;
  createdAt?: any;
  ign?: string;
  uid?: string;
  kills?: number;
}

export default function Transactions() {
  const [user] = useAuthState(auth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Income' | 'Expenses'>('All');

  const handleTabChange = (tab: 'All' | 'Income' | 'Expenses') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      }) as Transaction[];
      setTransactions(txData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Deposit':
        return <ArrowDownLeft className="text-green-400" size={20} />;
      case 'Withdrawal':
        return <ArrowUpRight className="text-red-400" size={20} />;
      case 'Prize Pool':
        return <Trophy className="text-yellow-400" size={20} />;
      case 'Winning':
        return <Trophy className="text-white" size={20} />;
      case 'Joining':
      case 'Tournament Entry':
        return <UserPlus className="text-blue-400" size={20} />;
      case 'Reversal':
        return <RotateCcw className="text-orange-400" size={20} />;
      case 'Referral':
      case 'Task Reward':
        return <ArrowUpRight className="text-gray-900" size={20} />;
      default:
        return <ArrowUpRight className="text-gray-400" size={20} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'Deposit':
        return 'text-green-400';
      case 'Withdrawal':
        return 'text-red-400';
      case 'Prize Pool':
        return 'text-yellow-400';
      case 'Winning':
        return 'text-yellow-400';
      case 'Joining':
      case 'Tournament Entry':
        return 'text-blue-400';
      case 'Reversal':
        return 'text-orange-400';
      case 'Referral':
      case 'Task Reward':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'completed':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'Pending':
      case 'pending':
        return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
      case 'Rejected':
      case 'rejected':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      default:
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // If it already looks formatted (has comma and AM/PM), return it
    if (dateString.includes(',') && (dateString.includes('AM') || dateString.includes('PM'))) {
      return dateString;
    }
    // Otherwise try to replace T or format it
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString.replace('T', ' ');
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch (e) {
      return dateString.replace('T', ' ');
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Income') return tx.type === 'Deposit' || tx.type === 'Prize Pool' || tx.type === 'Winning' || tx.type === 'Referral' || tx.type === 'Task Reward';
    if (activeTab === 'Expenses') return tx.type === 'Withdrawal' || tx.type === 'Joining' || tx.type === 'Tournament Entry' || tx.type === 'Reversal';
    return true;
  });

  const totalIncome = transactions
    .filter(tx => (tx.type === 'Deposit' || tx.type === 'Prize Pool' || tx.type === 'Winning' || tx.type === 'Referral' || tx.type === 'Task Reward') && (tx.status === 'Completed' || tx.status === 'completed'))
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalExpenses = transactions
    .filter(tx => (tx.type === 'Withdrawal' || tx.type === 'Joining' || tx.type === 'Tournament Entry' || tx.type === 'Reversal') && (tx.status === 'Completed' || tx.status === 'completed'))
    .reduce((acc, tx) => acc + tx.amount, 0);

  const chartData = [
    { name: 'Income', value: totalIncome, color: '#4ADE80' },
    { name: 'Expenses', value: totalExpenses, color: '#F87171' },
  ];

  return (
    <div className="min-h-screen bg-[#050B14] text-white p-4 font-sans pb-20">
      <div className="max-w-md mx-auto">
        <Link to="/" className="flex items-center text-blue-400 mb-6 hover:text-blue-300 transition-colors group">
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">Back to Dashboard</span>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-yellow-400 tracking-tight">Activity</h1>
          <div className="bg-yellow-400/10 p-2 rounded-xl border border-yellow-400/20">
            <BarChart3 size={20} className="text-yellow-400" />
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-[#0B1120] p-6 rounded-3xl border border-gray-800 mb-8 shadow-xl">
          <h3 className="text-sm font-bold text-gray-400 mb-6 flex items-center gap-2">
            <BarChart3 size={16} />
            Financial Overview
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 'bold' }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid #374151', borderRadius: '12px' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-br from-[#0B1120] to-[#111827] p-5 rounded-2xl border border-gray-800 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-400/10 p-1.5 rounded-lg">
                <ArrowDownLeft size={14} className="text-green-400" />
              </div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Income</p>
            </div>
            <p className="text-2xl font-black text-green-400">+{totalIncome}</p>
            <p className="text-[10px] text-gray-500 mt-1">Total coins earned</p>
          </div>
          <div className="bg-gradient-to-br from-[#0B1120] to-[#111827] p-5 rounded-2xl border border-gray-800 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-red-400/10 p-1.5 rounded-lg">
                <ArrowUpRight size={14} className="text-red-400" />
              </div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Expenses</p>
            </div>
            <p className="text-2xl font-black text-red-400">-{totalExpenses}</p>
            <p className="text-[10px] text-gray-500 mt-1">Total coins spent</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-[#0B1120] rounded-2xl border border-gray-800 mb-6 shadow-inner">
          {(['All', 'Income', 'Expenses'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 uppercase tracking-wider ${
                activeTab === tab 
                  ? 'bg-yellow-400 text-black shadow-xl scale-[1.02]' 
                  : 'text-gray-500 hover:text-white hover:bg-gray-800/30'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-bold text-gray-400 flex items-center gap-2">
            <Calendar size={14} />
            Recent History
          </h2>
          <button className="text-gray-500 hover:text-white transition-colors">
            <Filter size={14} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center mb-4 w-16 h-16">
              <div className="absolute inset-0 border-[2px] border-yellow-500/10 rounded-full"></div>
              <div className="absolute inset-0 border-[4px] border-transparent border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
              <div className="absolute inset-3 border-[2px] border-transparent border-b-yellow-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
              <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
            </div>
            <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-widest text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">Loading history...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="bg-[#0B1120] rounded-2xl p-4 border border-gray-800 flex items-center justify-between shadow-sm hover:border-gray-700 transition-all duration-300 hover:scale-[1.01] group">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${
                    tx.type === 'Winning' ? 'bg-yellow-400' :
                    tx.type === 'Referral' || tx.type === 'Task Reward' ? 'bg-white' :
                    `bg-opacity-10 ${getColor(tx.type).replace('text-', 'bg-')}`
                  }`}>
                    {getIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-bold text-white leading-tight text-sm">{tx.type}</p>
                    <p className="text-[10px] text-gray-500 mt-1 font-medium">{formatDate(tx.date)}</p>
                    {tx.description && <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-1 italic">{tx.description}</p>}
                    {(tx.ign || tx.uid || tx.kills !== undefined) && (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {tx.ign && <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">IGN: {tx.ign}</span>}
                        {tx.uid && <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">UID: {tx.uid}</span>}
                        {tx.kills !== undefined && <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">Kills: {tx.kills}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-lg tracking-tighter ${getColor(tx.type)}`}>
                    {tx.type === 'Deposit' || tx.type === 'Prize Pool' || tx.type === 'Winning' || tx.type === 'Referral' || tx.type === 'Task Reward' ? '+' : '-'}{tx.amount}
                  </p>
                  <span className={`inline-block mt-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-wider ${getStatusStyles(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="text-center py-16 bg-[#0B1120] rounded-3xl border border-dashed border-gray-800">
                <div className="bg-gray-800/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap size={24} className="text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm font-medium">No transactions found in this category.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
