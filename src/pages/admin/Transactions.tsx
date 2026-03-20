import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { 
  DollarSign, ArrowDownUp, CheckCircle2, XCircle, Clock, Search, Filter,
  ArrowUpRight, ArrowDownLeft, Loader2, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void} | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTransactionAction = async (tx: any, action: 'approve' | 'reject') => {
    setConfirmModal({
      isOpen: true,
      title: `${action === 'approve' ? 'Approve' : 'Reject'} Transaction`,
      message: `Are you sure you want to ${action} this ${tx.type} of ${tx.amount} coins for ${tx.userEmail}?`,
      action: async () => {
        setIsProcessing(true);
        try {
          const status = action === 'approve' ? 'completed' : 'rejected';
          
          // Update transaction status
          await updateDoc(doc(db, 'transactions', tx.id), { status });

          // If approving a deposit, add coins to user
          if (action === 'approve' && tx.type === 'Deposit') {
            await updateDoc(doc(db, 'users', tx.userId), {
              walletBalance: increment(tx.amount)
            });
          }

          // If rejecting a withdrawal, refund coins to user
          if (action === 'reject' && tx.type === 'Withdrawal') {
            await updateDoc(doc(db, 'users', tx.userId), {
              walletBalance: increment(tx.amount)
            });
          }

          // Notify user
          await addDoc(collection(db, 'notifications'), {
            userId: tx.userId,
            message: `Your ${tx.type} of ${tx.amount} coins has been ${status}.`,
            read: false,
            createdAt: serverTimestamp(),
            type: status === 'completed' ? 'success' : 'error'
          });

          showToast(`Transaction ${status} successfully`);
        } catch (error) {
          console.error('Error processing transaction:', error);
          showToast('Failed to process transaction', 'error');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      (tx.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (tx.userId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (tx.utrNumber?.includes(searchTerm));
    
    const matchesType = filterType === 'All' ? true : tx.type === filterType;
    const matchesStatus = filterStatus === 'All' ? true : tx.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Transactions</h1>
        <div className="flex gap-2">
          <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-lg text-sm font-bold border border-yellow-500/20">
            Pending: {transactions.filter(t => t.status === 'pending').length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by email, ID, or UTR..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">Type: All</option>
          <option value="Deposit">Deposit</option>
          <option value="Withdrawal">Withdrawal</option>
          <option value="Winning">Winning</option>
        </select>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">Status: All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.map(tx => (
          <motion.div 
            key={tx.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`bg-[#131B2F] border rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 transition-colors ${
              tx.status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-gray-800'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
              tx.type === 'Deposit' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
              tx.type === 'Withdrawal' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
              'bg-blue-500/10 border-blue-500/20 text-blue-500'
            }`}>
              {tx.type === 'Deposit' ? <ArrowDownLeft size={24} /> : 
               tx.type === 'Withdrawal' ? <ArrowUpRight size={24} /> : 
               <DollarSign size={24} />}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h3 className="font-bold text-white text-lg">{tx.amount} Coins</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  tx.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                  tx.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {tx.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">{tx.type} • {tx.date}</p>
              <p className="text-xs text-gray-500">{tx.userEmail}</p>
              {tx.utrNumber && (
                <p className="text-xs text-blue-400 font-mono mt-1">UTR: {tx.utrNumber}</p>
              )}
              {tx.upiId && (
                <p className="text-xs text-purple-400 font-mono">UPI: {tx.upiId}</p>
              )}
            </div>

            {tx.status === 'pending' && (
              <div className="flex gap-2">
                <button 
                  onClick={() => handleTransactionAction(tx, 'approve')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Approve
                </button>
                <button 
                  onClick={() => handleTransactionAction(tx, 'reject')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}
          </motion.div>
        ))}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-10 text-gray-500">No transactions found.</div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131B2F] border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-yellow-500" size={24} />
                <h3 className="text-xl font-bold text-white">{confirmModal.title}</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">{confirmModal.message}</p>
              <div className="flex justify-between gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmModal.action}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm flex items-center gap-2"
                >
                  {isProcessing && <Loader2 size={16} className="animate-spin" />} Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
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
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span className="font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
