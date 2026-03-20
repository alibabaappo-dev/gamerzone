/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured, messaging } from './lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onMessage, getToken } from 'firebase/messaging';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';
import { AnimatePresence, motion } from 'motion/react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateTournament from './pages/CreateTournament';
import Tournament from './pages/Tournament';
import Tournaments from './pages/Tournaments';
import Wallet from './pages/Wallet';
import Tasks from './pages/Tasks';
import Leaderboard from './pages/Leaderboard';
import Guidelines from './pages/Guidelines';
import Admin from './pages/Admin';
import Landing from './pages/Landing';
import Withdrawals from './pages/Withdrawals';
import Transactions from './pages/Transactions';
import Support from './pages/Support';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Referral from './pages/Referral';
import ResultsHistory from './pages/ResultsHistory';
import { User } from './types';
import { VAPID_KEY } from './lib/firebase';
import { arrayUnion } from 'firebase/firestore';

interface LoaderContextType {
  triggerLoader: () => void;
}

export const LoaderContext = createContext<LoaderContextType>({ triggerLoader: () => {} });

export const useGlobalLoader = () => useContext(LoaderContext);

function PageTransitionLoader({ children, appUser }: { children: React.ReactNode, appUser: any }) {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const triggerLoader = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500); // 0.5 seconds as requested
  };

  useEffect(() => {
    // Show loader for all sections when logged in, including admin
    if (!appUser) {
      return;
    }

    triggerLoader();
  }, [location.pathname]);

  return (
    <LoaderContext.Provider value={{ triggerLoader }}>
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="relative flex items-center justify-center mb-4 w-16 h-16">
              <div className="absolute inset-0 border-[2px] border-yellow-500/10 rounded-full"></div>
              <div className="absolute inset-0 border-[4px] border-transparent border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
              <div className="absolute inset-3 border-[2px] border-transparent border-b-yellow-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
              <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
            </div>
            <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-widest text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">Loading...</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ display: loading ? 'none' : 'block' }}>
        {children}
      </div>
    </LoaderContext.Provider>
  );
}

function AppContent({ appUser, handleLogout, appSettings }: { appUser: any, handleLogout: () => void, appSettings: any }) {
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';

  if (appSettings.maintenanceMode && !appUser?.isAdmin && !appUser?.isOwner) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-4">Maintenance Mode</h1>
          <p className="text-gray-400">{appSettings.maintenanceMessage}</p>
        </div>
      </div>
    );
  }

  if (appUser?.isBanned) {
    console.log('User is banned. Reason:', appUser.banReason);
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-[#1C1C1E] rounded-[2rem] border border-red-500/20 p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Account Banned</h2>
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 mb-8">
            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-2">Reason for Suspension</p>
            <p className="text-gray-300 text-sm font-medium leading-relaxed">
              {appUser.banReason || 'Your account has been suspended for violating our terms of service.'}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {appUser && !isAdminPage && <Navbar user={appUser} onLogout={handleLogout} />}
      <main>
        <PageTransitionLoader appUser={appUser}>
          <Routes>
            <Route path="/" element={appUser ? <Home user={appUser} onLogout={handleLogout} /> : <Landing />} />
            <Route path="/login" element={!appUser ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!appUser ? <Register /> : <Navigate to="/" />} />
            <Route path="/tournaments/new" element={appUser ? <CreateTournament /> : <Navigate to="/login" />} />
            <Route path="/tournaments/:id" element={appUser ? <Tournament user={appUser} /> : <Navigate to="/login" />} />
            <Route path="/tournaments" element={appUser ? <Tournaments /> : <Navigate to="/login" />} />
            <Route path="/tasks" element={appUser ? <Tasks /> : <Navigate to="/login" />} />
            <Route path="/leaderboard" element={appUser ? <Leaderboard /> : <Navigate to="/login" />} />
            <Route path="/guidelines" element={appUser ? <Guidelines /> : <Navigate to="/login" />} />
            <Route path="/wallet" element={appUser ? <Wallet /> : <Navigate to="/login" />} />
            <Route path="/withdrawals" element={appUser ? <Withdrawals /> : <Navigate to="/login" />} />
            <Route path="/transactions" element={appUser ? <Transactions /> : <Navigate to="/login" />} />
            <Route path="/support" element={appUser ? <Support user={appUser} /> : <Navigate to="/login" />} />
            <Route path="/notifications" element={appUser ? <Notifications /> : <Navigate to="/login" />} />
            <Route path="/profile" element={appUser ? <Profile user={appUser} /> : <Navigate to="/login" />} />
            <Route path="/referral" element={appUser ? <Referral user={appUser} /> : <Navigate to="/login" />} />
            <Route path="/results-history" element={appUser ? <ResultsHistory /> : <Navigate to="/login" />} />
            <Route path="/admin" element={appUser && (appUser.isOwner || appUser.isAdmin || (appUser.permissions && Object.values(appUser.permissions).some(v => v === true))) ? <Admin /> : <Navigate to="/" />} />
          </Routes>
        </PageTransitionLoader>
      </main>
    </div>
  );
}

