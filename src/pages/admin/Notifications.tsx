import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, addDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { 
  Bell, Send, Trash2, CheckCircle2, XCircle, Loader2, History, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Notifications() {
  const [pushHistory, setPushHistory] = useState<any[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<any[]>([]);
  
  // Form State
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushImage, setPushImage] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const qPush = query(collection(db, 'admin', 'history', 'push_notifications'), orderBy('sentAt', 'desc'));
    const unsubPush = onSnapshot(qPush, (snapshot) => {
      setPushHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qGlobal = query(collection(db, 'admin', 'global', 'notifications'), orderBy('createdAt', 'desc'));
    const unsubGlobal = onSnapshot(qGlobal, (snapshot) => {
      setGlobalNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPush();
      unsubGlobal();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSendPush = async () => {
    if (!pushTitle || !pushBody) {
      showToast('Title and Body are required', 'error');
      return;
    }

    setIsSending(true);
    try {
      // 1. Send via API (Mocked for now as per context, but structure ready)
      // In a real app, you'd call your backend API here
      // await fetch('/api/send-push', { ... });

      // 2. Log to History
      await addDoc(collection(db, 'admin', 'history', 'push_notifications'), {
        title: pushTitle,
        body: pushBody,
        image: pushImage,
        target: targetUserId || 'All Users',
        sentAt: serverTimestamp(),
        status: 'sent' // Assume success for now
      });

      // 3. Create Global In-App Notification if target is 'All Users'
      if (!targetUserId) {
        await addDoc(collection(db, 'admin', 'global', 'notifications'), {
          title: pushTitle,
          message: pushBody,
          type: 'announcement',
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
        });
      } else {
        // Send to specific user
        await addDoc(collection(db, 'notifications'), {
          userId: targetUserId,
          message: pushBody,
          title: pushTitle,
          read: false,
          createdAt: serverTimestamp(),
          type: 'info'
        });
      }

      showToast('Notification sent successfully');
      setPushTitle('');
      setPushBody('');
      setPushImage('');
      setTargetUserId('');
    } catch (error) {
      console.error('Error sending push:', error);
      showToast('Failed to send notification', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteGlobal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'admin', 'global', 'notifications', id));
      showToast('Global notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast('Failed to delete notification', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Notifications</h1>
        <p className="text-gray-400 text-sm">Manage push & in-app notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <div className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Send size={20} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Send Notification</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
              <input 
                type="text" 
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Notification Title"
                className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message Body</label>
              <textarea 
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="Notification Message..."
                className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white min-h-[100px] focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image URL (Optional)</label>
              <input 
                type="text" 
                value={pushImage}
                onChange={(e) => setPushImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target User ID (Optional)</label>
              <input 
                type="text" 
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Leave empty to send to ALL users"
                className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-[10px] text-gray-500 mt-1">If empty, this will be sent as a global announcement.</p>
            </div>

            <button 
              onClick={handleSendPush}
              disabled={isSending || !pushTitle || !pushBody}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send Notification
            </button>
          </div>
        </div>

        {/* Global Notifications List */}
        <div className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
              <Bell size={20} className="text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Active Global Alerts</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[500px]">
            {globalNotifications.map(notif => (
              <div key={notif.id} className="bg-[#0B1121] border border-gray-800 rounded-xl p-4 relative group hover:border-gray-700 transition-colors">
                <button 
                  onClick={() => handleDeleteGlobal(notif.id)}
                  className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
                <h4 className="font-bold text-white text-sm mb-1">{notif.title}</h4>
                <p className="text-xs text-gray-400">{notif.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded uppercase">
                    {notif.type || 'Announcement'}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString() : 'Just now'}
                  </span>
                </div>
              </div>
            ))}
            {globalNotifications.length === 0 && (
              <div className="text-center py-10 text-gray-500">No active global notifications.</div>
            )}
          </div>
        </div>
      </div>

      {/* Push History */}
      <div className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <History size={20} className="text-purple-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Push History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase font-bold">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Sent At</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-300">
              {pushHistory.map(push => (
                <tr key={push.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="py-3 px-4 font-medium">{push.title}</td>
                  <td className="py-3 px-4 font-mono text-xs text-blue-400">{push.target}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {push.sentAt?.toDate ? push.sentAt.toDate().toLocaleString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold uppercase">
                      {push.status}
                    </span>
                  </td>
                </tr>
              ))}
              {pushHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">No push history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
