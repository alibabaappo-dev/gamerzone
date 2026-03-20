import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  MessageSquare, CheckCircle2, XCircle, Clock, Search, Filter,
  Send, User, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setIsProcessing(true);
    try {
      // Update ticket with reply
      await updateDoc(doc(db, 'support_tickets', selectedTicket.id), {
        adminReply: replyMessage,
        status: 'Resolved',
        resolvedAt: serverTimestamp()
      });

      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: selectedTicket.userId,
        message: `Admin replied to your support ticket: "${replyMessage.substring(0, 50)}..."`,
        read: false,
        createdAt: serverTimestamp(),
        type: 'info'
      });

      showToast('Reply sent and ticket resolved');
      setSelectedTicket(null);
      setReplyMessage('');
    } catch (error) {
      console.error('Error replying to ticket:', error);
      showToast('Failed to send reply', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      (ticket.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ticket.message?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ticket.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' ? true : ticket.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Support Tickets</h1>
        <div className="flex gap-2">
          <span className="bg-purple-500/10 text-purple-500 px-3 py-1 rounded-lg text-sm font-bold border border-purple-500/20">
            Pending: {tickets.filter(t => t.status === 'Pending').length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search tickets..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">Status: All</option>
          <option value="Pending">Pending</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.map(ticket => (
          <motion.div 
            key={ticket.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`bg-[#131B2F] border rounded-xl p-4 transition-colors hover:border-gray-700 ${
              ticket.status === 'Pending' ? 'border-purple-500/30 bg-purple-500/5' : 'border-gray-800'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                  ticket.status === 'Pending' ? 'bg-purple-500/10 border-purple-500/20 text-purple-500' : 'bg-green-500/10 border-green-500/20 text-green-500'
                }`}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{ticket.subject}</h3>
                  <p className="text-xs text-gray-500">{ticket.userEmail} • {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                ticket.status === 'Resolved' ? 'bg-green-500/10 text-green-500' : 'bg-purple-500/10 text-purple-500'
              }`}>
                {ticket.status}
              </span>
            </div>

            <div className="bg-[#0B1121] p-3 rounded-lg border border-gray-800 text-sm text-gray-300 mb-3">
              {ticket.message}
            </div>

            {ticket.adminReply && (
              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 text-sm text-blue-300 mb-3 ml-4">
                <span className="font-bold text-xs uppercase block mb-1 text-blue-400">Admin Reply</span>
                {ticket.adminReply}
              </div>
            )}

            {ticket.status === 'Pending' && (
              <div className="flex justify-end">
                <button 
                  onClick={() => setSelectedTicket(ticket)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
                >
                  <Send size={14} /> Reply & Resolve
                </button>
              </div>
            )}
          </motion.div>
        ))}
        {filteredTickets.length === 0 && (
          <div className="text-center py-10 text-gray-500">No tickets found.</div>
        )}
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131B2F] border border-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Reply to Ticket</h3>
              
              <div className="bg-[#0B1121] p-4 rounded-xl border border-gray-800 mb-4">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">User Message</p>
                <p className="text-gray-300 text-sm">{selectedTicket.message}</p>
              </div>

              <textarea 
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full bg-[#0B1121] border border-gray-800 rounded-xl p-4 text-white text-sm min-h-[120px] focus:outline-none focus:border-purple-500 transition-colors mb-4"
              />

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setSelectedTicket(null);
                    setReplyMessage('');
                  }}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReply}
                  disabled={isProcessing || !replyMessage.trim()}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send Reply
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
