import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, DollarSign, ArrowDownUp, Trophy, Award, 
  Bell, Star, History, MessageSquare, BellRing, LogOut, Menu, X, Settings, ShieldAlert, Lock, Key
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [serverKey, setServerKey] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'admin', 'access_config'), (doc) => {
      if (doc.exists()) {
        const key = doc.data().key;
        setServerKey(key);
        const storedKey = localStorage.getItem('admin_access_key');
        if (storedKey === key) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } else {
        // If no config, allow access but this shouldn't happen with Overview init
        setIsAuthorized(true);
      }
    });

    return () => unsub();
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey === serverKey) {
      localStorage.setItem('admin_access_key', inputKey);
      setIsAuthorized(true);
      setError('');
    } else {
      setError('Invalid Access Key');
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#0B1121] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0B1121] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#131B2F] border border-gray-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <Lock size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Admin Access Locked</h1>
          <p className="text-gray-400 text-sm mb-8">Please enter your secret access key to continue to the admin panel.</p>
          
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="ENTER ACCESS KEY"
                className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-yellow-500 transition-all font-bold tracking-widest text-center uppercase"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold uppercase tracking-wider">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl uppercase tracking-[0.2em] transition-all shadow-lg shadow-yellow-500/10"
            >
              Verify & Access
            </button>
            <button 
              type="button"
              onClick={() => navigate('/')}
              className="w-full text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest py-2 transition-colors"
            >
              Return to Website
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { path: '/admin', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { path: '/admin/users', icon: <Users size={16} />, label: 'Users' },
    { path: '/admin/tournaments', icon: <Trophy size={16} />, label: 'Tournaments' },
    { path: '/admin/transactions', icon: <DollarSign size={16} />, label: 'Transactions' },
    { path: '/admin/notifications', icon: <Bell size={16} />, label: 'Notifications' },
    { path: '/admin/support', icon: <MessageSquare size={16} />, label: 'Support' },
    { path: '/admin/settings', icon: <Settings size={16} />, label: 'Settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin' && location.pathname !== '/admin') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#0B1121] text-gray-300 font-sans flex flex-col">
      
      {/* Top Navbar */}
      <nav className="bg-[#0B1121] border-b border-gray-800 px-4 py-3 sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-[1600px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="bg-yellow-400 text-black font-bold px-3 py-1.5 rounded text-sm tracking-widest">GZ ADMIN</div>
            <div className="hidden lg:flex items-center gap-2">
              {menuItems.map(item => (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.path) ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                >
                  {item.icon} {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <button onClick={() => navigate('/')} className="hidden lg:flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-bold">
              <LogOut size={16} /> Exit
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div className={`lg:hidden fixed top-[60px] left-0 w-full max-h-[calc(100vh-60px)] bg-[#1C1C1E] z-40 shadow-lg transform transition-transform duration-300 overflow-y-auto ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto p-2 flex flex-col">
          <nav>
            <ul>
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full flex items-center justify-between p-2 rounded-md my-0.5 transition-colors ${
                      isActive(item.path) ? 'bg-gray-700/50 text-yellow-400' : 'text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className={isActive(item.path) ? 'text-yellow-400' : 'text-gray-400'}>{item.icon}</span>
                      <span className={`ml-2 text-sm ${isActive(item.path) ? 'text-yellow-400' : ''}`}>{item.label}</span>
                    </div>
                  </Link>
                </li>
              ))}
              <li className="mt-1">
                <button onClick={() => navigate('/')} className="flex items-center p-2 text-red-500 hover:bg-gray-700/50 rounded-md w-full">
                  <LogOut size={18} />
                  <span className="ml-2 text-sm">Exit Admin</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
