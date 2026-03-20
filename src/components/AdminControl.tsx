import { useState, useEffect } from 'react';
import { Search, Shield, User, CheckCircle2, XCircle, X, Crown, Settings, Lock, Unlock, Filter, Plus, Mail, Trash2 } from 'lucide-react';
import { doc, updateDoc, setDoc, deleteDoc, collection, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminControl({ users, currentUser }: { users: any[], currentUser: any }) {
  const isMasterOwner = currentUser?.isOwner || currentUser?.email === 'alibabaappo@gmail.com' || auth.currentUser?.email === 'alibabaappo@gmail.com';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'owners' | 'admins'>('all');
  const [adminEmails, setAdminEmails] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'owner'>('admin');
  const [isAddingEmail, setIsAddingEmail] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'admin_emails'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAdminEmails(snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddAdminEmail = async () => {
    if (!newAdminEmail || !newAdminEmail.includes('@')) return;
    try {
      setIsAddingEmail(true);
      await setDoc(doc(db, 'admin_emails', newAdminEmail.toLowerCase().trim()), {
        role: newAdminRole,
        addedBy: currentUser.email,
        createdAt: serverTimestamp()
      });
      setNewAdminEmail('');
    } catch (error) {
      console.error('Error adding admin email:', error);
    } finally {
      setIsAddingEmail(false);
    }
  };

  const handleRemoveAdminEmail = async (email: string) => {
    if (window.confirm(`Are you sure you want to remove ${email} from admin list?`)) {
      try {
        await deleteDoc(doc(db, 'admin_emails', email));
      } catch (error) {
        console.error('Error removing admin email:', error);
      }
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'admin' | 'owner' | 'revoke_owner';
    userId: string;
    currentStatus: boolean;
    username: string;
  }>({
    isOpen: false,
    type: 'admin',
    userId: '',
    currentStatus: false,
    username: ''
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' ? true : 
                         filterType === 'owners' ? u.isOwner : 
                         u.isAdmin && !u.isOwner;
    return matchesSearch && matchesFilter;
  });

  const togglePermission = async (userId: string, permission: string) => {
    const user = users.find(u => u.id === userId);
    if (user.isOwner && !currentUser.isOwner) return;
    const currentPermissions = user.permissions || {};
    const newPermissions = {
      ...currentPermissions,
      [permission]: !currentPermissions[permission]
    };
    await updateDoc(doc(db, 'users', userId), { permissions: newPermissions });
    setSelectedUser({ ...user, permissions: newPermissions });
  };

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    const user = users.find(u => u.id === userId);
    if (user.isOwner && !currentUser.isOwner) return;
    
    setConfirmModal({
      isOpen: true,
      type: 'admin',
      userId,
      currentStatus,
      username: user.username || 'User'
    });
  };

  const toggleOwner = async (userId: string, currentStatus: boolean) => {
    if (!isMasterOwner && !currentUser?.isAdmin) return;
    const user = users.find(u => u.id === userId);
    
    setConfirmModal({
      isOpen: true,
      type: currentStatus ? 'revoke_owner' : 'owner',
      userId,
      currentStatus,
      username: user.username || 'User'
    });
  };

  const executeToggleAdmin = async () => {
    const { userId, currentStatus } = confirmModal;
    const updateData: any = { isAdmin: !currentStatus };
    if (currentStatus) {
      updateData.permissions = {};
    }
    await updateDoc(doc(db, 'users', userId), updateData);
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, ...updateData });
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const executeToggleOwner = async () => {
    const { userId, currentStatus } = confirmModal;
    await updateDoc(doc(db, 'users', userId), { 
      isOwner: !currentStatus,
      isAdmin: true // Owners are always admins
    });
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, isOwner: !currentStatus, isAdmin: true });
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const allPermissions = [
    'dashboard', 'users', 'deposits', 'withdrawals', 'tournaments', 'results', 
    'notifications', 'leaderboard', 'tasks', 'referral', 'viewTransactions', 
    'push', 'support', 'settings', 'admin-control'
  ];

  const handleUserSelect = (u: any) => {
    setSelectedUser(u);
    setIsModalOpen(true);
  };

  const PermissionsUI = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`${isMobile ? 'p-4' : 'bg-[#131B2F] border border-gray-800 rounded-3xl p-5 shadow-2xl'} h-full flex flex-col`}>
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-800/50">
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="relative shrink-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${selectedUser.isOwner ? 'bg-yellow-500/10 border-yellow-500/30' : selectedUser.isAdmin ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-800/50 border-gray-700/50'}`}>
              {selectedUser.isOwner ? (
                <Crown className="text-yellow-500" size={20} />
              ) : (
                <User className={selectedUser.isAdmin ? "text-blue-500" : "text-gray-500"} size={20} />
              )}
            </div>
            {selectedUser.isAdmin && !selectedUser.isOwner && (
              <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white p-1 rounded-lg shadow-lg border-2 border-[#131B2F]">
                <Shield size={10} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight truncate uppercase">
                {selectedUser.username || 'User'}
              </h3>
              {selectedUser.isOwner && (
                <span className="bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shrink-0">Owner</span>
              )}
              {selectedUser.isAdmin && !selectedUser.isOwner && (
                <span className="bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shrink-0">Admin</span>
              )}
            </div>
            <p className="text-[10px] font-bold text-gray-500 truncate">{selectedUser.email}</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row xl:flex-col gap-2 w-full xl:w-auto shrink-0">
          {(isMasterOwner || currentUser?.isAdmin) && !selectedUser.isOwner && (
            <button 
              onClick={() => toggleAdmin(selectedUser.id, !!selectedUser.isAdmin)}
              className={`flex-1 xl:w-full px-3 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-lg ${selectedUser.isAdmin ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white'}`}
            >
              {selectedUser.isAdmin ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
              {selectedUser.isAdmin ? 'Revoke Admin' : 'Make Admin'}
            </button>
          )}

          {(isMasterOwner || currentUser?.isAdmin) && (
            <button 
              onClick={() => toggleOwner(selectedUser.id, !!selectedUser.isOwner)}
              className={`flex-1 xl:w-full px-3 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-lg ${selectedUser.isOwner ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500 hover:text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-yellow-500 hover:text-white hover:border-yellow-500'}`}
            >
              <Crown size={14} />
              {selectedUser.isOwner ? 'Revoke Owner' : 'Promote to Owner'}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex items-center gap-1.5 mb-3 sm:mb-4">
          <Settings size={14} className="text-gray-500" />
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Permission Matrix</h4>
        </div>
        
        {selectedUser.isOwner ? (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-yellow-500/20">
              <Lock size={24} className="text-yellow-500 sm:w-8 sm:h-8" />
            </div>
            <h5 className="text-base sm:text-lg font-black text-white uppercase tracking-tight mb-1.5">Full Access Granted</h5>
            <p className="text-gray-400 text-[10px] sm:text-xs max-w-xs mx-auto leading-relaxed">Owners have unrestricted access to all administrative features. Permissions cannot be individually modified for the Owner role.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {allPermissions.map(perm => (
              <div key={perm} className="flex items-center justify-between p-3 bg-[#0B1121]/50 rounded-xl border border-gray-800/50 hover:border-yellow-500/30 transition-all group">
                <div className="flex flex-col">
                  <span className="capitalize text-gray-200 text-[10px] sm:text-xs font-black tracking-tight group-hover:text-yellow-500 transition-colors uppercase">{perm.replace(/([A-Z])/g, ' $1')}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {selectedUser.permissions?.[perm] ? <Unlock size={8} className="text-yellow-500" /> : <Lock size={8} className="text-gray-600" />}
                    <span className={`text-[7px] sm:text-[8px] uppercase font-black tracking-widest ${selectedUser.permissions?.[perm] ? 'text-yellow-500/70' : 'text-gray-600'}`}>
                      {selectedUser.permissions?.[perm] ? 'Access Enabled' : 'Access Restricted'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => togglePermission(selectedUser.id, perm)}
                  className={`w-9 h-5 rounded-full transition-all relative p-1 ${selectedUser.permissions?.[perm] ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-gray-800'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-all shadow-md ${selectedUser.permissions?.[perm] ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 flex flex-col h-[70vh] min-h-[500px] lg:h-[75vh]">
        <div className="bg-[#131B2F] border border-gray-800 rounded-3xl p-4 flex flex-col h-full shadow-xl">
          <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4">
            {/* Add Admin by Email Section */}
            {(isMasterOwner || currentUser?.isAdmin) && (
              <div className="bg-[#0B1121] border border-gray-800 rounded-2xl p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 px-1">
                  <Mail size={12} className="text-yellow-500" />
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Authorize Admin by Email</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="email"
                    placeholder="Enter email address..."
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="flex-1 bg-[#131B2F] border border-gray-800 rounded-xl px-3 py-2 text-[11px] text-white focus:border-yellow-500 outline-none transition-all font-bold"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value as 'admin' | 'owner')}
                      className="flex-1 sm:flex-none bg-[#131B2F] border border-gray-800 rounded-xl px-2 py-2 text-[11px] text-white focus:border-yellow-500 outline-none transition-all font-bold"
                    >
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button 
                      onClick={handleAddAdminEmail}
                      disabled={isAddingEmail || !newAdminEmail}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Authorized Emails List */}
                <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1.5 mt-1.5">
                  {adminEmails.map(admin => (
                    <div key={admin.email} className="flex items-center justify-between bg-[#131B2F] px-2.5 py-1.5 rounded-lg border border-gray-800/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-bold text-gray-400 truncate max-w-[120px]">{admin.email}</span>
                        <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          admin.role === 'owner' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {admin.role}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleRemoveAdminEmail(admin.email)}
                        className="text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative group">
              <Search className="absolute left-3.5 top-3 text-gray-500 group-focus-within:text-yellow-500 transition-colors" size={16} />
              <input 
                type="text"
                placeholder="Search staff members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-10 pr-3 py-3 text-white focus:border-yellow-500 outline-none text-xs transition-all font-bold placeholder:text-gray-600"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 px-2">
                <Filter size={12} className="text-gray-500" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Role Filters</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'owners', 'admins'] as const).map((type) => (
                  <button 
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${filterType === type ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20' : 'bg-gray-800/50 text-gray-500 border-gray-800 hover:border-gray-700'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {filteredUsers.map(u => (
              <button 
                key={u.id}
                onClick={() => handleUserSelect(u)}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all border group relative overflow-hidden ${selectedUser?.id === u.id ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-[#0B1121]/50 hover:bg-gray-800/50 text-gray-400 border-gray-800/50'}`}
              >
                {selectedUser?.id === u.id && (
                  <motion.div layoutId="active-bg" className="absolute inset-0 bg-yellow-500/5 pointer-events-none" />
                )}
                <div className="relative">
                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm shadow-lg transition-all duration-300 overflow-hidden ${selectedUser?.id === u.id ? 'bg-yellow-500 text-black scale-110' : 'bg-gray-700 text-white group-hover:bg-gray-600'}`}>
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      u.isOwner ? <Crown size={16} /> : u.username?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  {u.isAdmin && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-black p-0.5 rounded-md border border-[#0B1121]">
                      <Shield size={10} />
                    </div>
                  )}
                </div>
                <div className="text-left truncate flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black truncate tracking-tight uppercase">{u.username || 'User'}</p>
                    {u.isOwner && <div className="w-1 h-1 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />}
                  </div>
                  <p className="text-[9px] truncate opacity-50 font-bold tracking-tight">{u.email}</p>
                </div>
                {(u.isOwner || u.isAdmin) && (
                  <div className={`p-1.5 rounded-lg border transition-colors ${u.isOwner ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                    {u.isOwner ? <Crown size={12} className="text-yellow-500" /> : <Shield size={12} className="text-blue-500" />}
                  </div>
                )}
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-10 bg-[#0B1121]/30 rounded-3xl border border-dashed border-gray-800">
                <User className="mx-auto text-gray-800 mb-3" size={32} />
                <p className="text-gray-600 text-[9px] font-black uppercase tracking-[0.2em]">No staff members found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block lg:col-span-8">
        {selectedUser ? (
          <PermissionsUI />
        ) : (
          <div className="bg-[#131B2F] border border-gray-800 rounded-3xl p-8 h-full flex flex-col items-center justify-center text-center shadow-xl">
            <div className="w-20 h-20 rounded-3xl bg-gray-800/30 flex items-center justify-center mb-5 border border-gray-800/50 shadow-inner">
              <Shield className="text-gray-700" size={36} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Staff Management</h3>
            <p className="text-gray-500 text-xs max-w-xs mx-auto leading-relaxed">Select a staff member from the directory to configure their administrative roles and granular access permissions.</p>
          </div>
        )}
      </div>

      {/* Mobile Modal */}
      <AnimatePresence>
        {isModalOpen && selectedUser && (
          <div className="lg:hidden fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl" 
              onClick={() => setIsModalOpen(false)} 
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg max-h-[92vh] bg-[#131B2F] border border-gray-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="w-10 h-1 bg-gray-800/50 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800/50">
                <div className="flex items-center gap-2">
                  <Shield className="text-yellow-500" size={20} />
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Staff Access</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <PermissionsUI isMobile={true} />
              </div>
              <div className="p-5 bg-[#0B1121] border-t border-gray-800/50">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-yellow-500/20"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#131B2F] border border-gray-800 rounded-3xl p-6 shadow-2xl text-center"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border-2 ${
                confirmModal.type === 'admin' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
              }`}>
                {confirmModal.type === 'admin' ? <Shield size={32} /> : <Crown size={32} />}
              </div>
              
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                {confirmModal.type === 'admin' 
                  ? (confirmModal.currentStatus ? 'Revoke Admin Access?' : 'Grant Admin Access?')
                  : (confirmModal.type === 'owner' ? 'Promote to Owner?' : 'Revoke Owner Status?')}
              </h3>
              
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Are you sure you want to {confirmModal.currentStatus ? 'revoke' : 'grant'} {confirmModal.type === 'admin' ? 'administrative' : 'owner'} privileges {confirmModal.currentStatus ? 'from' : 'to'} <span className="text-white font-bold">@{confirmModal.username}</span>? This action will change their access level immediately.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="py-3 rounded-xl bg-gray-800 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmModal.type === 'admin' ? executeToggleAdmin : executeToggleOwner}
                  className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                    confirmModal.type === 'admin' 
                      ? (confirmModal.currentStatus ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-blue-500 text-white shadow-blue-500/20')
                      : 'bg-yellow-500 text-black shadow-yellow-500/20'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

