import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Coins, 
  Trophy, 
  Receipt, 
  CheckCircle, 
  Wallet, 
  User, 
  Mail, 
  Calendar, 
  ArrowRight,
  Phone,
  Camera,
  ShieldCheck,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { doc, collection, query, where, getCountFromServer, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Profile({ user }: { user: any }) {
  const [copied, setCopied] = useState(false);
  const [tournamentsCount, setTournamentsCount] = useState(0);
  const [transactionsCount, setTransactionsCount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const registrationsQuery = query(collection(db, 'registrations'), where('userId', '==', user.uid));
        const registrationsSnapshot = await getCountFromServer(registrationsQuery);
        setTournamentsCount(registrationsSnapshot.data().count);

        const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const transactionsSnapshot = await getCountFromServer(transactionsQuery);
        setTransactionsCount(transactionsSnapshot.data().count);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    fetchCounts();

    const transactionsQuery = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        })
        .slice(0, 5);
      setTransactions(txs);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleCopy = () => {
    const code = user.referralCode || '';
    if (!code) return;

    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (copyErr) {
        console.error('Fallback copy failed', copyErr);
      }
      document.body.removeChild(textArea);
    }
  };

  // Real data
  const stats = {
    coins: user.coins || 0,
    earnings: user.totalEarnings || 0,
    tournaments: tournamentsCount,
    transactions: transactionsCount,
    status: user.isBanned ? 'Banned' : 'Active'
  };

  return (
    <div className="min-h-screen bg-[#050B14] text-white p-4 pb-24 font-sans selection:bg-yellow-400 selection:text-black">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        {/* Enhanced Header */}
        <div className="relative mb-12 pt-8">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 p-1 shadow-2xl shadow-yellow-500/20">
                <div className="w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center overflow-hidden border-4 border-[#050B14]">
                  <span className="text-4xl font-black text-yellow-400">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <button className="absolute bottom-0 right-0 p-2.5 bg-yellow-400 rounded-full text-black shadow-lg hover:scale-110 transition-transform">
                <Camera size={18} />
              </button>
            </div>
            
            <h1 className="text-3xl font-black text-white mb-1 tracking-tight">{user.username}</h1>
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <Mail size={14} />
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex items-center bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
              <ShieldCheck size={14} className="text-green-500 mr-1.5" />
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Verified Player</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Coins Balance */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[#0F172A] border border-gray-800/50 rounded-2xl p-5 relative overflow-hidden shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Coins</span>
              <Coins className="text-yellow-400" size={18} />
            </div>
            <div className="text-3xl font-black text-yellow-400 mb-0.5 tracking-tighter">{stats.coins}</div>
            <div className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">Available</div>
          </motion.div>

          {/* Tournaments Joined */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[#0F172A] border border-gray-800/50 rounded-2xl p-5 relative overflow-hidden shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Earnings</span>
              <Coins className="text-green-400" size={18} />
            </div>
            <div className="text-3xl font-black text-green-400 mb-0.5 tracking-tighter">{stats.earnings}</div>
            <div className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">Total Won</div>
          </motion.div>

          {/* Tournaments Joined */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[#0F172A] border border-gray-800/50 rounded-2xl p-5 relative overflow-hidden shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Events</span>
              <Trophy className="text-purple-400" size={18} />
            </div>
            <div className="text-3xl font-black text-purple-400 mb-0.5 tracking-tighter">{stats.tournaments}</div>
            <div className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">Joined</div>
          </motion.div>

          {/* Total Transactions */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[#0F172A] border border-gray-800/50 rounded-2xl p-5 relative overflow-hidden shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">History</span>
              <Receipt className="text-blue-400" size={18} />
            </div>
            <div className="text-3xl font-black text-white mb-0.5 tracking-tighter">{stats.transactions}</div>
            <div className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">Payments</div>
          </motion.div>

          {/* Account Status */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[#0F172A] border border-gray-800/50 rounded-2xl p-5 relative overflow-hidden shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Status</span>
              <CheckCircle className="text-green-400" size={18} />
            </div>
            <div className="text-xl font-black text-green-400 mb-0.5 tracking-tight">{stats.status}</div>
            <div className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">Active</div>
          </motion.div>
        </div>

        {/* Profile Information Section */}
        <div className="bg-[#0F172A] border border-gray-800/50 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                <User className="text-yellow-400" size={20} />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Profile Details</h2>
            </div>
          </div>

          <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-gray-800/50 pb-4">
                  <div className="flex items-center text-gray-500">
                    <User size={16} className="mr-3" />
                    <span className="text-xs font-black uppercase tracking-wider">Username</span>
                  </div>
                  <span className="font-black text-white text-base">{user.username}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800/50 pb-4">
                  <div className="flex items-center text-gray-500">
                    <Mail size={16} className="mr-3" />
                    <span className="text-xs font-black uppercase tracking-wider">Email</span>
                  </div>
                  <span className="font-black text-white text-sm">{user.email}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800/50 pb-4">
                  <div className="flex items-center text-gray-500">
                    <Phone size={16} className="mr-3" />
                    <span className="text-xs font-black uppercase tracking-wider">Phone</span>
                  </div>
                  <span className="font-black text-white text-base">{user.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800/50 pb-4">
                  <div className="flex items-center text-gray-500">
                    <Calendar size={16} className="mr-3" />
                    <span className="text-xs font-black uppercase tracking-wider">Joined</span>
                  </div>
                  <span className="font-black text-white text-base">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center text-gray-500">
                    <ShieldCheck size={16} className="mr-3 text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-wider">Referral Code</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-blue-400 text-lg tracking-widest">{user.referralCode || 'N/A'}</span>
                    <button 
                      onClick={handleCopy}
                      className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors text-blue-400"
                      title="Copy Code"
                    >
                      {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

        {/* Quick Actions */}
        <div className="bg-[#0F172A] border border-gray-800/50 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
              <Wallet className="text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <Link to="/wallet" className="group relative overflow-hidden bg-gradient-to-r from-yellow-400 to-yellow-600 p-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-yellow-500/20">
              <div className="relative z-10 flex items-center justify-between text-black font-black">
                <div className="flex items-center">
                  <Wallet size={20} className="mr-3" />
                  <span>Manage Wallet</span>
                </div>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link to="/tournaments" className="group relative overflow-hidden bg-[#2563EB] p-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20">
              <div className="relative z-10 flex items-center justify-between text-white font-black">
                <div className="flex items-center">
                  <Trophy size={20} className="mr-3" />
                  <span>Join Tournament</span>
                </div>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#0F172A] border border-gray-800/50 rounded-2xl p-6 shadow-xl mb-12">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center">
                <Receipt className="text-purple-400" size={20} />
              </div>
              <h2 className="text-xl font-black text-white leading-none tracking-tight">Recent<br/>Transactions</h2>
            </div>
            <Link to="/transactions" className="text-blue-400 text-sm font-black flex items-center hover:text-blue-300 transition-colors">
              View All <ArrowRight size={16} className="ml-1.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-[#050B14] border border-gray-800/50 rounded-xl hover:border-gray-700 transition-colors cursor-pointer" onClick={() => window.location.href = '/transactions'}>
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                    tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    <Receipt size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">{tx.type}</div>
                    <div className="text-[10px] font-bold text-gray-500">{tx.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-yellow-400">{tx.amount} coins</div>
                  <div className={`text-[9px] font-black uppercase tracking-widest ${
                    tx.status === 'completed' ? 'text-green-500' : 
                    tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                  }`}>{tx.status}</div>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center text-gray-500 py-4">No recent transactions</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
