import { Wallet, Trophy, Zap, DollarSign, Star, MessageSquare, User, X, ChevronRight, ArrowRight, Bell, BarChart2, LogOut, Download, Plus, Phone, Check, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { db, messaging } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc, onSnapshot, orderBy, updateDoc, arrayUnion, arrayRemove, limit } from 'firebase/firestore';
import { getToken, deleteToken } from 'firebase/messaging';
import { motion, AnimatePresence } from 'motion/react';

const Card = ({ children, className = '' }) => (
  <div className={`bg-[#2C2C2E] p-4 rounded-3xl relative overflow-hidden border border-gray-700/50 ${className}`}>
    {children}
  </div>
);

const colorVariants = {
  yellow: {
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-500/10',
    shadow: 'shadow-yellow-500/10'
  },
  green: {
    border: 'border-green-500/50',
    bg: 'bg-green-500/10',
    shadow: 'shadow-green-500/10'
  },
  blue: {
    border: 'border-blue-500/50',
    bg: 'bg-blue-500/10',
    shadow: 'shadow-blue-500/10'
  },
  purple: {
    border: 'border-purple-500/50',
    bg: 'bg-purple-500/10',
    shadow: 'shadow-purple-500/10'
  },
  orange: {
    border: 'border-orange-500/50',
    bg: 'bg-orange-500/10',
    shadow: 'shadow-orange-500/10'
  },
  pink: {
    border: 'border-pink-500/50',
    bg: 'bg-pink-500/10',
    shadow: 'shadow-pink-500/10'
  }
};