function MainApp() {
  const [user, loading] = useAuthState(auth);
  const [appUser, setAppUser] = useState<any>(null);
  const [appSettings, setAppSettings] = useState({ maintenanceMode: false, maintenanceMessage: '', primaryColor: '#eab308' });

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (docSnap) => {
      if (docSnap.exists()) {
        const settings = docSnap.data();
        setAppSettings({
          maintenanceMode: settings.maintenanceMode || false,
          maintenanceMessage: settings.maintenanceMessage || 'We are currently performing scheduled maintenance. Please check back later.',
          primaryColor: settings.primaryColor || '#eab308'
        });
        if (settings.primaryColor) {
          document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
        }
      }
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    const setupMessaging = async () => {
      try {
        const msg = await messaging();
        if (msg && user) {
          // Request permission
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(msg, { vapidKey: VAPID_KEY });
            if (token) {
              console.log('FCM Token generated:', token);
              // Save token to user document
              await updateDoc(doc(db, 'users', user.uid), {
                fcmTokens: arrayUnion(token)
              });
            }
          }

          onMessage(msg, (payload) => {
            if (payload.notification) {
              // In a real app, you'd use a nice toast library here.
              // For now, we use the native browser alert to ensure it's visible.
              alert(`🔔 ${payload.notification.title}\n\n${payload.notification.body}`);
            }
          });
        }
      } catch (e) {
        console.error('Error setting up messaging:', e);
      }
    };
    setupMessaging();

    if (user) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Generate referral code if missing
          if (!data.referralCode) {
            const referralCode = (data.username || user.displayName || 'USER').substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                referralCode: referralCode
              });
            } catch (error) {
              console.error("Error generating referral code:", error);
            }
          }

          setAppUser({
            uid: user.uid,
            username: data.username || user.displayName || 'User',
            email: user.email,
            phone: data.phoneNumber || data.phone || '',
            isAdmin: data.isAdmin === true,
            isOwner: data.isOwner === true,
            hideEmail: data.hideEmail === true,
            referralCode: data.referralCode || '',
            isBanned: data.isBanned === true,
            banReason: data.banReason || '',
            fcmTokens: data.fcmTokens || [],
            permissions: data.permissions || {},
            coins: data.walletBalance || 0,
            createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
          });
        } else {
          setAppUser({
            uid: user.uid,
            username: user.displayName || 'User',
            email: user.email,
            phone: '',
            isAdmin: false,
            isOwner: false,
            hideEmail: false,
            referralCode: '',
            isBanned: false,
            banReason: '',
            fcmTokens: [],
            permissions: {},
            coins: 0,
            createdAt: '',
          });
        }
      });
      return () => unsub();
    } else {
      setAppUser(null);
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <LoadingScreen message="Loading application..." />;
  }

  return (
    <Router>
      <AppContent appUser={appUser} handleLogout={handleLogout} appSettings={appSettings} />
    </Router>
  );
}

export default function App() {
  return <MainApp />;
}

