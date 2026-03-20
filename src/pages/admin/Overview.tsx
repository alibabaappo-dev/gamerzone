import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { Users, Trophy, Clock, DollarSign, ArrowUpRight, LayoutDashboard, MessageSquare, CheckCircle2, XCircle, ArrowDownUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Overview() {
  const [users, setUsers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [totalCoins, setTotalCoins] = useState(0);

  useEffect(() => {
    // Initialize Admin Collection if missing
    const initAdmin = async () => {
      try {
        // Check/Create Leaderboard Settings
        const leaderboardRef = doc(db, 'admin', 'leaderboard_settings');
        // We don't need to check existence, setDoc with merge: true is safe and idempotent
        await setDoc(leaderboardRef, {
          allTimeChampion: '',
          updatedAt: new Date()
        }, { merge: true });

        // Check/Create Referral Settings
        const referralRef = doc(db, 'admin', 'referral_settings');
        await setDoc(referralRef, {
          referrerAmount: 10,
          refereeAmount: 5,
          enabled: true,
          updatedAt: new Date()
        }, { merge: true });

        // Check/Create Access Config
        const accessRef = doc(db, 'admin', 'access_config');
        await setDoc(accessRef, {
          key: 'ADMIN123', // Default key
          updatedAt: new Date()
        }, { merge: true });

        console.log('Admin collections initialized');
      } catch (error) {
        console.error('Error initializing admin collections:', error);
      }
    };
    initAdmin();

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setTotalCoins(usersData.reduce((acc, u: any) => acc + (u.walletBalance || 0), 0));
    });

    const unsubTournaments = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      setTournaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSupport = onSnapshot(collection(db, 'support_tickets'), (snapshot) => {
      setSupportTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubUsers();
      unsubTournaments();
      unsubTransactions();
      unsubSupport();
    };
  }, []);

  const pendingDeposits = transactions.filter(t => t.type === 'Deposit' && t.status === 'pending').length;
  const pendingWithdrawals = transactions.filter(t => t.type === 'Withdrawal' && t.status === 'pending').length;
  const totalPending = pendingDeposits + pendingWithdrawals;
  const approvedCount = transactions.filter(t => t.status === 'completed').length;
  const rejectedCount = transactions.filter(t => t.status === 'rejected').length;
  const pendingSupportTickets = supportTickets.filter(t => t.status === 'Pending').length;
  const adminsCount = users.filter(u => u.isAdmin).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-yellow-500 mb-1">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm">Welcome back, Admin!</p>
      </div>

      {/* 4 Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B1727] border border-blue-900/30 p-6 rounded-xl relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
             <div className="bg-blue-500/10 p-2.5 rounded-lg"><Users size={20} className="text-blue-400"/></div>
             <ArrowUpRight size={16} className="text-gray-600"/>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{users.length}</h3>
           <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Users</p>
        </div>
        
        <div className="bg-[#1A1A1A] border border-gray-800 p-6 rounded-xl relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
             <div className="bg-yellow-500/10 p-2.5 rounded-lg"><Trophy size={20} className="text-yellow-500"/></div>
             <ArrowUpRight size={16} className="text-gray-600"/>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{tournaments.length}</h3>
           <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Tournaments</p>
        </div>

        <div className="bg-[#2A1515] border border-red-900/30 p-6 rounded-xl relative overflow-hidden">
           {totalPending > 0 && <span className="absolute top-4 right-4 bg-red-500/20 text-red-500 border border-red-500/30 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Action Needed</span>}
           <div className="flex justify-between items-start mb-4">
             <div className="bg-red-500/10 p-2.5 rounded-lg"><Clock size={20} className="text-red-400"/></div>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{totalPending}</h3>
           <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pending Payments</p>
        </div>

        <div className="bg-[#0B221B] border border-green-900/30 p-6 rounded-xl relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
             <div className="bg-green-500/10 p-2.5 rounded-lg"><DollarSign size={20} className="text-green-400"/></div>
             <DollarSign size={16} className="text-gray-600"/>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{totalCoins}</h3>
           <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Coins in Circulation</p>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
          <Users size={16} className="mx-auto text-gray-400 mb-2" />
          <h4 className="text-xl font-bold text-white mb-1">{adminsCount}</h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Admins</p>
        </div>
        <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
          <Trophy size={16} className="mx-auto text-blue-400 mb-2" />
          <h4 className="text-xl font-bold text-white mb-1">{tournaments.length}</h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Total Tournaments</p>
        </div>
        <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
          <CheckCircle2 size={16} className="mx-auto text-green-400 mb-2" />
          <h4 className="text-xl font-bold text-white mb-1">0</h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Completed</p>
        </div>
        <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
          <DollarSign size={16} className="mx-auto text-green-400 mb-2" />
          <h4 className="text-xl font-bold text-white mb-1">{approvedCount}</h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Approved</p>
        </div>
        <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
          <XCircle size={16} className="mx-auto text-red-400 mb-2" />
          <h4 className="text-xl font-bold text-white mb-1">{rejectedCount}</h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Rejected</p>
        </div>
        <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
          <MessageSquare size={16} className="mx-auto text-purple-400 mb-2" />
          <h4 className="text-xl font-bold text-white mb-1">{pendingSupportTickets}</h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Support</p>
        </div>
      </div>

      {/* Bottom Section: Quick Actions & Recent Users */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Quick Actions */}
        <div>
          <h3 className="font-bold text-yellow-500 mb-4 flex items-center gap-2"><LayoutDashboard size={18}/> Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/admin/users" className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
              <span className="flex items-center gap-3"><Users size={20}/> Manage Users</span>
            </Link>
            <Link to="/admin/transactions" className="w-full bg-green-600 hover:bg-green-500 text-white p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
              <span className="flex items-center gap-3"><DollarSign size={20}/> Review Payments</span>
              {pendingDeposits > 0 && <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full">{pendingDeposits}</span>}
            </Link>
            <Link to="/admin/tournaments" className="w-full bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
              <span className="flex items-center gap-3"><Trophy size={20}/> Manage Tournaments</span>
            </Link>
            <Link to="/admin/transactions" className="w-full bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
              <span className="flex items-center gap-3"><ArrowDownUp size={20}/> Withdrawals</span>
              {pendingWithdrawals > 0 && <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full">{pendingWithdrawals}</span>}
            </Link>
          </div>
        </div>

        {/* Recent Users */}
        <div>
          <h3 className="font-bold text-yellow-500 mb-4 flex items-center gap-2"><Users size={18}/> Recent Users</h3>
          <div className="bg-[#131B2F] border border-gray-800 rounded-xl p-2 space-y-1">
            {users.slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-[#0B1121] rounded-lg border border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20">
                    {u.email ? u.email[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{u.username || 'User'}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-blue-900/30 text-blue-400 text-[10px] px-2 py-1 rounded uppercase font-bold tracking-wider">{u.isAdmin ? 'Admin' : 'User'}</span>
                  <p className="text-[10px] text-gray-600 mt-1.5 font-medium">{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-center text-gray-500 text-sm py-4">No users found.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
