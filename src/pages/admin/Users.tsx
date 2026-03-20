import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Users as UsersIcon, Search, ArrowDownUp, Ban, Shield, CheckCircle2, 
  User, Phone, Coins, Star, Crosshair, Trophy, Eye, Pencil, X, Loader2,
  MoreVertical, Trash2, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('All');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserData, setEditUserData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Quick Action States
  const [actionAmount, setActionAmount] = useState('');
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.phoneNumber?.includes(searchTerm)) ||
      (user.id?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = userStatusFilter === 'All' 
      ? true 
      : userStatusFilter === 'Active' ? !user.isBanned : user.isBanned;
      
    const matchesRole = userRoleFilter === 'All'
      ? true
      : userRoleFilter === 'Admin' ? user.isAdmin : !user.isAdmin;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleUpdateUser = async () => {
    if (!editUserData) return;
    setIsProcessing(true);
    try {
      const updateData: any = {
        username: editUserData.username,
        email: editUserData.email,
        phoneNumber: editUserData.phoneNumber,
        walletBalance: Number(editUserData.walletBalance),
        bonusBalance: Number(editUserData.bonusBalance),
        totalEarnings: Number(editUserData.totalEarnings || 0),
        isAdmin: editUserData.isAdmin,
        isBanned: editUserData.isBanned
      };
      
      if (!editUserData.isAdmin && selectedUser?.isAdmin) {
        updateData.permissions = {};
      }
      
      await updateDoc(doc(db, 'users', editUserData.id), updateData);
      showToast('User updated successfully');
      setIsEditingUser(false);
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Failed to update user', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWalletAction = async () => {
    if (!selectedUser || !actionAmount) return;
    setIsProcessing(true);
    try {
      const amount = Number(actionAmount);
      const newBalance = actionType === 'add' 
        ? (selectedUser.walletBalance || 0) + amount
        : (selectedUser.walletBalance || 0) - amount;

      await updateDoc(doc(db, 'users', selectedUser.id), {
        walletBalance: newBalance
      });

      // Log transaction
      await addDoc(collection(db, 'transactions'), {
        userId: selectedUser.id,
        amount: amount,
        type: actionType === 'add' ? 'Admin Deposit' : 'Admin Deduction',
        description: actionReason || `Admin ${actionType} action`,
        status: 'completed',
        createdAt: serverTimestamp(),
        date: new Date().toLocaleString()
      });

      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUser.id,
        message: `Admin ${actionType === 'add' ? 'added' : 'deducted'} ${amount} coins. ${actionReason ? `Reason: ${actionReason}` : ''}`,
        read: false,
        createdAt: serverTimestamp(),
        type: 'system'
      });

      showToast(`Successfully ${actionType === 'add' ? 'added' : 'deducted'} ${amount} coins`);
      setActionAmount('');
      setActionReason('');
    } catch (error) {
      console.error('Error processing wallet action:', error);
      showToast('Failed to process action', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <div className="flex gap-2">
          <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg text-sm font-bold border border-blue-500/20">
            Total: {users.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <select 
          value={userStatusFilter}
          onChange={(e) => setUserStatusFilter(e.target.value)}
          className="bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">Status: All</option>
          <option value="Active">Active</option>
          <option value="Banned">Banned</option>
        </select>
        <select 
          value={userRoleFilter}
          onChange={(e) => setUserRoleFilter(e.target.value)}
          className="bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">Role: All</option>
          <option value="Admin">Admin</option>
          <option value="Player">Player</option>
        </select>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredUsers.map(user => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#131B2F] border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 hover:border-gray-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
              ) : (
                <User size={24} className="text-gray-500" />
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h3 className="font-bold text-white">{user.username || 'Anonymous'}</h3>
                {user.isAdmin && <Shield size={14} className="text-blue-500" />}
                {user.isBanned && <Ban size={14} className="text-red-500" />}
              </div>
              <p className="text-xs text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-600">{user.id}</p>
            </div>

              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Wallet</p>
                  <p className="text-green-400 font-bold">{user.walletBalance || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Earnings</p>
                  <p className="text-yellow-400 font-bold">{user.totalEarnings || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Wins</p>
                  <p className="text-blue-400 font-bold">{user.totalWins || 0}</p>
                </div>
              </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedUser(user)}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                title="View Details"
              >
                <Eye size={16} />
              </button>
              <button 
                onClick={() => {
                  setEditUserData({ ...user });
                  setIsEditingUser(true);
                }}
                className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg border border-blue-600/30 transition-colors"
                title="Edit User"
              >
                <Pencil size={16} />
              </button>
            </div>
          </motion.div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="text-center py-10 text-gray-500">No users found.</div>
        )}
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditingUser && editUserData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131B2F] border border-gray-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Edit User</h3>
                <button onClick={() => setIsEditingUser(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                    <input 
                      type="text" 
                      value={editUserData.username || ''}
                      onChange={(e) => setEditUserData({...editUserData, username: e.target.value})}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                    <input 
                      type="text" 
                      value={editUserData.phoneNumber || ''}
                      onChange={(e) => setEditUserData({...editUserData, phoneNumber: e.target.value})}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Wallet Balance</label>
                    <input 
                      type="number" 
                      value={editUserData.walletBalance || 0}
                      onChange={(e) => setEditUserData({...editUserData, walletBalance: e.target.value})}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bonus Balance</label>
                    <input 
                      type="number" 
                      value={editUserData.bonusBalance || 0}
                      onChange={(e) => setEditUserData({...editUserData, bonusBalance: e.target.value})}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Earnings</label>
                    <input 
                      type="number" 
                      value={editUserData.totalEarnings || 0}
                      onChange={(e) => setEditUserData({...editUserData, totalEarnings: e.target.value})}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#0B1121] p-3 rounded-lg border border-gray-800">
                  <span className="text-sm font-bold text-gray-300">Is Admin?</span>
                  <button 
                    onClick={() => setEditUserData({...editUserData, isAdmin: !editUserData.isAdmin})}
                    className={`w-12 h-6 rounded-full relative transition-colors ${editUserData.isAdmin ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editUserData.isAdmin ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-[#0B1121] p-3 rounded-lg border border-gray-800">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-300">Account Status</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">{editUserData.isBanned ? 'Banned' : 'Active'}</span>
                  </div>
                  <button 
                    onClick={() => setEditUserData({...editUserData, isBanned: !editUserData.isBanned})}
                    className={`w-12 h-6 rounded-full relative transition-colors ${!editUserData.isBanned ? 'bg-green-600' : 'bg-red-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${!editUserData.isBanned ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
                <button onClick={() => setIsEditingUser(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white font-bold text-sm">Cancel</button>
                <button 
                  onClick={handleUpdateUser}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm flex items-center gap-2"
                >
                  {isProcessing && <Loader2 size={16} className="animate-spin" />} Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Details / Quick Actions Modal */}
      <AnimatePresence>
        {selectedUser && !isEditingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131B2F] border border-gray-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt={selectedUser.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                    ) : (
                      <User size={20} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedUser.username}</h3>
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance Stats */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Performance Stats</h4>
                  <div className="bg-[#0B1121] p-4 rounded-xl space-y-3 border border-gray-800">
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-xs">User ID</span>
                      <span className="text-gray-300 text-xs font-mono">{selectedUser.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-xs">Phone</span>
                      <span className="text-gray-300 text-xs">{selectedUser.phoneNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-xs">Joined</span>
                      <span className="text-gray-300 text-xs">{selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">Total Earnings</span>
                      <span className="text-yellow-400 text-xs font-bold">{selectedUser.totalEarnings || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">Account Status</span>
                      <button 
                        onClick={async () => {
                          try {
                            const newStatus = !selectedUser.isBanned;
                            await updateDoc(doc(db, 'users', selectedUser.id), { isBanned: newStatus });
                            setSelectedUser({ ...selectedUser, isBanned: newStatus });
                            showToast(`User ${newStatus ? 'banned' : 'activated'} successfully`);
                          } catch (error) {
                            showToast('Failed to update status', 'error');
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${!selectedUser.isBanned ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}
                      >
                        {selectedUser.isBanned ? 'Banned' : 'Active'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Wallet Actions */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider">Wallet Management</h4>
                  <div className="bg-[#0B1121] p-4 rounded-xl space-y-4 border border-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Current Balance</span>
                      <span className="text-xl font-bold text-white">{selectedUser.walletBalance || 0}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setActionType('add')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${actionType === 'add' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                        >
                          Add Coins
                        </button>
                        <button 
                          onClick={() => setActionType('remove')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${actionType === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                        >
                          Deduct Coins
                        </button>
                      </div>
                      <input 
                        type="number" 
                        placeholder="Amount" 
                        value={actionAmount}
                        onChange={(e) => setActionAmount(e.target.value)}
                        className="w-full bg-[#131B2F] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <input 
                        type="text" 
                        placeholder="Reason (optional)" 
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="w-full bg-[#131B2F] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <button 
                        onClick={handleWalletAction}
                        disabled={isProcessing || !actionAmount}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                      >
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Process Transaction'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3 z-[60] ${
              toast.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
            <span className="font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