const StatCard = ({ icon, title, value, subtitle, color, trendIcon }) => {
  const variants = colorVariants[color] || colorVariants.yellow;
  
  return (
    <Card className={variants.border}>
      <div
        className={`absolute -top-4 -right-4 w-24 h-24 rounded-full blur-3xl ${variants.bg}`}
      ></div>
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex justify-between items-start">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-800`}>
              {icon}
            </div>
            {trendIcon}
          </div>
          <p className="text-gray-400 text-sm mt-4">{title}</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
};

const NavCard = ({ icon, title }) => (
  <Card className={`border-gray-700/50`}>
    <div className="flex flex-col items-center justify-center aspect-square">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-800`}>
        {icon}
      </div>
      <span className="mt-3 text-sm text-center text-white font-medium">{title}</span>
    </div>
  </Card>
);

export default function Home({ user, onLogout }) {
  const [stats, setStats] = useState({ totalWins: 0, activeTournaments: 0, walletBalance: 0, totalEarnings: 0 });
  const [userRank, setUserRank] = useState(0);
  const [userNotifications, setUserNotifications] = useState([]);
  const [globalNotifications, setGlobalNotifications] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [joinedIds, setJoinedIds] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!user?.referralCode) return;
    
    try {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = user.referralCode;
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

  useEffect(() => {
    if (user?.fcmTokens && user.fcmTokens.length > 0) {
      setIsPushEnabled(true);
    } else {
      setIsPushEnabled(false);
      
      // Auto-register if permission is already granted but no tokens are in DB
      const autoRegister = async () => {
        if (!user?.uid || isTogglingPush) return;
        
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          console.log('Push permission granted but no tokens in DB. Attempting auto-registration...');
          try {
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
            const msg = await messaging();
            if (msg && vapidKey) {
              const token = await getToken(msg, { vapidKey });
              if (token) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                  fcmTokens: arrayUnion(token)
                });
                console.log('Auto-registered push token successfully');
              }
            }
          } catch (err) {
            console.error('Auto-registration failed:', err);
          }
        }
      };
      
      autoRegister();
    }
  }, [user, isTogglingPush]);

  const togglePushNotifications = async () => {
    if (!user) return;
    setIsTogglingPush(true);
    
    try {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        alert('Setup Required: Please add your VITE_FIREBASE_VAPID_KEY to the environment variables first.');
        setIsTogglingPush(false);
        return;
      }

      const msg = await messaging();
      if (!msg) {
        alert('Push notifications are not supported in this browser or are blocked by the preview environment. Try opening the app in a new tab.');
        setIsTogglingPush(false);
        return;
      }

      if (isPushEnabled) {
        // Disable notifications
        const currentToken = await getToken(msg, { vapidKey });
        if (currentToken) {
          await deleteToken(msg);
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayRemove(currentToken)
          });
        }
        setIsPushEnabled(false);
      } else {
        // Enable notifications
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Permission denied. You need to allow notifications in your browser settings.');
          setIsTogglingPush(false);
          return;
        }

        const token = await getToken(msg, { vapidKey });
        if (token) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
          });
          setIsPushEnabled(true);
          alert('Notifications enabled successfully!');
        } else {
          alert('Failed to generate notification token.');
        }
      }
    } catch (error: any) {
      console.error('Error toggling push notifications:', error);
      
      // Provide more specific error messages
      if (error.code === 'messaging/permission-blocked') {
        alert('Permission blocked. Please click the lock icon in your browser address bar and allow notifications.');
      } else if (error.code === 'messaging/failed-service-worker-registration') {
        alert('Service worker failed to register. This usually happens in incognito mode or if the site is not secure (HTTPS).');
      } else {
        alert(`Failed: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setIsTogglingPush(false);
    }
  };

  useEffect(() => {
    // Check for install prompt dismissal (1 hour cooldown)
    const dismissedAt = localStorage.getItem('installPromptDismissedAt');
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (!dismissedAt || now - parseInt(dismissedAt) > oneHour) {
      setShowInstallPrompt(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. User Data Listener (Balance)
    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setStats(prev => ({ 
          ...prev, 
          walletBalance: userData.walletBalance || 0,
          totalWins: userData.totalWins || 0
        }));

        // Check for missing profile details
        if (!userData.username || (!userData.phoneNumber && !userData.phone)) {
          setShowProfileModal(true);
          setProfileUsername(userData.username || '');
          let phoneVal = userData.phoneNumber || userData.phone || '';
          if (phoneVal.startsWith('+92')) {
            phoneVal = phoneVal.substring(3);
          }
          setProfilePhone(phoneVal);
        } else {
          setShowProfileModal(false);
        }
      } else {
        // Initialize user with 1000 coins for testing as requested
        await setDoc(userRef, {
          email: user.email,
          walletBalance: 1000,
          createdAt: new Date()
        });
        setStats(prev => ({ ...prev, walletBalance: 1000 }));
      }
    });

    // 2. Tournaments Listener (Fetch all once and keep updated)
    const unsubAllTournaments = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const tournamentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllTournaments(tournamentsData);
    });

    // 3. Joined Tournaments Listener
    const registrationsQuery = query(
      collection(db, 'registrations'),
      where('userId', '==', user.uid)
    );
    
    const unsubRegistrations = onSnapshot(registrationsQuery, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.data().tournamentId);
      const uniqueIds = [...new Set(ids)];
      setJoinedIds(uniqueIds);
      setStats(prev => ({ ...prev, activeTournaments: uniqueIds.length }));
    });

    // 4. Support Tickets Listener
    const ticketsQuery = query(
      collection(db, 'support_tickets'),
      where('userId', '==', user.uid)
    );

    const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setSupportTickets(ticketsData.slice(0, 2)); // Only show 2 recent requests
    });

    // 4. Recent Transactions Listener
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })).sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      
      // Calculate total earnings
      const totalEarnings = txData.filter(tx => tx.type === 'Winning' || tx.type === 'Kills')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
      setStats(prev => ({ ...prev, totalEarnings }));
      setRecentTransactions(txData.slice(0, 3)); // Only show 3 recent transactions
      setLoading(false);
    });

    // 5. Leaderboard Rank Listener (Limit to top 100 for performance)
    const qLeaderboard = query(collection(db, 'users'), orderBy('totalWins', 'desc'), limit(100));
    const unsubLeaderboard = onSnapshot(qLeaderboard, (snapshot) => {
      const topUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const rank = topUsers.findIndex(u => u.id === user.uid) + 1;
      
      if (rank > 0) {
        setUserRank(rank);
      } else {
        // If not in top 100, we could do a count query, but for now let's just set a high number or 0
        setUserRank(0); 
      }
    });

    // 6. Notifications Listener
    const qUserNotifs = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const qGlobalNotifs = query(collection(db, 'global_notifications'), orderBy('createdAt', 'desc'));

    const unsubUserNotifs = onSnapshot(qUserNotifs, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        isGlobal: false,
        createdAt: doc.data().createdAt || { toDate: () => new Date() }
      }));
      setUserNotifications(notifs);
    });

    const unsubGlobalNotifs = onSnapshot(qGlobalNotifs, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        isGlobal: true,
        createdAt: doc.data().createdAt || { toDate: () => new Date() }
      }));
      setGlobalNotifications(notifs);
    });

    return () => {
      unsubUser();
      unsubAllTournaments();
      unsubRegistrations();
      unsubTickets();
      unsubTransactions();
      unsubLeaderboard();
      unsubUserNotifs();
      unsubGlobalNotifs();
    };
  }, [user]);

  const joinedTournaments = useMemo(() => {
    if (allTournaments.length === 0 || joinedIds.length === 0) return [];
    return allTournaments.filter(t => {
      const isJoined = joinedIds.includes(t.id);
      const isCompleted = t.status === 'completed' || t.status === 'result' || t.status === 'Result';
      return isJoined && !isCompleted;
    });
  }, [allTournaments, joinedIds]);

  useEffect(() => {
    const combined = [...globalNotifications, ...userNotifications].sort((a: any, b: any) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    setRecentNotifications(combined.slice(0, 2));
  }, [userNotifications, globalNotifications]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center text-white">
        <div className="relative flex items-center justify-center mb-4 w-16 h-16">
          <div className="absolute inset-0 border-[2px] border-yellow-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-[4px] border-transparent border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
          <div className="absolute inset-3 border-[2px] border-transparent border-b-yellow-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
          <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
        </div>
        <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-widest text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0D0D0D] text-white min-h-screen">
      {/* Desktop Dashboard */}
      <div className="hidden lg:block min-h-screen bg-[#0D0D0D] relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-8 py-12 relative z-10">
          {/* Header Section */}
          <div className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
                Dashboard
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Push Notifications First */}
              <div className="bg-[#1C1C1E]/80 backdrop-blur-md border border-gray-800 p-2 pr-4 rounded-2xl flex items-center gap-4 shadow-xl">
                <div className="bg-gray-800/50 p-3 rounded-xl">
                  <Bell className={isPushEnabled ? "text-green-400" : "text-gray-400"} size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-1.5 uppercase tracking-wider">Push Notifications</p>
                  <button 
                    onClick={togglePushNotifications}
                    disabled={isTogglingPush}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-2 w-full ${isPushEnabled ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-yellow-400 text-black hover:bg-yellow-500'}`}
                  >
                    {isTogglingPush && <Loader2 size={12} className="animate-spin" />}
                    {isPushEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>

              {/* User Profile Details & Logout Second */}
              <div className="flex items-center gap-6 bg-[#1C1C1E]/50 backdrop-blur-md border border-gray-800/50 px-6 py-2.5 rounded-2xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 shadow-inner">
                    <User size={20} className="text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white leading-tight">{user.username}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{user.email}</p>
                  </div>
                </div>
                
                <div className="h-8 w-[1px] bg-gray-800/50" />

                <button 
                  onClick={onLogout}
                  className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors group"
                >
                  <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                  <span className="text-sm font-bold">Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-6 mb-12">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-[#1C1C1E] p-6 rounded-3xl border border-gray-800 relative overflow-hidden group hover:border-yellow-400/50 transition-colors shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-yellow-400/10 transition-colors"></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="bg-yellow-400/10 p-3.5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Wallet className="text-yellow-400" size={28} />
                </div>
                <div className="bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700/50">
                  <BarChart2 className="text-yellow-400" size={14} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-gray-400 text-sm font-medium mb-1">Wallet Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tight">{stats.walletBalance}</span>
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">coins</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-[#1C1C1E] p-6 rounded-3xl border border-gray-800 relative overflow-hidden group hover:border-green-400/50 transition-colors shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-green-400/10 transition-colors"></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="bg-green-400/10 p-3.5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="text-green-400" size={28} />
                </div>
                <div className="bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700/50">
                  <Star className="text-green-400" size={14} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-gray-400 text-sm font-medium mb-1">Total Wins</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tight">{stats.totalWins}</span>
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">matches</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-[#1C1C1E] p-6 rounded-3xl border border-gray-800 relative overflow-hidden group hover:border-blue-400/50 transition-colors shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-400/10 transition-colors"></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="bg-blue-400/10 p-3.5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Zap className="text-blue-400" size={28} />
                </div>
                <div className="bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700/50">
                  <Zap className="text-blue-400" size={14} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-gray-400 text-sm font-medium mb-1">Active Tournaments</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tight">{stats.activeTournaments}</span>
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">joined</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-[#1C1C1E] p-6 rounded-3xl border border-gray-800 relative overflow-hidden group hover:border-purple-400/50 transition-colors shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-purple-400/10 transition-colors"></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="bg-purple-400/10 p-3.5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="text-purple-400" size={28} />
                </div>
                <div className="bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700/50">
                  <BarChart2 className="text-purple-400" size={14} />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-gray-400 text-sm font-medium mb-1">Total Earnings</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tight">+{stats.totalEarnings}</span>
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">coins</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Nav - 6 Columns */}
          <div className="grid grid-cols-6 gap-6 mb-12">
            {[
              { icon: <Trophy size={24} className="text-yellow-400" />, label: 'Tournaments', path: '/tournaments', color: 'yellow' },
              { icon: <Star size={24} className="text-orange-400" />, label: 'Daily Tasks', path: '/tasks', color: 'orange' },
              { icon: <Wallet size={24} className="text-green-400" />, label: 'My Wallet', path: '/wallet', color: 'green' },
              { icon: <MessageSquare size={24} className="text-blue-400" />, label: 'Support', path: '/support', color: 'blue' },
              { icon: <User size={24} className="text-purple-400" />, label: 'Profile', path: '/profile', color: 'purple' },
              { icon: <Zap size={24} className="text-pink-400" />, label: 'Referral', path: '/referral', color: 'pink' },
            ].map((item) => {
              const variants = colorVariants[item.color] || colorVariants.yellow;
              return (
                <Link key={item.label} to={item.path}>
                  <motion.div 
                    whileHover={{ y: -5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-[#1C1C1E] h-full p-6 rounded-3xl border border-gray-800 flex flex-col items-center justify-center group hover:bg-gray-800/50 transition-all shadow-xl hover:shadow-2xl"
                  >
                    <div className={`mb-4 bg-gray-900/80 p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg ${variants.shadow}`}>
                      {item.icon}
                    </div>
                    <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column (8 cols) */}
            <div className="col-span-8 space-y-8">
              {/* My Tournaments */}
              <div className="bg-[#1C1C1E] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-gray-800/50 flex justify-between items-center bg-[#1F1F22]/50">
                  <div className="flex items-center space-x-4">
                    <div className="bg-yellow-400/10 p-2 rounded-xl">
                      <Trophy className="text-yellow-400" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">My Tournaments</h2>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Upcoming matches</p>
                    </div>
                  </div>
                  <Link to="/tournaments" className="text-yellow-400 text-sm font-bold flex items-center hover:text-yellow-300 transition-colors bg-yellow-400/10 px-4 py-2 rounded-xl hover:bg-yellow-400/20">
                    View All <ChevronRight size={16} className="ml-1" />
                  </Link>
                </div>
                
                <div className="p-6">
                  {joinedTournaments.length > 0 ? (
                    <div className="space-y-4">
                      {joinedTournaments.map((tournament) => (
                        <motion.div 
                          key={tournament.id}
                          whileHover={{ scale: 1.01 }}
                          className="bg-[#252528] p-5 rounded-2xl border border-gray-700/50 flex justify-between items-center group hover:border-yellow-400/30 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center font-black text-gray-600 group-hover:text-yellow-400 transition-colors">
                              #{tournament.id.slice(-2)}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">{tournament.name}</h3>
                              <div className="flex gap-2 mt-1.5">
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wide border border-blue-500/20">{tournament.gameType || 'BR'}</span>
                                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wide border border-purple-500/20">{tournament.mode || 'Solo'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-6">
                            <div>
                              <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Prize Pool</p>
                              <div className="text-green-400 font-black text-lg">{tournament.prizePool} <span className="text-xs font-bold text-gray-500">coins</span></div>
                            </div>
                            <Link 
                              to="/tournaments" 
                              className="bg-yellow-400 text-black text-xs font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 hover:-translate-y-0.5"
                            >
                              Enter Room
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-[#252528]/50 rounded-2xl border border-dashed border-gray-800">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="text-gray-600" size={32} />
                      </div>
                      <p className="text-gray-400 font-medium mb-4">You haven't joined any tournaments yet</p>
                      <Link to="/tournaments" className="inline-block bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 transition-colors">
                        Browse Tournaments
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-[#1C1C1E] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-gray-800/50 flex justify-between items-center bg-[#1F1F22]/50">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-400/10 p-2 rounded-xl">
                      <BarChart2 className="text-blue-400" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Your financial history</p>
                    </div>
                  </div>
                  <Link to="/transactions" className="text-blue-400 text-sm font-bold flex items-center hover:text-blue-300 transition-colors bg-blue-400/10 px-4 py-2 rounded-xl hover:bg-blue-400/20">
                    View All <ChevronRight size={16} className="ml-1" />
                  </Link>
                </div>
                <div className="p-6">
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {recentTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#252528] border border-gray-700/30 hover:bg-[#2A2A2D] transition-colors group">
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-xl ${tx.type === 'Deposit' || tx.type === 'Winning' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              <Zap size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-white group-hover:text-gray-200 transition-colors">{tx.type}</p>
                              <p className="text-gray-500 text-xs font-medium mt-0.5">{tx.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-black text-lg ${tx.type === 'Deposit' || tx.type === 'Winning' ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.type === 'Deposit' || tx.type === 'Winning' ? '+' : '-'}{tx.amount}
                            </p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                              tx.status === 'Completed' ? 'bg-green-500/10 text-green-400' : 
                              tx.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400' : 
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-[#252528]/50 rounded-2xl border border-dashed border-gray-800">
                      <p className="text-gray-500 font-medium">No recent transactions found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (4 cols) */}
            <div className="col-span-4 space-y-8">
              {/* Profile Card */}
              <div className="bg-[#1C1C1E] rounded-3xl border border-gray-800 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-yellow-400/10 to-transparent pointer-events-none" />
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-1 mb-6 shadow-2xl shadow-yellow-500/20">
                    <div className="w-full h-full bg-[#1C1C1E] rounded-full flex items-center justify-center overflow-hidden">
                      <User size={48} className="text-yellow-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{user.username}</h3>
                  <p className="text-gray-500 mb-8 font-medium text-sm bg-gray-800/50 px-4 py-1 rounded-full">{user.email}</p>
                  
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-[#252528] p-5 rounded-2xl border border-gray-700/50 hover:border-yellow-400/30 transition-colors group">
                      <p className="text-3xl font-black text-white group-hover:text-yellow-400 transition-colors">{stats.activeTournaments}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Tournaments</p>
                    </div>
                    <div className="bg-[#252528] p-5 rounded-2xl border border-gray-700/50 hover:border-green-400/30 transition-colors group">
                      <p className="text-3xl font-black text-white group-hover:text-green-400 transition-colors">{stats.totalWins}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Wins</p>
                    </div>
                  </div>

                  {/* Referral Code Quick Copy */}
                  <div className="w-full mt-6 bg-[#252528] rounded-2xl border border-gray-700/50 p-4 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                    <div className="text-left">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Referral Code</p>
                      <p className="text-lg font-black text-blue-400 font-mono tracking-widest">{user.referralCode || 'N/A'}</p>
                    </div>
                    <button 
                      onClick={handleCopyCode}
                      className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all text-gray-400 hover:text-white active:scale-95"
                      title="Copy Referral Code"
                    >
                      {copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
                    </button>
                  </div>
                  
                  <Link to="/profile" className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                    Edit Profile
                  </Link>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-[#1C1C1E] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-800/50 flex justify-between items-center bg-[#1F1F22]/50">
                  <div className="flex items-center space-x-3">
                    <Bell className="text-yellow-400" size={18} />
                    <h2 className="font-bold text-white">Notifications</h2>
                  </div>
                  <Link to="/notifications" className="text-yellow-400 text-xs font-bold hover:underline">View All</Link>
                </div>
                <div className="p-6 space-y-4">
                  {recentNotifications.length > 0 ? (
                    recentNotifications.map((notif: any) => (
                      <div key={notif.id} className="bg-[#252528] p-4 rounded-2xl border border-gray-700/30 hover:bg-[#2A2A2D] transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`w-2 h-2 rounded-full mt-1.5 ${notif.isRead ? 'bg-gray-600' : 'bg-yellow-400'}`}></span>
                          <p className="text-[10px] text-gray-500 font-medium">
                            {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors pl-4 line-clamp-1">{notif.title}</p>
                        <p className="text-xs text-gray-500 pl-4 mt-1 line-clamp-1">{notif.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-xs">No recent notifications</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-[#1C1C1E] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="p-6 border-b border-gray-800/50 flex justify-between items-center bg-[#1F1F22]/50 relative z-10">
                  <div className="flex items-center space-x-3">
                    <Trophy className="text-purple-400" size={18} />
                    <h2 className="font-bold text-white">Leaderboard</h2>
                  </div>
                  <Link to="/leaderboard" className="text-purple-400 text-xs font-bold hover:underline">View All</Link>
                </div>
                <div className="p-8 text-center relative z-10">
                  <div className="inline-block relative">
                    <p className="text-6xl font-black text-white mb-2 tracking-tighter drop-shadow-lg">#{userRank || '?'}</p>
                    {userRank > 0 && userRank <= 100 && (
                      <div className="absolute -top-4 -right-6 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide animate-bounce">
                        Top 100
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-8">Current Rank</p>
                  
                  <Link to="/leaderboard" className="block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl w-full transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-0.5 text-center">
                    View Full Rankings
                  </Link>
                </div>
              </div>

              {/* Support */}
              <div className="bg-[#1C1C1E] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-800/50 flex justify-between items-center bg-[#1F1F22]/50">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="text-blue-400" size={18} />
                    <h2 className="font-bold text-white">Support</h2>
                  </div>
                  <Link to="/support" className="text-blue-400 text-xs font-bold hover:underline">View All</Link>
                </div>
                <div className="p-6 space-y-4">
                  {supportTickets.length > 0 ? (
                    supportTickets.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#252528] border border-gray-700/30 hover:bg-[#2A2A2D] transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="bg-blue-900/20 p-2.5 rounded-xl">
                            <MessageSquare className="text-blue-400" size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{req.subject}</p>
                            <p className="text-gray-500 text-[10px] font-medium mt-0.5">#{req.id.slice(-4)}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${
                          req.status === 'Pending' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' : 
                          req.status === 'Solved' ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 
                          'bg-blue-400/10 text-blue-400 border border-blue-400/20'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500 text-sm font-medium">No recent support requests</p>
                    </div>
                  )}
                  <Link to="/support" className="block w-full bg-[#252528] text-center text-gray-300 hover:text-white font-bold py-3 rounded-xl hover:bg-gray-700 transition-colors mt-2 text-sm border border-gray-700/50">
                    Create New Request
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Dashboard */}
      <div className="lg:hidden container mx-auto p-4 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-yellow-400">Welcome back, {user.username}!</h1>
          <p className="text-gray-400">Track your progress and manage your gaming journey</p>
        </div>

        <Card className="mb-8 flex justify-between items-center border-yellow-500/50">
          <div>
            <p className="text-sm text-gray-300">Mobile push notifications</p>
            <button 
              onClick={togglePushNotifications}
              disabled={isTogglingPush}
              className={`${isPushEnabled ? 'bg-gray-700 text-white' : 'bg-yellow-400 text-black'} font-bold py-2 px-5 rounded-lg mt-2 text-sm disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isTogglingPush && <Loader2 size={14} className="animate-spin" />}
              {isPushEnabled ? 'Disable' : 'Enable Notifications'}
            </button>
          </div>
          <button className="bg-gray-700 p-3 rounded-lg">
            <ArrowRight className="h-5 w-5 text-gray-300" />
          </button>
        </Card>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard 
            icon={<Wallet size={20} className="text-yellow-400" />} 
            title="Wallet Balance" 
            value={stats.walletBalance} 
            subtitle="coins" 
            color="yellow"
            trendIcon={<BarChart2 size={16} className="text-green-400" />}
          />
          <StatCard 
            icon={<Trophy size={20} className="text-green-400" />} 
            title="Total Wins" 
            value={stats.totalWins} 
            subtitle="0.0% win rate" 
            color="green"
            trendIcon={<BarChart2 size={16} className="text-gray-500" />}
          />
          <StatCard 
            icon={<Zap size={20} className="text-blue-400" />} 
            title="Active" 
            value={stats.activeTournaments} 
            subtitle="tournaments" 
            color="blue"
            trendIcon={<Zap size={16} className="text-blue-400" />}
          />
          <StatCard 
            icon={<DollarSign size={20} className="text-purple-400" />} 
            title="Total Earnings" 
            value={`+${stats.totalEarnings}`} 
            subtitle="coins" 
            color="purple"
            trendIcon={<BarChart2 size={16} className="text-green-400" />}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link to="/tournaments"><NavCard icon={<Trophy size={24} className="text-yellow-400" />} title="Browse" /></Link>
          <NavCard icon={<Star size={24} className="text-orange-400" />} title="Daily Tasks" />
          <Link to="/wallet"><NavCard icon={<Wallet size={24} className="text-green-400" />} title="My Wallet" /></Link>
          <Link to="/support"><NavCard icon={<MessageSquare size={24} className="text-blue-400" />} title="Support" /></Link>
          <Link to="/profile"><NavCard icon={<User size={24} className="text-purple-400" />} title="Profile" /></Link>
          <Link to="/referral"><NavCard icon={<Zap size={24} className="text-pink-400" />} title="Referral" /></Link>
          <div onClick={onLogout} className="cursor-pointer"><NavCard icon={<X size={24} className="text-red-400" />} title="Logout" /></div>
        </div>

        {joinedTournaments.length > 0 && (
          <Card className="mb-6 border-yellow-500/50">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <Trophy size={20} className="text-yellow-400" />
                <h2 className="font-bold text-lg">My Tournaments</h2>
              </div>
              <Link to="/tournaments" className="text-yellow-400 text-sm font-semibold flex items-center">View All <ChevronRight size={16} /></Link>
            </div>
            
            <div className="space-y-4">
              {joinedTournaments.map((tournament) => (
                <div key={tournament.id} className="bg-[#1C1C1E] p-4 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white text-sm">{tournament.name}</h3>
                    <span className="text-green-400 text-xs font-bold">{tournament.prizePool} coins</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <span className="text-[10px] bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded">{tournament.gameType || 'BR'}</span>
                    <span className="text-[10px] bg-purple-900/40 text-purple-400 px-2 py-0.5 rounded">{tournament.mode || 'Solo'}</span>
                  </div>
                  <Link 
                    to="/tournaments" 
                    className="block w-full bg-yellow-400 text-black text-center text-xs font-bold py-2 rounded-lg hover:bg-yellow-300 transition-colors"
                  >
                    View Room
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="mb-6 border-green-500/50">
           <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">Recent Transactions</h2>
            <Link to="/transactions" className="text-yellow-400 text-sm font-semibold flex items-center">View All <ChevronRight size={16} /></Link>
          </div>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${tx.type === 'Deposit' || tx.type === 'Winning' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <Zap size={20} className={tx.type === 'Deposit' || tx.type === 'Winning' ? 'text-green-400' : 'text-red-400'}/>
                        </div>
                        <div>
                            <p className="font-semibold">{tx.type}</p>
                            <p className="text-xs text-gray-400">{tx.date}</p>
                        </div>
                    </div>
                    <div>
                        <p className={`font-bold ${tx.type === 'Deposit' || tx.type === 'Winning' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.type === 'Deposit' || tx.type === 'Winning' ? '+' : '-'}{tx.amount} coins
                        </p>
                        <p className="text-xs text-gray-500 text-right">{tx.status}</p>
                    </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-xs">No recent transactions</p>
              </div>
            )}
          </div>
        </Card>
        
        <Card className="mb-6 border-yellow-500/50">
            <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-yellow-400/10 flex items-center justify-center border-2 border-yellow-400 mb-4">
                    <User size={40} className="text-yellow-400"/>
                </div>
                <h3 className="font-bold text-xl">{user.username}</h3>
                <p className="text-gray-400 text-sm">{user.email}</p>
                <div className="flex space-x-8 mt-4">
                    <div>
                        <p className="text-2xl font-bold">{stats.activeTournaments}</p>
                        <p className="text-xs text-gray-500">Tournaments</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.totalWins}</p>
                        <p className="text-xs text-gray-500">Wins</p>
                    </div>
                </div>
            </div>
        </Card>

        <Card className="mb-6 border-blue-500/50">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <Bell size={20} className="text-blue-400" />
                    <h2 className="font-bold text-lg">Notifications</h2>
                </div>
                <Link to="/notifications" className="text-blue-400 text-sm font-semibold flex items-center">View All <ChevronRight size={16} /></Link>
            </div>
            <div>
                {recentNotifications.length > 0 ? (
                  <div className="space-y-3">
                    {recentNotifications.map((notif: any) => (
                      <div key={notif.id}>
                        <p className="font-semibold text-sm line-clamp-1">{notif.title}</p>
                        <p className="text-xs text-gray-400">
                          {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">No recent notifications</p>
                )}
            </div>
        </Card>

        <Card className="mb-6 border-purple-500/50">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <Trophy size={20} className="text-purple-400" />
                    <h2 className="font-bold text-lg">Leaderboard</h2>
                </div>
                <Link to="/leaderboard" className="text-purple-400 text-sm font-semibold flex items-center">View All <ChevronRight size={16} /></Link>
            </div>
            <div className="text-center">
                <p className="text-4xl font-bold text-purple-400">#{userRank || '?'}</p>
                <p className="text-sm text-gray-400 mb-4">Current Rank</p>
                <div className="flex justify-around items-center mb-4">
                    <div>
                        <p className="text-2xl font-bold">{stats.totalWins}</p>
                        <p className="text-xs text-gray-500">Wins</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">0</p>
                        <p className="text-xs text-gray-500">Streak</p>
                    </div>
                </div>
                <Link to="/leaderboard" className="block bg-purple-500/80 text-white font-bold py-2.5 px-6 rounded-lg w-full text-center">View Rankings</Link>
            </div>
        </Card>

        <Card className="border-red-500/50">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <MessageSquare size={20} className="text-red-400" />
                    <h2 className="font-bold text-lg">Support Requests</h2>
                </div>
                <Link to="/support" className="text-red-400 text-sm font-semibold flex items-center">View All <ChevronRight size={16} /></Link>
            </div>
            <div className="space-y-3">
                {supportTickets.length > 0 ? (
                  supportTickets.map((req) => (
                    <div key={req.id} className="bg-[#1C1C1E] p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="bg-red-900/20 p-2 rounded-lg">
                          <MessageSquare className="text-red-400" size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{req.subject}</p>
                          <p className="text-gray-500 text-[10px]">TICKET #{req.id.slice(-4)}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        req.status === 'Pending' ? 'bg-yellow-400/10 text-yellow-400' : 
                        req.status === 'Solved' ? 'bg-green-400/10 text-green-400' : 
                        'bg-blue-400/10 text-blue-400'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gray-500 text-[10px]">No recent support requests</p>
                  </div>
                )}
                <Link to="/support" className="block w-full bg-red-500/10 text-red-400 text-center text-xs font-bold py-3 rounded-lg border border-red-500/30 mt-2">
                  Create New Request
                </Link>
            </div>
        </Card>

      </div>

      {/* Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-[100] lg:left-auto lg:right-6 lg:w-96"
          >
            <div className="bg-gradient-to-r from-[#F27D26] to-[#F7B733] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="bg-black/10 p-2 rounded-xl">
                  <Download size={24} className="text-black" />
                </div>
                <div className="flex-1">
                  <h3 className="text-black font-extrabold text-lg leading-tight mb-1">Install Gamer Zone</h3>
                  <p className="text-black/80 text-sm font-medium leading-tight mb-4">
                    Add to your home screen for quick access!
                  </p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowInstructions(true)}
                      className="flex-1 bg-black text-yellow-400 font-bold py-3 rounded-xl text-sm hover:bg-black/90 transition-colors"
                    >
                      Show Instructions
                    </button>
                    <button 
                      onClick={() => {
                        setShowInstallPrompt(false);
                        localStorage.setItem('installPromptDismissedAt', Date.now().toString());
                      }}
                      className="bg-[#E67E22] text-black p-3 rounded-xl hover:bg-[#D35400] transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1C1C1E] w-full max-w-sm rounded-3xl border border-gray-800 shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Install Gamer Zone</h2>
                  <button onClick={() => setShowInstructions(false)} className="text-gray-400 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                <div className="bg-[#0D0D0F] rounded-2xl p-5 border border-gray-800/50 mb-6">
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    To install this app on your Android device:
                  </p>
                  <ol className="space-y-4">
                    <li className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                      <span className="text-yellow-400 font-bold">1.</span>
                      <span>Tap the <span className="text-white font-bold">menu icon</span> (three dots) in your browser</span>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                      <span className="text-yellow-400 font-bold">2.</span>
                      <span>Select <span className="text-white font-bold">"Install app"</span> or <span className="text-white font-bold">"Add to Home screen"</span></span>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                      <span className="text-yellow-400 font-bold">3.</span>
                      <span>Confirm the installation</span>
                    </li>
                  </ol>
                </div>

                <div className="flex items-center gap-3 mb-8 px-2">
                  <div className="bg-yellow-400/10 p-1.5 rounded-lg border border-yellow-400/20">
                    <Plus size={16} className="text-yellow-400" />
                  </div>
                  <p className="text-yellow-400 text-sm font-bold">
                    Or look for an "Install" banner at the top of your browser
                  </p>
                </div>

                <button 
                  onClick={() => {
                    setShowInstructions(false);
                    setShowInstallPrompt(false);
                    localStorage.setItem('installPromptDismissedAt', Date.now().toString());
                  }}
                  className="w-full bg-yellow-400 text-black font-bold py-4 rounded-2xl text-lg hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-400/10"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mandatory Profile Completion Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[#1C1C1E]/80 w-full max-w-[280px] rounded-[2rem] border border-gray-800/50 shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-14 h-14 bg-yellow-400/10 rounded-2xl flex items-center justify-center mb-3 border border-yellow-400/20">
                    <User size={28} className="text-yellow-400" />
                  </div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Profile Setup</h2>
                  <p className="text-gray-500 text-[10px] mt-1 font-medium">
                    Complete your profile to continue.
                  </p>
                </div>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!profileUsername.trim() || profilePhone.length !== 10) return;
                    
                    try {
                      setIsUpdatingProfile(true);
                      await updateDoc(doc(db, 'users', user.uid), {
                        username: profileUsername.trim(),
                        phoneNumber: '+92' + profilePhone.trim()
                      });
                      setShowProfileModal(false);
                    } catch (err) {
                      console.error('Error updating profile:', err);
                    } finally {
                      setIsUpdatingProfile(false);
                    }
                  }}
                  className="space-y-3.5"
                >
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-1">Username</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-yellow-400 transition-colors">
                        <User size={14} />
                      </div>
                      <input
                        type="text"
                        required
                        value={profileUsername}
                        onChange={(e) => setProfileUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full bg-black/40 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-yellow-400 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-1">Phone Number</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-[10px] font-black text-yellow-400">+92</span>
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={profilePhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 10) setProfilePhone(val);
                        }}
                        placeholder="3001234567"
                        className="w-full bg-black/40 border border-gray-800 rounded-xl pl-11 pr-3 py-2.5 text-xs text-white focus:border-yellow-400 outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[7px] text-gray-600">10 digits (e.g. 300...)</p>
                      <p className={`text-[7px] font-bold ${profilePhone.length === 10 ? 'text-green-500' : 'text-gray-600'}`}>
                        {profilePhone.length}/10
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile || !profileUsername.trim() || profilePhone.length !== 10}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-30 text-black font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-yellow-400/10 flex items-center justify-center gap-2 mt-2"
                  >
                    {isUpdatingProfile ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={14} /> Save & Continue
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

