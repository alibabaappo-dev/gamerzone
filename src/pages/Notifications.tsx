import { useState, useMemo, useEffect } from 'react';
import { Bell, Check, Trash2, Clock, ChevronRight, ArrowLeft, Star, Trophy, Wallet, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useGlobalLoader } from '../App';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'task' | 'tournament' | 'wallet' | 'system';
  isGlobal?: boolean;
  createdAt?: any;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userNotifications, setUserNotifications] = useState<Notification[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'task' | 'tournament' | 'wallet' | 'system'>('all');
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const navigate = useNavigate();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleFilterChange = (filter: 'all' | 'task' | 'tournament' | 'wallet' | 'system') => {
    setActiveFilter(filter);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch user data for global notification states
    const unsubscribeUserDoc = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });

    // Fetch user notifications
    const qUser = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    
    // Fetch global notifications
    const qGlobal = query(collection(db, 'global_notifications'), orderBy('createdAt', 'desc'));

    const unsubscribeUser = onSnapshot(qUser, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toLocaleString() : 'Just now',
        isGlobal: false
      })) as Notification[];
      setUserNotifications(notifs);
    });

    const unsubscribeGlobal = onSnapshot(qGlobal, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toLocaleString() : 'Just now',
        isGlobal: true
      })) as Notification[];
      setGlobalNotifications(notifs);
    });

    return () => {
      unsubscribeUserDoc();
      unsubscribeUser();
      unsubscribeGlobal();
    };
  }, [user]);

  useEffect(() => {
    // Combine and sort, applying user states to global notifications
    const readGlobalIds = userData?.readGlobalNotifs || [];
    const deletedGlobalIds = userData?.deletedGlobalNotifs || [];

    const processedGlobal = globalNotifications
      .filter(n => !deletedGlobalIds.includes(n.id))
      .map(n => ({
        ...n,
        isRead: readGlobalIds.includes(n.id)
      }));

    const combined = [...processedGlobal, ...userNotifications].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    setNotifications(combined);
  }, [userNotifications, globalNotifications, userData]);

  const markAsRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    if (!notif.isGlobal) {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } else {
      const readGlobalIds = userData?.readGlobalNotifs || [];
      if (!readGlobalIds.includes(id)) {
        await updateDoc(doc(db, 'users', user.uid), {
          readGlobalNotifs: [...readGlobalIds, id]
        });
      }
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      // Update user notifications in DB
      const unreadUserNotifs = userNotifications.filter(n => !n.isRead);
      await Promise.all(unreadUserNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true })));
      
      // Update global notifications state in user doc
      const unreadGlobalIds = globalNotifications
        .filter(n => !(userData?.readGlobalNotifs || []).includes(n.id))
        .map(n => n.id);
      
      if (unreadGlobalIds.length > 0) {
        await updateDoc(doc(db, 'users', user.uid), {
          readGlobalNotifs: [...(userData?.readGlobalNotifs || []), ...unreadGlobalIds]
        });
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    try {
      if (!notif.isGlobal) {
        await deleteDoc(doc(db, 'notifications', id));
      } else {
        const deletedGlobalIds = userData?.deletedGlobalNotifs || [];
        if (!deletedGlobalIds.includes(id)) {
          await updateDoc(doc(db, 'users', user.uid), {
            deletedGlobalNotifs: [...deletedGlobalIds, id]
          });
        }
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      // Delete all user notifications
      await Promise.all(userNotifications.map(n => deleteDoc(doc(db, 'notifications', n.id))));
      
      // Mark all global notifications as deleted in user doc
      const currentGlobalIds = globalNotifications.map(n => n.id);
      const existingDeleted = userData?.deletedGlobalNotifs || [];
      const newDeleted = [...new Set([...existingDeleted, ...currentGlobalIds])];
      
      await updateDoc(doc(db, 'users', user.uid), {
        deletedGlobalNotifs: newDeleted
      });
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(n => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Star className="text-orange-400" size={18} />;
      case 'tournament':
        return <Trophy className="text-yellow-400" size={18} />;
      case 'wallet':
        return <Wallet className="text-green-400" size={18} />;
      default:
        return <Info className="text-blue-400" size={18} />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'task':
        return 'bg-orange-400/10 border-orange-400/20';
      case 'tournament':
        return 'bg-yellow-400/10 border-yellow-400/20';
      case 'wallet':
        return 'bg-green-400/10 border-green-400/20';
      default:
        return 'bg-blue-400/10 border-blue-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-black pt-4 pb-20 lg:pb-10">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-800/50 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400/10 p-2 rounded-xl border border-yellow-500/20">
                <Bell size={24} className="text-yellow-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
                <p className="text-gray-500 text-xs font-medium">You have {unreadCount} unread messages</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col items-center gap-6 mb-10">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full sm:justify-center px-4">
            {(['all', 'task', 'tournament', 'wallet', 'system'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all duration-300 ${
                  activeFilter === filter 
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/20 scale-105' 
                    : 'bg-[#0F1521] text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all"
              >
                <Check size={14} />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                <Trash2 size={14} />
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative group bg-[#0F1521] border border-gray-800/50 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-[#161D2C] ${!notification.isRead ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${getIconBg(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                          <h3 className={`text-sm font-bold ${notification.isRead ? 'text-gray-400' : 'text-white'} transition-colors line-clamp-1`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium whitespace-nowrap">
                            <Clock size={10} />
                            <span>{notification.timestamp}</span>
                            <span className="mx-1 text-gray-700">•</span>
                            <span className={`font-bold ${notification.isRead ? 'text-gray-500' : 'text-blue-400'}`}>
                              {notification.isRead ? 'Claimed' : 'Inprogress'}
                            </span>
                            {notification.isGlobal && (
                              <span className="ml-2 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] rounded uppercase font-bold border border-purple-500/30">
                                Global
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-[13px] leading-relaxed mb-4 ${notification.isRead ? 'text-gray-500' : 'text-gray-400'}`}>
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-3">
                          {!notification.isRead && (
                            <button 
                              onClick={() => markAsRead(notification.id)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                            >
                              <Check size={12} />
                              Mark as read
                            </button>
                          )}
                          <button 
                            onClick={() => deleteNotification(notification.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#0F1521] border border-gray-800/50 rounded-3xl p-12 text-center"
              >
                <div className="bg-gray-800/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell size={32} className="text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No notifications</h3>
                <p className="text-gray-500 text-sm">We'll notify you when something important happens.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clear All Confirmation Modal */}
        <AnimatePresence>
          {showClearConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowClearConfirm(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-[#0F1521] border border-gray-800 rounded-3xl p-6 shadow-2xl"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <Trash2 className="text-red-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-2">Clear All Notifications?</h3>
                <p className="text-gray-400 text-center text-sm mb-6">
                  This will permanently delete all your notifications. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-800 text-white text-sm font-bold rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      clearAll();
                      setShowClearConfirm(false);
                    }}
                    className="flex-1 px-4 py-3 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                  >
                    Clear All
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
