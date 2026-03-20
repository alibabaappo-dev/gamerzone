import { useState, useEffect } from 'react';
import { Plus, MessageSquare, X, ChevronDown, AlertCircle, CheckCircle, ArrowLeft, User, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, updateDoc, doc } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: string;
}

interface Ticket {
  id: string;
  userId: string;
  subject: string;
  lastMessage: string;
  category: string;
  status: 'Open' | 'Closed' | 'Pending' | 'Solved';
  messageCount: number;
  date: string;
  createdAt: any;
  priority: 'Low' | 'Medium' | 'High';
  messages: Message[];
  userUnreadCount?: number;
}

interface SupportProps {
  user: {
    uid: string;
    username: string;
    email: string;
  };
}

export default function Support({ user }: SupportProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    priority: 'Medium',
    message: ''
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      
      // Sort client-side to avoid index requirement
      ticketsData.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setTickets(ticketsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Reset unread count when ticket is selected
  useEffect(() => {
    if (selectedTicketId) {
      const ticket = tickets.find(t => t.id === selectedTicketId);
      if (ticket && ticket.userUnreadCount && ticket.userUnreadCount > 0) {
        updateDoc(doc(db, 'support_tickets', selectedTicketId), {
          userUnreadCount: 0
        });
      }
    }
  }, [selectedTicketId, tickets]);

  const categories = [
    'Payment Issues',
    'Tournament Issues',
    'Technical Support',
    'Account Issues',
    'Other'
  ];

  const handleCreateRequest = async () => {
    if (!formData.subject || !formData.category || !formData.message) {
      setToastMessage('Please fill in all required fields');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const ticketData = {
        userId: user.uid,
        subject: formData.subject,
        lastMessage: formData.message,
        category: formData.category,
        status: 'Pending', // Default to Pending
        messageCount: 1,
        date: now.toLocaleString(),
        createdAt: serverTimestamp(),
        priority: formData.priority,
        userUnreadCount: 0,
        messages: [
          { 
            id: Date.now().toString(), 
            text: formData.message, 
            sender: 'user', 
            timestamp: now.toLocaleTimeString() 
          }
        ]
      };

      await addDoc(collection(db, 'support_tickets'), ticketData);

      setIsModalOpen(false);
      setFormData({ subject: '', category: '', priority: 'Medium', message: '' });
      
      setToastMessage('Support request created successfully');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error creating ticket:", error);
      setToastMessage('Failed to create support request');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="min-h-screen bg-[#050B14] text-white p-4 font-sans relative">
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-4 right-4 z-50 bg-green-900/90 border border-green-500 text-white p-4 rounded-xl shadow-lg flex items-start"
          >
            <CheckCircle className="text-green-400 mr-3 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="font-medium text-sm">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <MessageSquare className="text-yellow-400 mr-2" size={24} />
            <h1 className="text-2xl font-bold text-yellow-400">Support</h1>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg flex items-center text-sm transition-colors"
          >
            <Plus size={16} className="mr-1" /> New
          </button>
        </div>

        {/* Ticket List */}
        <div className="space-y-3 mb-8">
          {loading ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center mb-4 w-16 h-16">
                <div className="absolute inset-0 border-[2px] border-yellow-500/10 rounded-full"></div>
                <div className="absolute inset-0 border-[4px] border-transparent border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
                <div className="absolute inset-3 border-[2px] border-transparent border-b-yellow-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
              </div>
              <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-widest text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">Loading tickets...</p>
            </div>
          ) : tickets.length > 0 ? (
            tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`bg-[#131B2F] rounded-2xl p-4 border cursor-pointer transition-all group ${
                  selectedTicketId === ticket.id 
                    ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)] bg-[#1E293B]' 
                    : 'border-gray-800 hover:border-gray-700 hover:bg-[#1E293B]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {ticket.status === 'Open' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                    <h3 className="font-bold text-white text-base">{ticket.subject}</h3>
                    {ticket.userUnreadCount && ticket.userUnreadCount > 0 ? (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {ticket.userUnreadCount}
                      </span>
                    ) : null}
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                    ticket.status === 'Open' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                    ticket.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
                    'bg-gray-700 text-gray-400 border border-gray-600'
                  }`}>
                    {ticket.status}
                  </span>
                </div>

                <p className={`text-sm mb-3 line-clamp-1 ${ticket.userUnreadCount && ticket.userUnreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'}`}>
                  {ticket.lastMessage}
                </p>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      ticket.priority === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                      ticket.priority === 'Medium' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                      'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className="text-[10px] text-gray-500">{ticket.category}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">{ticket.date}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-[30vh] text-center bg-[#131B2F] rounded-2xl border border-gray-800 p-8">
              <div className="w-16 h-16 bg-[#0B1121] rounded-full flex items-center justify-center mb-4 border border-gray-700">
                <MessageSquare size={32} className="text-gray-600" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">No Support Tickets</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs">Need help? Create a new support request and we'll get back to you shortly.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 px-6 rounded-xl text-sm transition-colors shadow-lg shadow-yellow-900/20"
              >
                Create Request
              </button>
            </div>
          )}
        </div>

        {/* Chat View */}
        <AnimatePresence>
          {selectedTicket && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 z-40 bg-[#050B14] md:static md:bg-transparent md:h-[600px] flex flex-col"
            >
              <div className="bg-[#0B1120] md:rounded-2xl md:border border-gray-800 overflow-hidden flex flex-col h-full shadow-2xl">
                {/* Chat Header */}
                <div className="bg-[#131B2F] p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedTicketId(null)} 
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0B1121] border border-gray-700 text-gray-400 hover:text-white md:hidden"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <h2 className="font-bold text-white text-lg leading-tight line-clamp-1">{selectedTicket.subject}</h2>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span className="text-blue-400">{selectedTicket.category}</span>
                        <span>•</span>
                        <span>ID: {selectedTicket.id.slice(-6)}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    selectedTicket.status === 'Open' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                    selectedTicket.status === 'Solved' ? 'bg-gray-700 text-gray-400 border border-gray-600' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0B1121] custom-scrollbar">
                  {selectedTicket.messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-sm ${
                        msg.sender === 'user' 
                          ? 'bg-yellow-500 text-black rounded-tr-none' 
                          : 'bg-[#1E293B] border border-gray-700 text-gray-200 rounded-tl-none'
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            msg.sender === 'user' ? 'text-black/60' : 'text-blue-400'
                          }`}>
                            {msg.sender === 'user' ? 'You' : 'Support Team'}
                          </span>
                          <span className={`text-[10px] ${
                            msg.sender === 'user' ? 'text-black/50' : 'text-gray-500'
                          }`}>
                            {msg.timestamp}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {selectedTicket.status === 'Solved' && (
                    <div className="flex justify-center my-4">
                      <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full border border-gray-700">
                        This ticket has been marked as solved
                      </span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-3 bg-[#131B2F] border-t border-gray-800 shrink-0">
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const inputEl = e.currentTarget.elements.namedItem('reply') as HTMLInputElement;
                      const replyText = inputEl.value;
                      if (!replyText.trim()) return;
                      
                      try {
                        const newMessage = {
                          id: Date.now().toString(),
                          text: replyText,
                          sender: 'user',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                        const updatedMessages = [...(selectedTicket.messages || []), newMessage];
                        await updateDoc(doc(db, 'support_tickets', selectedTicket.id), {
                          messages: updatedMessages,
                          lastMessage: replyText,
                          status: 'Open'
                        });
                        inputEl.value = '';
                      } catch (err) {
                        console.error("Error sending reply:", err);
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      name="reply"
                      type="text" 
                      placeholder={selectedTicket.status === 'Solved' ? "Ticket is closed" : "Type your message..."}
                      disabled={selectedTicket.status === 'Solved'}
                      className="flex-1 bg-[#050B14] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button 
                      type="submit"
                      disabled={selectedTicket.status === 'Solved'}
                      className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black p-3 rounded-xl transition-colors shadow-lg shadow-yellow-900/20"
                    >
                      <ArrowUpRight size={20} />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Request Modal - Compact Version */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B1120] w-full max-w-sm rounded-2xl border border-gray-800 shadow-2xl overflow-hidden"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-yellow-400 leading-tight">Create New Support<br />Request</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-white text-xs font-medium mb-1">Subject <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="Brief description of your issue"
                      className="w-full bg-[#131B2F] border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-white text-xs font-medium mb-1">Category <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-[#131B2F] border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-yellow-500 appearance-none"
                      >
                        <option value="" disabled>Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white text-xs font-medium mb-1">Priority</label>
                    <div className="relative">
                      <select 
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                        className="w-full bg-[#131B2F] border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-yellow-500 appearance-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white text-xs font-medium mb-1">Message <span className="text-red-500">*</span></label>
                    <textarea 
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Describe your issue in detail..."
                      rows={3}
                      className="w-full bg-[#131B2F] border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder-gray-600 resize-none"
                    />
                  </div>

                  <div className="pt-1 space-y-2">
                    <button 
                      onClick={handleCreateRequest}
                      disabled={isSubmitting}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        'Create Request'
                      )}
                    </button>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                      className="w-full bg-[#1C2536] hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors border border-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
