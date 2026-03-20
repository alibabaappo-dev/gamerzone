import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bell, Menu, X, LayoutDashboard, Trophy, Star, BarChart2, FileText, Wallet, ArrowUpDown, History, MessageSquare, LogOut, ArrowLeft, ChevronRight, User, Check, Clock, ArrowDownLeft, ArrowUpRight, Trash2, Gift, Home as HomeIcon, Award, ChevronLeft } from 'lucide-react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';

import Logo from './Logo';

interface NavbarProps {
  user: {
    uid: string;
    username: string;
    email: string;
    isAdmin?: boolean;
    isOwner?: boolean;
    permissions?: Record<string, boolean>;
  };
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activePopupTab, setActivePopupTab] = useState<'notifications' | 'transactions'>('notifications');
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [claims, setClaims] = useState<string[]>([]);
  const [taskClaims, setTaskClaims] = useState<Record<string, any>>({});
  const [dailyTaskResetAt, setDailyTaskResetAt] = useState<Date | null>(null);
  const [weeklyTaskResetAt, setWeeklyTaskResetAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch registrations for task progress
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', user.uid)
    );
    
    const unsubReg = onSnapshot(q, (snapshot) => {
      const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistrations(regs);
    });

    // Fetch user data for claims and resets
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Load task claims timestamps
        if (data.taskLastClaimed) {
          setTaskClaims(data.taskLastClaimed);
        } else {
          setTaskClaims({});
        }
        
        if (data.dailyTaskResetAt) {
          setDailyTaskResetAt(data.dailyTaskResetAt.toDate ? data.dailyTaskResetAt.toDate() : new Date(data.dailyTaskResetAt));
        } else {
          setDailyTaskResetAt(null);
        }
        
        if (data.weeklyTaskResetAt) {
          setWeeklyTaskResetAt(data.weeklyTaskResetAt.toDate ? data.weeklyTaskResetAt.toDate() : new Date(data.weeklyTaskResetAt));
        } else {
          setWeeklyTaskResetAt(null);
        }

        // Check daily claims
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const d = new Date(now);
        d.setDate(d.getDate() - d.getDay());
        const weekStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (data.dailyClaims && data.dailyClaims.date === today) {
          setClaims(data.dailyClaims.claimed || []);
        } else if (data.weeklyClaims && data.weeklyClaims.weekStart === weekStart) {
          setClaims(data.weeklyClaims.claimed || []);
        } else {
          setClaims([]);
        }
      }
    });

    return () => {
      unsubReg();
      unsubUser();
    };
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    const calculatePending = () => {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const getProgress = (taskId: string, type: 'daily' | 'weekly', isWinTask: boolean = false, target: number = 1) => {
        const startOfPeriod = type === 'daily' ? startOfToday : startOfWeek;
        let baselineTime = startOfPeriod.getTime();

        const resetAt = type === 'daily' ? dailyTaskResetAt : weeklyTaskResetAt;
        if (resetAt && resetAt.getTime() > baselineTime) {
          baselineTime = resetAt.getTime();
        }

        if (taskClaims[taskId]) {
          const lastClaim = taskClaims[taskId];
          const claimDate = lastClaim.toDate ? lastClaim.toDate() : new Date(lastClaim);
          if (claimDate.getTime() >= startOfPeriod.getTime()) {
            return target;
          }
        }

        let progress = 0;
        registrations.forEach(reg => {
          const joinedDate = reg.joinedAt?.toDate ? reg.joinedAt.toDate() : new Date(reg.joinedAt);
          if (isWinTask) {
            if (reg.won) {
              const wonDate = reg.wonAt?.toDate ? reg.wonAt.toDate() : (reg.wonAt ? new Date(reg.wonAt) : joinedDate);
              if (wonDate.getTime() >= baselineTime) progress++;
            }
          } else {
            if (joinedDate.getTime() >= baselineTime) progress++;
          }
        });
        return progress;
      };

      const tasks = [
        { id: 'join_2', target: 2, type: 'daily' as const, isWin: false },
        { id: 'join_6', target: 6, type: 'daily' as const, isWin: false },
        { id: 'win_3_matches', target: 3, type: 'daily' as const, isWin: true },
        { id: 'weekly_join_20', target: 20, type: 'weekly' as const, isWin: false }
      ];

      let count = 0;
      tasks.forEach(t => {
        const progress = getProgress(t.id, t.type, t.isWin, t.target);
        const isClaimed = claims.includes(t.id);
        
        // Check if claimed today/this week
        let isCooldown = false;
        if (taskClaims[t.id]) {
          const lastClaim = taskClaims[t.id];
          const lastClaimDate = lastClaim.toDate ? lastClaim.toDate() : new Date(lastClaim);
          const startOfPeriod = t.type === 'daily' ? startOfToday : startOfWeek;
          if (lastClaimDate.getTime() >= startOfPeriod.getTime()) {
            isCooldown = true;
          }
        }

        if (progress >= t.target && !isClaimed && !isCooldown) {
          count++;
        }
      });

      setPendingTasksCount(count);
    };

    calculatePending();
  }, [registrations, claims, taskClaims, dailyTaskResetAt, weeklyTaskResetAt, user]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userUnreadCount) {
          count += data.userUnreadCount;
        }
      });
      setSupportUnreadCount(count);
    });

    return () => unsubscribe();
  }, [user]);

  const menuItems = [
    { icon: <LayoutDashboard size={18} />, text: 'Dashboard', path: '/' },
    { icon: <Trophy size={18} />, text: 'Tournaments', path: '/tournaments' },
    { 
      icon: (
        <div className="relative">
          <Star size={18} />
          {pendingTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-[#0D0D0F] animate-pulse">
              {pendingTasksCount}
            </span>
          )}
        </div>
      ), 
      text: 'Tasks', 
      path: '/tasks' 
    },
    { icon: <BarChart2 size={18} />, text: 'Leaderboard', path: '/leaderboard' },
    { icon: <FileText size={18} />, text: 'Guidelines', path: '/guidelines' },
    { icon: <Wallet size={18} />, text: 'Wallet', path: '/wallet' },
    { icon: <ArrowUpDown size={18} />, text: 'Withdrawals', path: '/withdrawals' },
    { icon: <Award size={18} />, text: 'Results History', path: '/results-history' },
    { icon: <History size={18} />, text: 'Transactions', path: '/transactions' },
    { icon: <div className="relative"><MessageSquare size={18} />{supportUnreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}</div>, text: 'Support', path: '/support' },
    { icon: <Bell size={18} />, text: 'Notifications', path: '/notifications' },
  ];

  const hasAnyPermission = user.permissions && Object.values(user.permissions).some(v => v === true);

  if (user.isOwner || user.isAdmin || hasAnyPermission) {
    menuItems.push({ 
      icon: <LayoutDashboard size={18} />, 
      text: user.isOwner ? 'Owner Panel' : 'Admin Panel', 
      path: '/admin' 
    });
  }

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (nav) {
      checkScroll();
      nav.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        nav.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll, menuItems.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (navRef.current) {
      const scrollAmount = 200;
      navRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });
    return () => unsubscribe();
  }, [user]);

  const markAllAsRead = async () => {
    if (!user?.uid) return;
    const unreadUserNotifs = notifications.filter(n => !n.isRead && !n.isGlobal);
    const unreadGlobalIds = notifications.filter(n => !n.isRead && n.isGlobal).map(n => n.id);
    
    try {
      if (unreadUserNotifs.length > 0) {
        await Promise.all(unreadUserNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true })));
      }
      
      if (unreadGlobalIds.length > 0) {
        const currentRead = userData?.readGlobalNotifs || [];
        await updateDoc(doc(db, 'users', user.uid), {
          readGlobalNotifs: [...new Set([...currentRead, ...unreadGlobalIds])]
        });
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const clearAllNotifications = async () => {
    if (!user?.uid) return;
    const userNotifs = notifications.filter(n => !n.isGlobal);
    const currentGlobalIds = notifications.filter(n => n.isGlobal).map(n => n.id);
    
    try {
      if (userNotifs.length > 0) {
        await Promise.all(userNotifs.map(n => deleteDoc(doc(db, 'notifications', n.id))));
      }
      
      if (currentGlobalIds.length > 0) {
        const currentDeleted = userData?.deletedGlobalNotifs || [];
        await updateDoc(doc(db, 'users', user.uid), {
          deletedGlobalNotifs: [...new Set([...currentDeleted, ...currentGlobalIds])]
        });
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid) return;
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    try {
      if (!notif.isGlobal) {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
      } else {
        const currentRead = userData?.readGlobalNotifs || [];
        if (!currentRead.includes(id)) {
          await updateDoc(doc(db, 'users', user.uid), {
            readGlobalNotifs: [...currentRead, id]
          });
        }
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid) return;
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    try {
      if (!notif.isGlobal) {
        await deleteDoc(doc(db, 'notifications', id));
      } else {
        const currentDeleted = userData?.deletedGlobalNotifs || [];
        if (!currentDeleted.includes(id)) {
          await updateDoc(doc(db, 'users', user.uid), {
            deletedGlobalNotifs: [...currentDeleted, id]
          });
        }
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    const qUser = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const qGlobal = query(collection(db, 'global_notifications'), orderBy('createdAt', 'desc'));

    let userNotifs: any[] = [];
    let globalNotifs: any[] = [];

    const updateCombined = () => {
      const readGlobalIds = userData?.readGlobalNotifs || [];
      const deletedGlobalIds = userData?.deletedGlobalNotifs || [];

      const processedGlobal = globalNotifs
        .filter(n => !deletedGlobalIds.includes(n.id))
        .map(n => ({
          ...n,
          isRead: readGlobalIds.includes(n.id)
        }));

      const combined = [...processedGlobal, ...userNotifs].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setNotifications(combined);
      setUnreadCount(combined.filter(n => !n.isRead).length);
    };

    const unsubscribeUser = onSnapshot(qUser, (snapshot) => {
      userNotifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toLocaleString() : 'Just now',
        isGlobal: false
      }));
      updateCombined();
    });

    const unsubscribeGlobal = onSnapshot(qGlobal, (snapshot) => {
      globalNotifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toLocaleString() : 'Just now',
        isGlobal: true
      }));
      updateCombined();
    });

    return () => {
      unsubscribeUser();
      unsubscribeGlobal();
    };
  }, [user, userData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Desktop Navbar */}
      <header className="hidden lg:block bg-[#0D0D0F] border-b border-gray-800/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex justify-between items-center">
            <div className="relative flex items-center flex-1 overflow-hidden mr-8">
              <Link to="/" className="flex items-center justify-center shrink-0 mr-8">
                <Logo className="h-10 w-auto" />
              </Link>
              
              <div className="relative flex-1 overflow-hidden flex items-center">
                {showLeftArrow && (
                  <button 
                    onClick={() => scroll('left')}
                    className="absolute left-0 z-10 bg-gradient-to-r from-[#0D0D0F] via-[#0D0D0F] to-transparent p-2 text-gray-400 hover:text-white transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                
                <nav 
                  ref={navRef}
                  className="flex items-center space-x-1 overflow-x-auto scrollbar-hide py-2 scroll-smooth"
                >
                  {menuItems.map((item, index) => (
                    <NavLink
                      key={index}
                      to={item.path}
                      end
                      className={({ isActive }) =>
                        `flex items-center px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 ${
                          isActive 
                            ? 'bg-[#1C1C1E] text-yellow-400 shadow-lg shadow-black/20' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                        }`
                      }
                    >
                      <span className="mr-2">{item.icon}</span>
                      <span className="text-sm font-medium">{item.text}</span>
                    </NavLink>
                  ))}
                </nav>

                {showRightArrow && (
                  <button 
                    onClick={() => scroll('right')}
                    className="absolute right-0 z-10 bg-gradient-to-l from-[#0D0D0F] via-[#0D0D0F] to-transparent p-2 text-gray-400 hover:text-white transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            </div>

          <div className="flex items-center space-x-6">
            <div className="relative" ref={notificationRef}>
              <div 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`bg-[#1C1C1E] p-2.5 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer ${isNotificationsOpen ? 'text-white' : ''}`}
              >
                <Bell size={20} />
              </div>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[#0D0D0F]">{unreadCount}</span>
              )}

              {/* Notification Dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-[340px] bg-[#1C1C1E] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-[60]"
                  >
                    {/* Header */}
                      <div className="p-4 px-5 border-b border-gray-800 flex items-center justify-between bg-[#1C1C1E]">
                        <div className="flex items-center gap-2">
                          <Bell size={20} className="text-yellow-400 fill-yellow-400/10" />
                          <h3 className="text-base font-bold text-white">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-[10px] font-bold text-white px-2 py-0.5 rounded-full min-w-[18px] text-center ml-1">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button 
                              onClick={markAllAsRead}
                              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Mark all
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button 
                              onClick={() => setShowClearConfirm(true)}
                              className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                            >
                              Clear all
                            </button>
                          )}
                          <button onClick={() => setIsNotificationsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={20} />
                          </button>
                        </div>
                      </div>

                    {/* List */}
                    <div className="max-h-[380px] overflow-y-auto bg-[#1C1C1E] scrollbar-hide">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`p-4 px-5 border-b border-gray-800/50 hover:bg-white/5 transition-colors relative group cursor-pointer ${!notification.isRead ? 'border-l-[3px] border-l-blue-500' : 'border-l-[3px] border-l-transparent'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1.5">
                                {!notification.isRead ? (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                ) : (
                                  <div className="w-2 h-2"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[13px] font-bold leading-tight mb-1 ${notification.isRead ? 'text-gray-400' : 'text-gray-100'}`}>
                                  {notification.title}
                                </p>
                                <div className="text-[10px] text-gray-500 font-medium">
                                  <span>{notification.timestamp}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!notification.isRead && (
                                  <button 
                                    onClick={(e) => markAsRead(notification.id, e)}
                                    className="text-gray-500 hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-blue-400/10"
                                    title="Mark as read"
                                  >
                                    <Check size={16} />
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => deleteNotification(notification.id, e)}
                                  className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center">
                          <div className="bg-gray-800/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell size={24} className="text-gray-700" />
                          </div>
                          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No notifications</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <button 
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/notifications');
                      }}
                      className="w-full p-4 text-center text-[13px] font-black text-blue-400 hover:bg-blue-400/5 transition-colors bg-[#1C1C1E] border-t border-gray-800"
                    >
                      View All Notifications
                    </button>

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
                            className="relative w-full max-w-[280px] bg-[#1C1C1E] border border-gray-800 rounded-2xl p-5 shadow-2xl"
                          >
                            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-red-500/20">
                              <Trash2 className="text-red-500" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white text-center mb-1">Clear All?</h3>
                            <p className="text-gray-400 text-center text-[11px] mb-5">
                              This will permanently delete all your notifications.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 px-3 py-2 bg-gray-800 text-white text-[11px] font-bold rounded-lg hover:bg-gray-700 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  clearAllNotifications();
                                  setShowClearConfirm(false);
                                }}
                                className="flex-1 px-3 py-2 bg-red-500 text-white text-[11px] font-bold rounded-lg hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                              >
                                Clear
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navbar */}
      <header className="lg:hidden bg-[#1C1C1E] sticky top-0 z-40 border-b border-gray-700/50">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center justify-center">
              <Logo className="h-10 w-auto" />
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <div 
              className="relative cursor-pointer"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-6 w-6 text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">{unreadCount}</span>
              )}
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6 text-gray-400" /> : <Menu className="h-6 w-6 text-gray-400" />}
            </button>
          </div>
        </div>
      </header>

      <div className={`lg:hidden fixed top-16 left-0 w-full max-h-[calc(100vh-4rem)] bg-[#1C1C1E] z-30 shadow-lg transform transition-transform duration-300 overflow-y-auto pb-6 ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto p-2 flex flex-col">
          <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="mb-2 px-2 block hover:bg-gray-700/30 rounded-lg py-1 transition-colors">
            <p className="font-bold text-white text-sm">{user.username}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </Link>

          <hr className="border-gray-700/50 my-1" />

          <nav>
            <ul>
              {menuItems.map((item, index) => (
                <li key={index}>
                  <NavLink
                    to={item.path}
                    end
                    className={({ isActive }) =>
                      `flex items-center p-2 text-white hover:bg-gray-700/50 rounded-md my-0.5 ${
                        isActive ? 'bg-gray-700/50' : ''
                      }`
                    }
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`${isActive ? 'text-yellow-400' : 'text-gray-400'}`}>{item.icon}</span>
                        <span className={`ml-2 text-sm ${isActive ? 'text-yellow-400' : ''}`}>{item.text}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
              <li className="mt-1">
                <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="flex items-center p-2 text-red-500 hover:bg-gray-700/50 rounded-md w-full">
                  <LogOut size={18} />
                  <span className="ml-2 text-sm">Logout</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

    </>
  );
}
