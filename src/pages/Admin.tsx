import { useState, useEffect, useRef, useCallback } from 'react';
import { db, storage, auth } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc, increment, where, addDoc, serverTimestamp, getDoc, getDocs, deleteField, writeBatch, runTransaction, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Trophy, Star, DollarSign, ArrowDownUp, Check, X, Eye, EyeOff, Trash2, Plus, LayoutDashboard, Menu, LogOut, Shield, Search, ArrowUpRight, Clock, CheckCircle2, XCircle, MessageSquare, User, Award, Loader2, Users, Coins, Pencil, Crosshair, Flame, Calendar, Mail, Bell, Settings, Ban, Gamepad2, Lock, Phone, Zap, Send, BellRing, History, Edit2, Upload, BellOff, ArrowLeft, Target, Crown, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AdminControl from '../components/AdminControl';
import PaymentMethods from '../components/PaymentMethods';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userEmail = user.email || '';
        const isMaster = userEmail === 'alibabaappo@gmail.com';
        
        try {
          const adminEmailDoc = await getDoc(doc(db, 'admin_emails', userEmail));
          const adminData = adminEmailDoc.exists() ? adminEmailDoc.data() : null;

          unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setCurrentUser({ 
                id: userDoc.id, 
                email: userEmail,
                ...userData,
                isAdmin: userData.isAdmin || !!adminData || isMaster,
                isOwner: userData.isOwner || adminData?.role === 'owner' || isMaster
              });
            } else if (isMaster || adminData) {
              setCurrentUser({
                id: user.uid,
                email: userEmail,
                isAdmin: true,
                isOwner: isMaster || adminData?.role === 'owner'
              });
            }
            setIsUserLoading(false);
          });
        } catch (error) {
          console.error("Error fetching admin status:", error);
          setIsUserLoading(false);
        }
      } else {
        setIsUserLoading(false);
        navigate('/login');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDoc?.();
    };
  }, [navigate]);

  const hasPermission = (tab: string) => {
    if (isUserLoading || !currentUser) return false;
    
    // Owners have access to everything
    if (currentUser.isOwner) return true;
    
    const permissions = currentUser.permissions || {};
    
    // Check if there's at least one permission explicitly set to true
    const hasExplicitPermissions = Object.values(permissions).some(val => val === true);

    if (hasExplicitPermissions) {
      // If they have explicit permissions, ONLY show those set to true
      return !!permissions[tab];
    }
    
    // If no explicit permissions are set to true, fall back to isAdmin
    return !!currentUser.isAdmin;
  };

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { id: 'users', icon: <Users size={16} />, label: 'Users' },
    { id: 'deposits', icon: <DollarSign size={16} />, label: 'Deposits', badge: 0 }, // Will be updated below
    { id: 'withdrawals', icon: <ArrowDownUp size={16} />, label: 'Withdrawals', badge: 0 }, // Will be updated below
    { id: 'tournaments', icon: <Trophy size={16} />, label: 'Tournaments' },
    { id: 'results', icon: <Award size={16} />, label: 'Results' },
    { id: 'notifications', icon: <Bell size={16} />, label: 'Notifications' },
    { id: 'leaderboard', icon: <Trophy size={16} />, label: 'Leaderboard' },
    { id: 'tasks', icon: <Star size={16} />, label: 'Daily Tasks' },
    { id: 'referral', icon: <Users size={16} />, label: 'Referral' },
    { id: 'viewTransactions', icon: <History size={16} />, label: 'View Transactions' },
    { id: 'push', icon: <BellRing size={16} />, label: 'Push' },
    { id: 'support', icon: <MessageSquare size={16} />, label: 'Support', badge: 0 }, // Will be updated below
    { id: 'payment-methods', icon: <DollarSign size={16} />, label: 'Payment Methods' },
    { id: 'blocked-accounts', icon: <Ban size={16} />, label: 'Blocked Accounts' },
    { id: 'admin-control', icon: <Shield size={16} />, label: 'Admin Control' },
    { id: 'settings', icon: <Settings size={16} />, label: 'App Setting' },
  ];

  useEffect(() => {
    if (!isUserLoading) {
      const permissions = currentUser?.permissions || {};
      const hasExplicitPermissions = Object.values(permissions).some(val => val === true);

      if (!currentUser || (!currentUser.isOwner && !currentUser.isAdmin && !hasExplicitPermissions)) {
        navigate('/');
        return;
      }
      
      if (hasExplicitPermissions && !currentUser.isOwner) {
        if (!permissions[activeTab]) {
          // Find first available tab from filtered menu items
          const permittedItems = menuItems.filter(item => hasPermission(item.id));
          if (permittedItems.length > 0 && !permittedItems.find(i => i.id === activeTab)) {
            setActiveTab(permittedItems[0].id);
          }
        }
      }
    }
  }, [isUserLoading, currentUser, activeTab]);

  const [isSectionLoading, setIsSectionLoading] = useState(false);
  const [resultsTab, setResultsTab] = useState('pending');
  const [addedResultsSearch, setAddedResultsSearch] = useState('');
  const [modalResultsSearch, setModalResultsSearch] = useState('');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState({ maintenanceMode: false, primaryColor: '#eab308', maintenanceMessage: '', oneDeviceOneAccount: false, emailVerificationEnabled: false });
  const [minDepositLimit, setMinDepositLimit] = useState(50);
  const [isUpdatingDepositLimit, setIsUpdatingDepositLimit] = useState(false);
  const [minWithdrawalLimit, setMinWithdrawalLimit] = useState(100);
  const [isUpdatingWithdrawalLimit, setIsUpdatingWithdrawalLimit] = useState(false);

  useEffect(() => {
    const unsubAppSettings = onSnapshot(doc(db, 'settings', 'app'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setAppSettings({
          maintenanceMode: data.maintenanceMode || false,
          primaryColor: data.primaryColor || '#eab308',
          maintenanceMessage: data.maintenanceMessage || '',
          oneDeviceOneAccount: data.oneDeviceOneAccount || false,
          emailVerificationEnabled: data.emailVerificationEnabled || false
        });
      }
    });

    const unsubTransactionSettings = onSnapshot(doc(db, 'admin', 'transaction_settings'), (doc) => {
      if (doc.exists()) {
        setMinDepositLimit(doc.data().minDeposit || 50);
        setMinWithdrawalLimit(doc.data().minWithdrawal || 100);
      }
    });

    return () => {
      unsubAppSettings();
      unsubTransactionSettings();
    };
  }, []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any | null>(null);
  const [notificationForm, setNotificationForm] = useState({ title: '', message: '', type: 'system' });
  const [leaderboardForm, setLeaderboardForm] = useState({ allTimeChampion: '' });
  const [referralRequests, setReferralRequests] = useState<any[]>([]);
  const [referralSettings, setReferralSettings] = useState({
    referrerReward: 10,
    refereeReward: 5,
    enabled: true
  });
  const [leaderboardSettings, setLeaderboardSettings] = useState<any>(null);
  const [referralTab, setReferralTab] = useState<'pending' | 'history'>('pending');
  const [referralSearchTerm, setReferralSearchTerm] = useState('');
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [viewingTransactionUser, setViewingTransactionUser] = useState<any | null>(null);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);

  useEffect(() => {
    setIsSectionLoading(true);
    const timer = setTimeout(() => {
      setIsSectionLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    if (viewingTransactionUser) {
      const q = query(collection(db, 'transactions'), where('userId', '==', viewingTransactionUser.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by createdAt descending
        transactions.sort((a: any, b: any) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        setUserTransactions(transactions);
      });
      return () => unsubscribe();
    }
  }, [viewingTransactionUser]);

  const handleUpdateDepositLimit = async () => {
    if (minDepositLimit < 1) {
      showToast('Minimum deposit limit must be at least 1', 'error');
      return;
    }
    
    setIsUpdatingDepositLimit(true);
    try {
      await setDoc(doc(db, 'admin', 'transaction_settings'), {
        minDeposit: minDepositLimit
      }, { merge: true });
      showToast('Minimum deposit limit updated successfully', 'success');
    } catch (error) {
      console.error('Error updating deposit limit:', error);
      showToast('Failed to update deposit limit', 'error');
    } finally {
      setIsUpdatingDepositLimit(false);
    }
  };

  const handleUpdateWithdrawalLimit = async () => {
    if (minWithdrawalLimit < 1) {
      showToast('Minimum withdrawal limit must be at least 1', 'error');
      return;
    }
    
    setIsUpdatingWithdrawalLimit(true);
    try {
      await setDoc(doc(db, 'admin', 'transaction_settings'), {
        minWithdrawal: minWithdrawalLimit
      }, { merge: true });
      showToast('Minimum withdrawal limit updated successfully', 'success');
    } catch (error) {
      console.error('Error updating withdrawal limit:', error);
      showToast('Failed to update withdrawal limit', 'error');
    } finally {
      setIsUpdatingWithdrawalLimit(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteDoc(doc(db, 'transactions', txId));
        showToast('Transaction deleted successfully');
      } catch (error) {
        console.error('Error deleting transaction:', error);
        showToast('Failed to delete transaction', 'error');
      }
    }
  };

  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  const handleUpdateTransaction = async (txId: string, updatedData: any) => {
    try {
      await updateDoc(doc(db, 'transactions', txId), updatedData);
      setEditingTransaction(null);
      showToast('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      showToast('Failed to update transaction', 'error');
    }
  };

  const [newReferralSettings, setNewReferralSettings] = useState({
    referrerReward: 10,
    refereeReward: 5,
    enabled: true
  });
  
  const [pushForm, setPushForm] = useState({ 
    title: '', 
    body: '', 
    target: 'all', 
    specificUserEmail: ''
  });
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [pushHistory, setPushHistory] = useState<any[]>([]);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

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
    const q = query(collection(db, 'push_notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPushHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const [viewingSlotsTournament, setViewingSlotsTournament] = useState<any | null>(null);
  const [viewingResults, setViewingResults] = useState<string | null>(null);
  const [roomModal, setRoomModal] = useState<{id: string, roomId: string, password: string} | null>(null);

  // Support Section State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [supportFilter, setSupportFilter] = useState<'Open' | 'Pending' | 'Solved'>('Pending');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [adminReply, setAdminReply] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [depositSearchTerm, setDepositSearchTerm] = useState('');
  const [withdrawalSearchTerm, setWithdrawalSearchTerm] = useState('');
  const [depositSubTab, setDepositSubTab] = useState<'pending' | 'history'>('pending');
  const [withdrawalSubTab, setWithdrawalSubTab] = useState<'pending' | 'history'>('pending');
  const [selectedProofImage, setSelectedProofImage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [editUserData, setEditUserData] = useState<any>({});
  const [isEditingLeaderboardUser, setIsEditingLeaderboardUser] = useState(false);
  const [viewingTaskDetails, setViewingTaskDetails] = useState<any>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  }>({ isOpen: false, title: '', message: '', action: null });
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  const [editingTournament, setEditingTournament] = useState<any | null>(null);
  const [submittingResults, setSubmittingResults] = useState<{[key: string]: boolean}>({});

  const [winningAmounts, setWinningAmounts] = useState<{[key: string]: string}>({});
  const [killsAmounts, setKillsAmounts] = useState<{[key: string]: string}>({});
  const [winStatus, setWinStatus] = useState<{[key: string]: boolean}>({});
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [blockedSearchTerm, setBlockedSearchTerm] = useState('');
  const [viewingBanReason, setViewingBanReason] = useState<any | null>(null);
  const [userStatusFilter, setUserStatusFilter] = useState('All');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

  const [toast, setToast] = useState<{title: string, message: string, type: 'success'|'error'} | null>(null);
  const [resultsHistory, setResultsHistory] = useState<any[]>([]);
  const [selectedResultHistory, setSelectedResultHistory] = useState<any | null>(null);
  const [editingResultRecord, setEditingResultRecord] = useState<any | null>(null);
  const [isEditingResultProcessing, setIsEditingResultProcessing] = useState(false);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({ 
      title: type === 'success' ? 'Success' : 'Error',
      message, 
      type 
    });
    setTimeout(() => setToast(null), 3000);
  };

  const handleQuickAction = async (field: string, amount: number, isReset: boolean = false) => {
    if (!selectedUser) return;
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      const updateData: any = {};
      if (isReset) {
        updateData[field] = amount;
      } else {
        updateData[field] = increment(amount);
      }
      await updateDoc(userRef, updateData);
      showToast(`User ${field} updated successfully!`);
      
      // Update local state for immediate feedback
      const newValue = isReset ? amount : (selectedUser[field] || 0) + amount;
      setSelectedUser({ ...selectedUser, [field]: newValue });
    } catch (err) {
      showToast('Quick action failed', 'error');
    }
  };

  const [createdTournamentName, setCreatedTournamentName] = useState('');
  const [isTournamentCreatedModalOpen, setIsTournamentCreatedModalOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("New Tournament Alert!");
  const [notificationBody, setNotificationBody] = useState("");

  // Transaction Push Notification State
  const [isTxNotificationModalOpen, setIsTxNotificationModalOpen] = useState(false);
  const [txNotificationData, setTxNotificationData] = useState<{
    type: 'deposit' | 'withdrawal';
    amount: number;
    userId: string;
    userEmail?: string;
    title: string;
    body: string;
  } | null>(null);

  const handleDeleteAllNotifications = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Notifications',
      message: 'Are you sure you want to delete all push notification history? This action cannot be undone.',
      action: async () => {
        try {
          const batch = writeBatch(db);
          const snapshot = await getDocs(collection(db, 'push_notifications'));
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          showToast('All notifications deleted successfully!');
        } catch (error) {
          console.error('Error deleting notifications:', error);
          showToast('Failed to delete notifications', 'error');
        }
      }
    });
  };

  const handleSendTxPush = async () => {
    if (!txNotificationData) return;

    const { title, body, userId, userEmail } = txNotificationData;
    
    try {
      setIsSendingPush(true);
      
      // Save to history (optional, maybe distinct collection or same)
      await addDoc(collection(db, 'push_notifications'), {
        title,
        body,
        target: userId, // Store userId as target
        userEmail: userEmail || 'Unknown',
        status: 'sent',
        createdAt: serverTimestamp(),
        type: 'transaction'
      });

      // Send via API
      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, userId }),
      });

      // Also create in-app notification
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        title: title,
        message: body,
        type: 'wallet',
        isRead: false,
        createdAt: serverTimestamp()
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText}. Please ensure the backend is running.`);
      }

      if (!response.ok) throw new Error(data.error || 'Failed to send');

      if (data.successCount > 0) {
        showToast(`Success! Sent to user. (Success: ${data.successCount}, Failed: ${data.failureCount})`);
      } else {
        showToast(`Failed to send. (Success: ${data.successCount}, Failed: ${data.failureCount})`, 'error');
      }
      
      setIsTxNotificationModalOpen(false);
      setTxNotificationData(null);
    } catch (err: any) {
      console.error('Push error:', err);
      showToast(err.message || 'Failed to send push notification', 'error');
    } finally {
      setIsSendingPush(false);
    }
  };

  const handleSendNewTournamentPush = async () => {
    const title = notificationTitle;
    const body = notificationBody;
    
    try {
      setIsSendingPush(true);
      
      // Save to history
      await addDoc(collection(db, 'push_notifications'), {
        title,
        body,
        target: 'all',
        status: 'sent',
        createdAt: serverTimestamp(),
      });

      // Send via API
      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, target: 'all' }),
      });

      // Also create in-app notification
      await addDoc(collection(db, 'global_notifications'), {
        title: title,
        message: body,
        type: 'tournament',
        createdAt: serverTimestamp()
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText}. Please ensure the backend is running.`);
      }

      if (!response.ok) throw new Error(data.error || 'Failed to send');

      showToast(`Success! Sent to ${data.successCount} users.`);
      setIsTournamentCreatedModalOpen(false);
    } catch (err: any) {
      console.error('Push error:', err);
      showToast(err.message || 'Failed to send push notification', 'error');
    } finally {
      setIsSendingPush(false);
    }
  };

  const handleSendPush = async () => {
    if (!pushForm.title || !pushForm.body) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    let payload: any = { ...pushForm };
    
    if (pushForm.target === 'specific') {
      if (!pushForm.specificUserEmail) {
        showToast('Please enter a user email', 'error');
        return;
      }
      // Find user by email (case-insensitive)
      const user = users.find(u => u.email?.toLowerCase() === pushForm.specificUserEmail.toLowerCase());
      if (!user) {
        showToast('User not found with this email', 'error');
        return;
      }
      payload.userId = user.id;
      payload.userEmail = user.email; // Store email for history
      delete payload.target;
      delete payload.specificUserEmail;
    }

    try {
      setIsSendingPush(true);
      
      // Save to history first
      await addDoc(collection(db, 'push_notifications'), {
        ...payload,
        status: 'sent',
        createdAt: serverTimestamp(),
      });

      // Call our new backend API to actually send the notification
      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Also create in-app notification
      if (pushForm.target === 'all') {
        await addDoc(collection(db, 'global_notifications'), {
          title: pushForm.title,
          message: pushForm.body,
          type: 'system',
          createdAt: serverTimestamp()
        });
      } else if (pushForm.target === 'specific') {
        const targetUser = users.find(u => u.email?.toLowerCase() === pushForm.specificUserEmail.toLowerCase());
        if (targetUser) {
          await addDoc(collection(db, 'notifications'), {
            userId: targetUser.id,
            title: pushForm.title,
            message: pushForm.body,
            type: 'system',
            isRead: false,
            createdAt: serverTimestamp()
          });
        }
      }

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText}. Please ensure the backend is running.`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send push notification');
      }

      showToast(`Success! Sent to ${data.successCount} users.`);
      setPushForm({ title: '', body: '', target: 'all', specificUserEmail: '' });
    } catch (err: any) {
      console.error('Push error:', err);
      showToast(err.message || 'Failed to send push notification', 'error');
    } finally {
      setIsSendingPush(false);
    }
  };

  useEffect(() => {
    const unsubTournaments = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      setTournaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      txs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTransactions(txs);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSupport = onSnapshot(collection(db, 'support_tickets'), (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      tickets.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setSupportTickets(tickets);
    });

    const unsubNotifications = onSnapshot(collection(db, 'global_notifications'), (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notifs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setNotifications(notifs);
    });

    const unsubLeaderboard = onSnapshot(doc(db, 'settings', 'leaderboard'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setLeaderboardSettings(data);
        setLeaderboardForm({ allTimeChampion: data.allTimeChampion || '' });
      }
    });

    const unsubReferrals = onSnapshot(collection(db, 'referral_requests'), (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      requests.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setReferralRequests(requests);
    });

    const unsubReferralSettings = onSnapshot(doc(db, 'settings', 'referral'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const settings = {
          referrerReward: data.referrerAmount || 10,
          refereeReward: data.refereeAmount || 5,
          enabled: data.enabled !== false
        };
        setReferralSettings(settings);
        setNewReferralSettings(settings);
      }
    });

    const unsubResultsHistory = onSnapshot(collection(db, 'resultsHistory'), (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      history.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setResultsHistory(history);
    });

    return () => {
      unsubTournaments();
      unsubTransactions();
      unsubUsers();
      unsubSupport();
      unsubNotifications();
      unsubLeaderboard();
      unsubReferrals();
      unsubReferralSettings();
      unsubResultsHistory();
    };
  }, []);

  const fetchPlayers = async (tournament: any) => {
    const q = query(collection(db, 'registrations'), where('tournamentId', '==', tournament.id));
    onSnapshot(q, async (snapshot) => {
      const regs = await Promise.all(snapshot.docs.map(async (regDoc) => {
        const data = regDoc.data();
        let accountName = 'Unknown';
        if (data.userId) {
          const userSnap = await getDoc(doc(db, 'users', data.userId));
          if (userSnap.exists()) {
            accountName = userSnap.data().username || userSnap.data().email?.split('@')[0] || 'Unknown';
          }
        }
        return { id: regDoc.id, accountName, ...data };
      }));
      setRegistrations(regs);
      setViewingSlotsTournament(tournament);
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch (e) {
      return dateString.replace('T', ' ');
    }
  };

  const handleDeleteTournament = (id: string) => {
    if (!id) {
      showToast('Invalid tournament ID', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete Tournament',
      message: 'Are you sure you want to delete this tournament? This action cannot be undone.',
      action: async () => {
        try {
          // 1. Delete registrations (best effort)
          try {
            const q = query(collection(db, 'registrations'), where('tournamentId', '==', id));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
            }
          } catch (regError) {
            console.error('Error deleting registrations:', regError);
            // Continue to delete tournament even if registrations fail, 
            // but warn the user or just log it.
          }

          // 2. Delete the tournament document
          await deleteDoc(doc(db, 'tournaments', id));
          showToast('Tournament deleted successfully!');
        } catch (error: any) {
          console.error('Error deleting tournament:', error);
          // Ensure error message is a string to avoid "n.indexOf" type errors in toast
          const errorMessage = error?.message || 'Unknown error occurred';
          showToast(`Failed to delete tournament: ${errorMessage}`, 'error');
        }
      }
    });
  };

  const handleCopyTournament = async (tournament: any) => {
    try {
      const { id, ...tournamentData } = tournament;
      // Modify title to indicate it's a copy
      const newData = {
        ...tournamentData,
        title: `${tournamentData.title} (Copy)`,
        createdAt: serverTimestamp(),
        registeredPlayers: 0, // Reset registrations for the copy
        status: 'Upcoming', // Reset status to Upcoming
        // Clear room details for the copy
        roomDetails: {
          id: '',
          password: ''
        }
      };
      
      await addDoc(collection(db, 'tournaments'), newData);
      showToast('Tournament copied successfully!');
    } catch (error: any) {
      console.error('Error copying tournament:', error);
      showToast(`Failed to copy tournament: ${error.message}`, 'error');
    }
  };

  const handleSaveRoomDetails = async () => {
    if (roomModal) {
      await updateDoc(doc(db, 'tournaments', roomModal.id), {
        roomDetails: {
          id: roomModal.roomId,
          password: roomModal.password
        }
      });
      setRoomModal(null);
      showToast('Room details updated successfully!');
    }
  };

  const handleApproveDeposit = (tx: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Deposit',
      message: `Approve deposit of ${tx.amount} coins for ${tx.userEmail}?`,
      action: async () => {
        try {
          await setDoc(doc(db, 'transactions', tx.id), { status: 'completed' }, { merge: true });
          await setDoc(doc(db, 'users', tx.userId), { walletBalance: increment(Number(tx.amount)) }, { merge: true });
          showToast('Deposit approved successfully!');
          
          // Open Transaction Push Notification Modal
          setTxNotificationData({
            type: 'deposit',
            amount: tx.amount,
            userId: tx.userId,
            userEmail: tx.userEmail,
            title: 'Deposit Approved!',
            body: `Your Deposit of ${tx.amount} coins has Successfully Approved!`
          });
          setIsTxNotificationModalOpen(true);
        } catch (error) {
          console.error('Error approving deposit:', error);
          showToast('Failed to approve deposit.', 'error');
        }
      }
    });
  };

  const handleRejectDeposit = (tx: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reject Deposit',
      message: `Reject deposit of ${tx.amount} coins for ${tx.userEmail}?`,
      action: async () => {
        try {
          await setDoc(doc(db, 'transactions', tx.id), { status: 'rejected' }, { merge: true });
          showToast('Deposit rejected successfully!');
        } catch (error) {
          console.error('Error rejecting deposit:', error);
          showToast('Failed to reject deposit.', 'error');
        }
      }
    });
  };

  const handleApproveWithdrawal = (tx: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Withdrawal',
      message: `Approve withdrawal of ${tx.amount} coins for ${tx.userEmail}?`,
      action: async () => {
        try {
          await setDoc(doc(db, 'transactions', tx.id), { status: 'completed' }, { merge: true });
          showToast('Withdrawal approved successfully!');
          
          // Open Transaction Push Notification Modal
          setTxNotificationData({
            type: 'withdrawal',
            amount: tx.amount,
            userId: tx.userId,
            userEmail: tx.userEmail,
            title: 'Withdrawal Approved!',
            body: `Your Withdrawal of ${tx.amount} coins has Successfully Approved check Your Account !`
          });
          setIsTxNotificationModalOpen(true);
        } catch (error) {
          console.error('Error approving withdrawal:', error);
          showToast('Failed to approve withdrawal.', 'error');
        }
      }
    });
  };

  const handleRejectWithdrawal = (tx: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reject Withdrawal',
      message: `Reject withdrawal of ${tx.amount} coins for ${tx.userEmail}? This will refund the coins to the user.`,
      action: async () => {
        try {
          await setDoc(doc(db, 'transactions', tx.id), { status: 'rejected' }, { merge: true });
          await setDoc(doc(db, 'users', tx.userId), { walletBalance: increment(Number(tx.amount)) }, { merge: true });
          showToast('Withdrawal rejected and coins refunded successfully!');
        } catch (error) {
          console.error('Error rejecting withdrawal:', error);
          showToast('Failed to reject withdrawal.', 'error');
        }
      }
    });
  };

  const toggleAdminStatus = (userId: string, currentStatus: boolean) => {
    setConfirmModal({
      isOpen: true,
      title: currentStatus ? 'Remove Admin' : 'Grant Admin',
      message: `Are you sure you want to ${currentStatus ? 'remove' : 'grant'} admin rights for this user?`,
      action: async () => {
        const updateData: any = { isAdmin: !currentStatus };
        if (currentStatus) {
          updateData.permissions = {};
        }
        await updateDoc(doc(db, 'users', userId), updateData);
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, ...updateData });
        }
        showToast(`Admin rights ${currentStatus ? 'removed' : 'granted'} successfully!`);
      }
    });
  };

  const handleUpdateReferralReward = async () => {
    try {
      await setDoc(doc(db, 'settings', 'referral'), {
        referrerAmount: Number(newReferralSettings.referrerReward),
        refereeAmount: Number(newReferralSettings.refereeReward),
        enabled: newReferralSettings.enabled
      }, { merge: true });
      showToast('Referral settings updated successfully!');
    } catch (error) {
      console.error("Error updating referral settings:", error);
      showToast('Failed to update referral settings', 'error');
    }
  };

  const handleApproveReferral = (request: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Referral',
      message: `Approve referral? Referrer gets ${referralSettings.referrerReward}, Referee gets ${referralSettings.refereeReward}.`,
      action: async () => {
        try {
          await runTransaction(db, async (transaction) => {
            // 1. Update request status
            const requestRef = doc(db, 'referral_requests', request.id);
            transaction.update(requestRef, { status: 'approved', approvedAt: serverTimestamp() });

            // 2. Add coins to referrer
            const referrerRef = doc(db, 'users', request.referrerId);
            transaction.update(referrerRef, { 
              walletBalance: increment(referralSettings.referrerReward),
              referralEarnings: increment(referralSettings.referrerReward),
              referralCount: increment(1)
            });

            // 3. Add coins to referee
            const refereeRef = doc(db, 'users', request.refereeId);
            transaction.update(refereeRef, {
              walletBalance: increment(referralSettings.refereeReward)
            });

            // 4. Create transaction record for referrer
            const txRefReferrer = doc(collection(db, 'transactions'));
            transaction.set(txRefReferrer, {
              userId: request.referrerId,
              amount: referralSettings.referrerReward,
              type: 'Referral Bonus',
              status: 'completed',
              description: `Referral bonus for inviting ${request.refereeName}`,
              createdAt: serverTimestamp()
            });

            // 5. Create transaction record for referee
            const txRefReferee = doc(collection(db, 'transactions'));
            transaction.set(txRefReferee, {
              userId: request.refereeId,
              amount: referralSettings.refereeReward,
              type: 'Referral Bonus',
              status: 'completed',
              description: `Referral bonus for joining via ${users.find(u => u.id === request.referrerId)?.username || 'friend'}`,
              createdAt: serverTimestamp()
            });
          });
          showToast('Referral approved and rewards sent!');
        } catch (error) {
          console.error("Error approving referral:", error);
          showToast('Failed to approve referral', 'error');
        }
      }
    });
  };

  const handleRejectReferral = (request: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reject Referral',
      message: 'Are you sure you want to reject this referral request?',
      action: async () => {
        try {
          await updateDoc(doc(db, 'referral_requests', request.id), { status: 'rejected' });
          showToast('Referral request rejected.');
        } catch (error) {
          console.error("Error rejecting referral:", error);
          showToast('Failed to reject referral', 'error');
        }
      }
    });
  };

  const deposits = transactions.filter(t => t.type === 'Deposit');
  const filteredDeposits = deposits.filter(tx => {
    const txUser = users.find(u => u.id === tx.userId);
    const search = depositSearchTerm.toLowerCase();
    return (
      tx.userEmail?.toLowerCase().includes(search) ||
      txUser?.username?.toLowerCase().includes(search) ||
      txUser?.phoneNumber?.toLowerCase().includes(search) ||
      tx.amount?.toString().includes(search)
    );
  });
  const pendingDepositsList = filteredDeposits.filter(t => t.status === 'pending');
  const historyDepositsList = filteredDeposits.filter(t => t.status !== 'pending');

  const withdrawals = transactions.filter(t => t.type === 'Withdrawal');
  const filteredWithdrawals = withdrawals.filter(tx => {
    const txUser = users.find(u => u.id === tx.userId);
    const search = withdrawalSearchTerm.toLowerCase();
    return (
      tx.userEmail?.toLowerCase().includes(search) ||
      txUser?.username?.toLowerCase().includes(search) ||
      txUser?.phoneNumber?.toLowerCase().includes(search) ||
      tx.amount?.toString().includes(search)
    );
  });
  const pendingWithdrawalsList = filteredWithdrawals.filter(t => t.status === 'pending');
  const historyWithdrawalsList = filteredWithdrawals.filter(t => t.status !== 'pending');

  // Summary Stats Calculations
  const depositStats = {
    pendingCount: deposits.filter(t => t.status === 'pending').length,
    pendingAmount: deposits.filter(t => t.status === 'pending').reduce((acc, t) => acc + Number(t.amount || 0), 0),
    completedToday: deposits.filter(t => {
      if (t.status !== 'completed' || !t.createdAt) return false;
      const date = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.date);
      return date.toDateString() === new Date().toDateString();
    }).length,
    totalCompletedAmount: deposits.filter(t => t.status === 'completed').reduce((acc, t) => acc + Number(t.amount || 0), 0)
  };

  const withdrawalStats = {
    pendingCount: withdrawals.filter(t => t.status === 'pending').length,
    pendingAmount: withdrawals.filter(t => t.status === 'pending').reduce((acc, t) => acc + Number(t.amount || 0), 0),
    completedToday: withdrawals.filter(t => {
      if (t.status !== 'completed' || !t.createdAt) return false;
      const date = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.date);
      return date.toDateString() === new Date().toDateString();
    }).length,
    totalCompletedAmount: withdrawals.filter(t => t.status === 'completed').reduce((acc, t) => acc + Number(t.amount || 0), 0)
  };

  const pendingDeposits = deposits.filter(t => t.status === 'pending').length;
  const pendingWithdrawals = withdrawals.filter(t => t.status === 'pending').length;
  const totalPending = pendingDeposits + pendingWithdrawals;
  const pendingSupportTickets = supportTickets.filter(t => t.status === 'pending').length;

  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(u => !u.isBanned).length;
  const bannedUsersCount = users.filter(u => u.isBanned).length;
  const totalAdminsCount = users.filter(u => u.isAdmin).length;

  const totalCoins = users.reduce((acc, u) => acc + (u.walletBalance || 0), 0);
  const approvedCount = transactions.filter(t => t.status === 'completed').length;
  const rejectedCount = transactions.filter(t => t.status === 'rejected').length;
  const adminsCount = users.filter(u => u.isAdmin).length;

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.phoneNumber?.includes(searchTerm);
    const matchesStatus = userStatusFilter === 'All' || 
                         (userStatusFilter === 'Active' && !u.isBanned) || 
                         (userStatusFilter === 'Banned' && u.isBanned);
    const matchesRole = userRoleFilter === 'All' || 
                       (userRoleFilter === 'Admin' && u.isAdmin) || 
                       (userRoleFilter === 'Player' && !u.isAdmin);
    return matchesSearch && matchesStatus && matchesRole;
  });

  const filteredMenuItems = menuItems.map(item => {
    if (item.id === 'deposits') return { ...item, badge: pendingDeposits };
    if (item.id === 'withdrawals') return { ...item, badge: pendingWithdrawals };
    if (item.id === 'support') return { ...item, badge: pendingSupportTickets };
    if (item.id === 'referral') return { ...item, badge: referralRequests.filter(r => r.status === 'pending').length };
    if (item.id === 'results') return { ...item, badge: tournaments.filter(t => t.status === 'Result').length };
    return item;
  }).filter(item => hasPermission(item.id));

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
  }, [checkScroll, filteredMenuItems.length]);

  return (
    <div className="min-h-screen bg-[#0B1121] text-gray-300 font-sans flex flex-col absolute inset-0 z-[100]">
      
      {/* Top Navbar */}
      <nav className="bg-[#0B1121] border-b border-gray-800 px-4 py-3 sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-[1600px] mx-auto">
          <div className="flex items-center gap-6 flex-1 overflow-hidden">
            <div className="bg-yellow-400 text-black font-bold px-3 py-1.5 rounded text-sm tracking-widest shrink-0">GZ</div>
            
            <div className="relative flex-1 overflow-hidden flex items-center">
              {showLeftArrow && (
                <button 
                  onClick={() => scroll('left')}
                  className="absolute left-0 z-10 bg-gradient-to-r from-[#0B1121] via-[#0B1121] to-transparent p-2 text-gray-400 hover:text-white transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              <div 
                ref={navRef}
                className="hidden lg:flex items-center gap-2 overflow-x-auto whitespace-nowrap flex-1 pb-1 scrollbar-hide scroll-smooth"
              >
                {filteredMenuItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id)} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${activeTab === item.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                  >
                    {item.icon} {item.label}
                    {item.badge ? <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{item.badge}</span> : null}
                  </button>
                ))}
              </div>

              {showRightArrow && (
                <button 
                  onClick={() => scroll('right')}
                  className="absolute right-0 z-10 bg-gradient-to-l from-[#0B1121] via-[#0B1121] to-transparent p-2 text-gray-400 hover:text-white transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 ml-4">
            <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div className={`lg:hidden fixed top-[68px] left-0 w-full max-h-[calc(100vh-68px)] bg-[#1C1C1E] z-40 shadow-lg transform transition-transform duration-300 overflow-y-auto ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto p-2 flex flex-col">
          <nav>
            <ul>
              {filteredMenuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between p-2 rounded-md my-0.5 transition-colors ${
                      activeTab === item.id ? 'bg-gray-700/50 text-yellow-400' : 'text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className={activeTab === item.id ? 'text-yellow-400' : 'text-gray-400'}>{item.icon}</span>
                      <span className={`ml-2 text-sm ${activeTab === item.id ? 'text-yellow-400' : ''}`}>{item.label}</span>
                    </div>
                    {item.badge ? <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{item.badge}</span> : null}
                  </button>
                </li>
              ))}
              <li className="mt-1">
                <button onClick={() => navigate('/')} className="flex items-center p-2 text-red-500 hover:bg-gray-700/50 rounded-md w-full">
                  <LogOut size={18} />
                  <span className="ml-2 text-sm">Exit {currentUser?.isOwner ? 'Owner' : 'Admin'}</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {isSectionLoading && (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="relative flex items-center justify-center mb-4 w-14 h-14 md:w-16 md:h-16">
                <div className="absolute inset-0 border-[2px] border-yellow-500/10 rounded-full"></div>
                <div className="absolute inset-0 border-[3px] md:border-[4px] border-transparent border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
                <div className="absolute inset-2.5 md:inset-3 border-[2px] border-transparent border-b-yellow-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 m-auto w-2 h-2 md:w-2.5 md:h-2.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
              </div>
              <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-widest text-xs md:text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">Loading...</p>
            </div>
          )}
          
          <div style={{ display: isSectionLoading ? 'none' : 'block' }}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && hasPermission('dashboard') && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-yellow-500 mb-1">{currentUser?.isOwner ? 'Owner Dashboard' : 'Admin Dashboard'}</h1>
                <p className="text-gray-400 text-sm">Welcome back, {currentUser?.isOwner ? 'Owner' : 'Admin'}!</p>
              </div>

              {/* 4 Main Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0B1727] border border-blue-900/30 p-6 rounded-xl relative overflow-hidden">
                   <div className="flex justify-between items-start mb-4">
                     <div className="bg-blue-500/10 p-2.5 rounded-lg"><Users size={20} className="text-blue-400"/></div>
                     <ArrowUpRight size={16} className="text-gray-600"/>
                   </div>
                   <h3 className="text-3xl font-bold text-white mb-1">{users.length}</h3>
                   <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Users</p>
                </div>
                
                <div className="bg-[#1A1A1A] border border-gray-800 p-6 rounded-xl relative overflow-hidden">
                   <div className="flex justify-between items-start mb-4">
                     <div className="bg-yellow-500/10 p-2.5 rounded-lg"><Trophy size={20} className="text-yellow-500"/></div>
                     <ArrowUpRight size={16} className="text-gray-600"/>
                   </div>
                   <h3 className="text-3xl font-bold text-white mb-1">{tournaments.length}</h3>
                   <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Tournaments</p>
                </div>

                <div className="bg-[#2A1515] border border-red-900/30 p-6 rounded-xl relative overflow-hidden">
                   {totalPending > 0 && <span className="absolute top-4 right-4 bg-red-500/20 text-red-500 border border-red-500/30 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Action Needed</span>}
                   <div className="flex justify-between items-start mb-4">
                     <div className="bg-red-500/10 p-2.5 rounded-lg"><Clock size={20} className="text-red-400"/></div>
                   </div>
                   <h3 className="text-3xl font-bold text-white mb-1">{totalPending}</h3>
                   <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pending Payments</p>
                </div>

                <div className="bg-[#0B221B] border border-green-900/30 p-6 rounded-xl relative overflow-hidden">
                   <div className="flex justify-between items-start mb-4">
                     <div className="bg-green-500/10 p-2.5 rounded-lg"><DollarSign size={20} className="text-green-400"/></div>
                     <DollarSign size={16} className="text-gray-600"/>
                   </div>
                   <h3 className="text-3xl font-bold text-white mb-1">{totalCoins}</h3>
                   <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Coins in Circulation</p>
                </div>
              </div>

              {/* Secondary Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
                  <Users size={16} className="mx-auto text-gray-400 mb-2" />
                  <h4 className="text-xl font-bold text-white mb-1">{adminsCount}</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Admins</p>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
                  <Trophy size={16} className="mx-auto text-blue-400 mb-2" />
                  <h4 className="text-xl font-bold text-white mb-1">{tournaments.length}</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Total Tournaments</p>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
                  <CheckCircle2 size={16} className="mx-auto text-green-400 mb-2" />
                  <h4 className="text-xl font-bold text-white mb-1">0</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Completed</p>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
                  <DollarSign size={16} className="mx-auto text-green-400 mb-2" />
                  <h4 className="text-xl font-bold text-white mb-1">{approvedCount}</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Approved</p>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
                  <XCircle size={16} className="mx-auto text-red-400 mb-2" />
                  <h4 className="text-xl font-bold text-white mb-1">{rejectedCount}</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Rejected</p>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-4 rounded-xl text-center">
                  <MessageSquare size={16} className="mx-auto text-purple-400 mb-2" />
                  <h4 className="text-xl font-bold text-white mb-1">{pendingSupportTickets}</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Support</p>
                </div>
              </div>

              {/* Bottom Section: Quick Actions & Recent Users */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Quick Actions */}
                <div>
                  <h3 className="font-bold text-yellow-500 mb-4 flex items-center gap-2"><LayoutDashboard size={18}/> Quick Actions</h3>
                  <div className="space-y-3">
                    {hasPermission('users') && (
                      <button onClick={() => setActiveTab('users')} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
                        <span className="flex items-center gap-3"><Users size={20}/> Manage Users</span>
                      </button>
                    )}
                    {hasPermission('admin-control') && (
                      <button onClick={() => setActiveTab('admin-control')} className="w-full bg-red-600 hover:bg-red-500 text-white p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
                        <span className="flex items-center gap-3"><Shield size={20}/> Admin Control</span>
                      </button>
                    )}
                    {hasPermission('deposits') && (
                      <button onClick={() => setActiveTab('deposits')} className="w-full bg-green-600 hover:bg-green-500 text-white p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
                        <span className="flex items-center gap-3"><DollarSign size={20}/> Review Payments</span>
                        {pendingDeposits > 0 && <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full">{pendingDeposits}</span>}
                      </button>
                    )}
                    {hasPermission('tournaments') && (
                      <button onClick={() => setActiveTab('tournaments')} className="w-full bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
                        <span className="flex items-center gap-3"><Trophy size={20}/> Manage Tournaments</span>
                      </button>
                    )}
                    {hasPermission('results') && (
                      <button onClick={() => setActiveTab('results')} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
                        <span className="flex items-center gap-3"><Award size={20}/> Add Results</span>
                      </button>
                    )}
                    {hasPermission('withdrawals') && (
                      <button onClick={() => setActiveTab('withdrawals')} className="w-full bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-xl flex justify-between items-center font-bold transition-colors">
                        <span className="flex items-center gap-3"><ArrowDownUp size={20}/> Withdrawals</span>
                        {pendingWithdrawals > 0 && <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full">{pendingWithdrawals}</span>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Recent Users */}
                <div>
                  <h3 className="font-bold text-yellow-500 mb-4 flex items-center gap-2"><Users size={18}/> Recent Users</h3>
                  <div className="bg-[#131B2F] border border-gray-800 rounded-xl p-2 space-y-1">
                    {users.slice(0, 5).map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-[#0B1121] rounded-lg border border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20">
                            {u.email ? u.email[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{u.username || 'User'}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="bg-blue-900/30 text-blue-400 text-[10px] px-2 py-1 rounded uppercase font-bold tracking-wider">{u.isAdmin ? 'Admin' : 'User'}</span>
                          <p className="text-[10px] text-gray-600 mt-1.5 font-medium">{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-center text-gray-500 text-sm py-4">No users found.</p>}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* Admin Control Tab */}
          {activeTab === 'admin-control' && hasPermission('admin-control') && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-2xl font-bold text-red-500">Admin Control</h2>
              <AdminControl users={users} currentUser={currentUser} />
            </motion.div>
          )}

          {/* Tournaments Tab */}
          {activeTab === 'tournaments' && hasPermission('tournaments') && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-yellow-500">Manage Tournaments</h2>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-yellow-500 text-black px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                >
                  <Plus size={18} /> Create New
                </button>
              </div>
              
              <div className="grid gap-4">
                {tournaments.filter(t => t.status !== 'Result').length === 0 && (
                  <div className="text-center py-20 bg-[#131B2F] rounded-3xl border border-dashed border-gray-800">
                    <div className="w-20 h-20 bg-gray-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="text-gray-600" size={40} />
                    </div>
                    <h3 className="text-white font-bold text-lg">No Active Tournaments</h3>
                    <p className="text-gray-500 mt-2">Click "Create New" to add a tournament.</p>
                  </div>
                )}
                {tournaments.filter(t => t.status !== 'Result').map(t => (
                  <div key={t.id} className="bg-[#131B2F] border border-gray-800 p-4 md:p-6 rounded-2xl hover:border-yellow-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${t.status === 'Upcoming' ? 'bg-blue-500/20 text-blue-400' : t.status === 'Result' ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                            {t.status}
                          </span>
                          <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight group-hover:text-yellow-400 transition-colors">{t.name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-gray-400">
                          <span className="flex items-center gap-1.5 bg-[#0B1121] px-2 py-1 rounded-lg border border-gray-800/50"><Trophy size={11} className="text-yellow-500"/> {t.gameType}</span>
                          <span className="flex items-center gap-1.5 bg-[#0B1121] px-2 py-1 rounded-lg border border-gray-800/50"><Users size={11} className="text-purple-500"/> {t.mode}</span>
                          <span className="flex items-center gap-1.5 bg-[#0B1121] px-2 py-1 rounded-lg border border-gray-800/50"><Coins size={11} className="text-yellow-500"/> {t.entryFee} Coins</span>
                          <span className="flex items-center gap-1.5 bg-[#0B1121] px-2 py-1 rounded-lg border border-gray-800/50"><Users size={11} className="text-blue-500"/> Slots: {t.participants || 0}/{t.totalSlots || 48}</span>
                          <span className="flex items-center gap-1.5 bg-[#0B1121] px-2 py-1 rounded-lg border border-gray-800/50 w-full md:w-auto"><Clock size={11} className="text-orange-500"/> {formatDate(t.time)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                        <button onClick={() => setRoomModal({ id: t.id, roomId: t.roomDetails?.id || '', password: t.roomDetails?.password || '' })} className="flex-1 lg:flex-none bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                          <Shield size={14} /> Room Info
                        </button>
                        <button onClick={() => fetchPlayers(t)} className="flex-1 lg:flex-none bg-purple-600/10 text-purple-400 border border-purple-600/20 hover:bg-purple-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                          <Eye size={14} /> View Slots
                        </button>
                        {t.status !== 'Result' && (
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Set to Result',
                                message: 'Are you sure you want to set this tournament to Result status? This will allow you to add kills and winners.',
                                action: async () => {
                                  await updateDoc(doc(db, 'tournaments', t.id), { status: 'Result' });
                                  showToast('Tournament set to Result status!');
                                }
                              });
                            }}
                            className="flex-1 lg:flex-none bg-green-600/10 text-green-400 border border-green-600/20 hover:bg-green-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={14} /> Set Result
                          </button>
                        )}
                        <button onClick={() => setEditingTournament(t)} className="flex-none bg-blue-600/10 text-blue-500 border border-blue-600/20 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-xl transition-all flex items-center justify-center">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteTournament(t.id)} className="flex-none bg-red-600/10 text-red-500 border border-red-600/20 hover:bg-red-600 hover:text-white px-3 py-2 rounded-xl transition-all flex items-center justify-center">
                          <Trash2 size={16} />
                        </button>
                        <button onClick={() => handleCopyTournament(t)} className="flex-none bg-blue-600/10 text-blue-500 border border-blue-600/20 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-xl transition-all flex items-center justify-center" title="Copy Tournament">
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Players List Removed from here and moved to Modal */}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Deposits Tab */}
          {activeTab === 'deposits' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <DollarSign className="text-yellow-500" size={24} />
                    </div>
                    Deposit Requests
                  </h2>
                  <p className="text-gray-500 text-sm mt-1 ml-12">Review and manage user deposit transactions.</p>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Clock size={40} className="text-yellow-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Requests</p>
                  <h3 className="text-2xl font-black text-white">{depositStats.pendingCount}</h3>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-yellow-500/80">
                    <div className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse" />
                    Awaiting Review
                  </div>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Coins size={40} className="text-blue-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Amount</p>
                  <h3 className="text-2xl font-black text-white">{depositStats.pendingAmount.toLocaleString()} <span className="text-xs text-gray-500 font-medium">Coins</span></h3>
                  <div className="mt-2 text-[10px] font-bold text-blue-500/80">
                    Estimated Volume
                  </div>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Approved Today</p>
                  <h3 className="text-2xl font-black text-white">{depositStats.completedToday}</h3>
                  <div className="mt-2 text-[10px] font-bold text-green-500/80">
                    Successfully Processed
                  </div>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Award size={40} className="text-purple-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Volume</p>
                  <h3 className="text-2xl font-black text-white">{depositStats.totalCompletedAmount.toLocaleString()} <span className="text-xs text-gray-500 font-medium">Coins</span></h3>
                  <div className="mt-2 text-[10px] font-bold text-purple-500/80">
                    Lifetime Deposits
                  </div>
                </div>
              </div>

              {/* Deposit Settings */}
              <div className="bg-[#131B2F] border border-gray-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Settings className="text-blue-500" size={20} />
                    Deposit Settings
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">Configure the minimum allowed deposit amount</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="number"
                      min="1"
                      value={minDepositLimit}
                      onChange={(e) => setMinDepositLimit(Number(e.target.value))}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Min Limit"
                    />
                  </div>
                  <button
                    onClick={handleUpdateDepositLimit}
                    disabled={isUpdatingDepositLimit}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {isUpdatingDepositLimit ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    Save Limit
                  </button>
                </div>
              </div>

              {/* Sub Tabs and Search */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex p-1 bg-[#0B1121] rounded-xl w-fit border border-gray-800/50">
                  <button 
                    onClick={() => setDepositSubTab('pending')}
                    className={`px-8 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${depositSubTab === 'pending' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Pending
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${depositSubTab === 'pending' ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'}`}>
                      {pendingDepositsList.length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setDepositSubTab('history')}
                    className={`px-8 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${depositSubTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    History
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${depositSubTab === 'history' ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'}`}>
                      {historyDepositsList.length}
                    </span>
                  </button>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by email, username, or phone..." 
                    value={depositSearchTerm}
                    onChange={(e) => setDepositSearchTerm(e.target.value)}
                    className="w-full bg-[#131B2F] border border-gray-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 gap-4">
                {depositSubTab === 'pending' ? (
                  <>
                    {pendingDepositsList.map(tx => {
                      const txUser = users.find(u => u.id === tx.userId);
                      const timeAgo = tx.createdAt?.toDate ? 
                        Math.floor((new Date().getTime() - tx.createdAt.toDate().getTime()) / (1000 * 60)) : 0;
                      
                      return (
                        <div key={tx.id} className="group bg-[#131B2F] border border-gray-800/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                            {/* User Info Section */}
                            <div className="flex items-center gap-5 min-w-[280px]">
                              <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center font-bold text-white text-xl shadow-inner transform group-hover:rotate-3 transition-transform">
                                  {txUser?.username?.[0]?.toUpperCase() || tx.userEmail?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-[#131B2F] rounded-full" />
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-lg leading-tight group-hover:text-blue-400 transition-colors">{txUser?.username || 'Unknown User'}</h4>
                                <p className="text-gray-500 text-xs mt-1 font-medium">{tx.userEmail}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 uppercase tracking-tighter">
                                    {txUser?.phoneNumber || 'No Phone'}
                                  </span>
                                  {timeAgo > 0 && (
                                    <span className="text-[10px] font-bold text-yellow-500/70 flex items-center gap-1">
                                      <Clock size={10} /> {timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo/60)}h ago`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Transaction Details */}
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-8 py-4 lg:py-0 border-y lg:border-y-0 border-gray-800/50 w-full">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</p>
                                <p className="text-2xl font-black text-yellow-500 flex items-center gap-2">
                                  <Coins size={20} /> {tx.amount}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Method</p>
                                <p className="text-sm font-bold text-white bg-[#0B1121] px-3 py-1.5 rounded-xl border border-gray-800 inline-block">
                                  {tx.paymentMethod}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</p>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                  {tx.status}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Requested On</p>
                                <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                  {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : tx.date}
                                  <br />
                                  <span className="text-[10px] text-gray-600">
                                    {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-44 shrink-0">
                              {tx.proofUrl && (
                                <button 
                                  onClick={() => setSelectedProofImage(tx.proofUrl)} 
                                  className="flex-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/20 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all group/btn"
                                >
                                  <Eye size={16} className="group-hover/btn:scale-110 transition-transform" /> View Proof
                                </button>
                              )}
                              <div className="flex gap-2 flex-1">
                                <button 
                                  onClick={() => handleApproveDeposit(tx)} 
                                  className="flex-1 bg-green-600 hover:bg-green-500 text-white px-3 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-green-900/10 hover:scale-[1.02] active:scale-95"
                                >
                                  <Check size={16} /> Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectDeposit(tx)} 
                                  className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-900/10 hover:scale-[1.02] active:scale-95"
                                >
                                  <X size={16} /> Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )})}
                    {pendingDepositsList.length === 0 && (
                      <div className="text-center py-20 bg-[#131B2F] rounded-3xl border border-dashed border-gray-800">
                        <div className="w-20 h-20 bg-gray-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <DollarSign className="text-gray-600" size={40} />
                        </div>
                        <h3 className="text-white font-bold text-lg">All caught up!</h3>
                        <p className="text-gray-500 text-sm mt-1">No pending deposit requests to review.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {historyDepositsList.map(tx => {
                      const txUser = users.find(u => u.id === tx.userId);
                      return (
                        <div key={tx.id} className="bg-[#131B2F]/50 border border-gray-800/50 p-5 rounded-2xl flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between opacity-90 hover:opacity-100 transition-all hover:bg-[#131B2F]">
                          <div className="flex items-center gap-4 min-w-[200px]">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${tx.status === 'completed' ? 'bg-green-600' : 'bg-red-600'}`}>
                              {txUser?.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm">{txUser?.username || 'Unknown User'}</p>
                              <p className="text-gray-500 text-[10px] font-medium">{tx.userEmail}</p>
                            </div>
                          </div>

                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Amount</p>
                              <p className="text-sm font-bold text-white">{tx.amount} Coins</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Method</p>
                              <p className="text-sm text-gray-400">{tx.paymentMethod}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Status</p>
                              <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${tx.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                {tx.status === 'completed' ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {tx.status}
                              </span>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Date</p>
                              <p className="text-[10px] text-gray-500">{tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : tx.date}</p>
                            </div>
                          </div>
                          
                          {tx.proofUrl && (
                            <button onClick={() => setSelectedProofImage(tx.proofUrl)} className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-400/10 transition-colors">
                              <Eye size={18} />
                            </button>
                          )}
                        </div>
                      )})}
                    {historyDepositsList.length === 0 && (
                      <div className="text-center py-16 bg-[#131B2F] rounded-2xl border border-gray-800">
                        <p className="text-gray-500 font-medium">No deposit history found.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <ArrowDownUp className="text-purple-500" size={24} />
                    </div>
                    Withdrawal Requests
                  </h2>
                  <p className="text-gray-500 text-sm mt-1 ml-12">Review and process user withdrawal payouts.</p>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Clock size={40} className="text-purple-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Payouts</p>
                  <h3 className="text-2xl font-black text-white">{withdrawalStats.pendingCount}</h3>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-purple-500/80">
                    <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                    Awaiting Processing
                  </div>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Coins size={40} className="text-red-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Amount</p>
                  <h3 className="text-2xl font-black text-white">{withdrawalStats.pendingAmount.toLocaleString()} <span className="text-xs text-gray-500 font-medium">Coins</span></h3>
                  <div className="mt-2 text-[10px] font-bold text-red-500/80">
                    Total Liability
                  </div>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Paid Today</p>
                  <h3 className="text-2xl font-black text-white">{withdrawalStats.completedToday}</h3>
                  <div className="mt-2 text-[10px] font-bold text-green-500/80">
                    Processed Successfully
                  </div>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Award size={40} className="text-blue-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Paid Out</p>
                  <h3 className="text-2xl font-black text-white">{withdrawalStats.totalCompletedAmount.toLocaleString()} <span className="text-xs text-gray-500 font-medium">Coins</span></h3>
                  <div className="mt-2 text-[10px] font-bold text-blue-500/80">
                    Lifetime Payouts
                  </div>
                </div>
              </div>

              {/* Withdrawal Settings */}
              <div className="bg-[#131B2F] border border-gray-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Settings className="text-purple-500" size={20} />
                    Withdrawal Settings
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">Configure the minimum allowed withdrawal amount</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="number"
                      min="1"
                      value={minWithdrawalLimit}
                      onChange={(e) => setMinWithdrawalLimit(Number(e.target.value))}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="Min Limit"
                    />
                  </div>
                  <button
                    onClick={handleUpdateWithdrawalLimit}
                    disabled={isUpdatingWithdrawalLimit}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {isUpdatingWithdrawalLimit ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    Save Limit
                  </button>
                </div>
              </div>

              {/* Sub Tabs and Search */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex p-1 bg-[#0B1121] rounded-xl w-fit border border-gray-800/50">
                  <button 
                    onClick={() => setWithdrawalSubTab('pending')}
                    className={`px-8 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${withdrawalSubTab === 'pending' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Pending
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${withdrawalSubTab === 'pending' ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'}`}>
                      {pendingWithdrawalsList.length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setWithdrawalSubTab('history')}
                    className={`px-8 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${withdrawalSubTab === 'history' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    History
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${withdrawalSubTab === 'history' ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'}`}>
                      {historyWithdrawalsList.length}
                    </span>
                  </button>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by email, username, or phone..." 
                    value={withdrawalSearchTerm}
                    onChange={(e) => setWithdrawalSearchTerm(e.target.value)}
                    className="w-full bg-[#131B2F] border border-gray-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 gap-4">
                {withdrawalSubTab === 'pending' ? (
                  <>
                    {pendingWithdrawalsList.map(tx => {
                      const txUser = users.find(u => u.id === tx.userId);
                      const timeAgo = tx.createdAt?.toDate ? 
                        Math.floor((new Date().getTime() - tx.createdAt.toDate().getTime()) / (1000 * 60)) : 0;

                      return (
                        <div key={tx.id} className="group bg-[#131B2F] border border-gray-800/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-purple-900/5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                            {/* User Info Section */}
                            <div className="flex items-center gap-5 min-w-[280px]">
                              <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-bold text-white text-xl shadow-inner transform group-hover:rotate-3 transition-transform">
                                  {txUser?.username?.[0]?.toUpperCase() || tx.userEmail?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 border-2 border-[#131B2F] rounded-full" />
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-lg leading-tight group-hover:text-purple-400 transition-colors">{txUser?.username || 'Unknown User'}</h4>
                                <p className="text-gray-500 text-xs mt-1 font-medium">{tx.userEmail}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 uppercase tracking-tighter">
                                    {txUser?.phoneNumber || 'No Phone'}
                                  </span>
                                  {timeAgo > 0 && (
                                    <span className="text-[10px] font-bold text-yellow-500/70 flex items-center gap-1">
                                      <Clock size={10} /> {timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo/60)}h ago`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Transaction Details */}
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-8 py-4 lg:py-0 border-y lg:border-y-0 border-gray-800/50 w-full">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Method</p>
                                <p className="text-sm font-bold text-white bg-[#0B1121] px-3 py-1.5 rounded-xl border border-gray-800 inline-block">
                                  {tx.paymentMethod}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Number</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-mono text-white bg-[#0B1121] px-3 py-1.5 rounded-xl border border-gray-800 inline-block group-hover:border-purple-500/30 transition-colors">
                                    {tx.accountNumber}
                                  </p>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(tx.accountNumber);
                                      showToast('Account number copied!');
                                    }}
                                    className="p-2 text-gray-500 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-all"
                                    title="Copy Account Number"
                                  >
                                    <Plus size={14} className="rotate-45" />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Holder</p>
                                <p className="text-sm font-bold text-white bg-[#0B1121] px-3 py-1.5 rounded-xl border border-gray-800 inline-block">
                                  {tx.accountName || 'N/A'}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</p>
                                <p className="text-2xl font-black text-purple-400 flex items-center gap-2">
                                  <Coins size={20} /> {tx.amount}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-44 shrink-0">
                              <div className="flex gap-2 flex-1">
                                <button 
                                  onClick={() => handleApproveWithdrawal(tx)} 
                                  className="flex-1 bg-green-600 hover:bg-green-500 text-white px-3 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-green-900/10 hover:scale-[1.02] active:scale-95"
                                >
                                  <Check size={16} /> Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectWithdrawal(tx)} 
                                  className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-900/10 hover:scale-[1.02] active:scale-95"
                                >
                                  <X size={16} /> Reject
                                </button>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest leading-none">{tx.date}</p>
                                <p className="text-[8px] text-gray-700 mt-1 uppercase tracking-tighter">Ref: {tx.id.slice(-8)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )})}
                    {pendingWithdrawalsList.length === 0 && (
                      <div className="text-center py-20 bg-[#131B2F] rounded-3xl border border-dashed border-gray-800">
                        <div className="w-20 h-20 bg-gray-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ArrowDownUp className="text-gray-600" size={40} />
                        </div>
                        <h3 className="text-white font-bold text-lg">No withdrawals pending</h3>
                        <p className="text-gray-500 text-sm mt-1">All payout requests have been processed.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {historyWithdrawalsList.map(tx => {
                      const txUser = users.find(u => u.id === tx.userId);
                      return (
                        <div key={tx.id} className="bg-[#131B2F]/50 border border-gray-800/50 p-5 rounded-2xl flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between opacity-90 hover:opacity-100 transition-all hover:bg-[#131B2F]">
                          <div className="flex items-center gap-4 min-w-[200px]">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${tx.status === 'completed' ? 'bg-green-600' : 'bg-red-600'}`}>
                              {txUser?.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm">{txUser?.username || 'Unknown User'}</p>
                              <p className="text-gray-500 text-[10px] font-medium">{tx.userEmail}</p>
                            </div>
                          </div>

                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-6 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Method</p>
                              <p className="text-sm text-gray-400">{tx.paymentMethod}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Account Number</p>
                              <p className="text-sm font-mono text-gray-400">{tx.accountNumber}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Account Holder</p>
                              <p className="text-sm text-gray-400">{tx.accountName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Amount</p>
                              <p className="text-sm font-bold text-white">{tx.amount} Coins</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Status</p>
                              <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${tx.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                {tx.status === 'completed' ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {tx.status}
                              </span>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Date</p>
                              <p className="text-[10px] text-gray-500">{tx.date}</p>
                            </div>
                          </div>
                        </div>
                      )})}
                    {historyWithdrawalsList.length === 0 && (
                      <div className="text-center py-16 bg-[#131B2F] rounded-2xl border border-gray-800">
                        <p className="text-gray-500 font-medium">No withdrawal history found.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Users</h2>
                <button className="bg-[#A855F7] hover:bg-[#9333EA] text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20 text-xs uppercase tracking-wider">
                  <Eye size={16} /> User View
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: totalUsersCount, icon: <Users size={24} />, color: 'blue' },
                  { label: 'Active', value: activeUsersCount, icon: <CheckCircle2 size={24} />, color: 'green' },
                  { label: 'Banned', value: bannedUsersCount, icon: <Ban size={24} />, color: 'red' },
                  { label: 'Total Admins', value: totalAdminsCount, icon: <Shield size={24} />, color: 'purple' }
                ].map((stat, i) => (
                  <div key={i} className="bg-[#131B2F] border border-gray-800/50 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-black text-white">{stat.value}</h3>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative ${
                        stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                        stat.color === 'green' ? 'bg-green-500/10 text-green-500' :
                        stat.color === 'red' ? 'bg-red-500/10 text-red-500' :
                        'bg-purple-500/10 text-purple-500'
                      }`}>
                        {/* Glow effect behind icon */}
                        <div className={`absolute inset-0 blur-xl opacity-20 ${
                          stat.color === 'blue' ? 'bg-blue-500' :
                          stat.color === 'green' ? 'bg-green-500' :
                          stat.color === 'red' ? 'bg-red-500' :
                          'bg-purple-500'
                        }`} />
                        {stat.icon}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search and Filters */}
              <div className="bg-[#131B2F] border border-gray-800/50 p-6 rounded-3xl space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by name, email, or phone..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <select 
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl px-4 py-3 text-white text-sm font-bold appearance-none focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="All">Status: All</option>
                      <option value="Active">Status: Active</option>
                      <option value="Banned">Status: Banned</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <ArrowDownUp size={14} />
                    </div>
                  </div>
                  <div className="relative">
                    <select 
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl px-4 py-3 text-white text-sm font-bold appearance-none focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="All">Role: All</option>
                      <option value="Admin">Role: Admin</option>
                      <option value="Player">Role: Player</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <ArrowDownUp size={14} />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* User List */}
              <div className="grid grid-cols-1 gap-4">
                {filteredUsers.map(u => (
                  <motion.div 
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#131B2F] border border-gray-800/50 rounded-2xl p-4 relative overflow-hidden group flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    {/* Left Stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${u.isBanned ? 'bg-red-500' : 'bg-green-500'}`} />
                    
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-12 h-12 rounded-full bg-black border border-gray-800 flex items-center justify-center overflow-hidden shadow-lg">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User size={24} className="text-gray-600" />
                        )}
                      </div>
                      {u.isAdmin && (
                        <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-1 rounded-full border-2 border-[#131B2F]">
                          <Shield size={10} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-black text-white truncate">{u.username || 'Anonymous'}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          u.isBanned ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                        }`}>
                          {u.isBanned ? 'Banned' : 'Active'}
                        </span>
                        {u.isAdmin && (
                          <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Shield size={10} /> Admin
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-gray-400 text-xs font-medium truncate">{u.email}</p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold">
                          <span className="flex items-center gap-1">
                            <Phone size={10} /> {u.phoneNumber || 'No Phone'}
                          </span>
                          <span className="text-purple-500/70">{u.id.substring(0, 6).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Wallet */}
                    <div className="flex flex-wrap gap-1.5">
                      <div className="bg-[#0B1121] px-2 py-1.5 rounded-lg border border-gray-800/50 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Coins size={10} className="text-blue-400" />
                          <span className="text-[10px] font-black text-white">{u.walletBalance || 0}</span>
                        </div>
                        <div className="w-px h-2.5 bg-gray-800" />
                        <div className="flex items-center gap-1">
                          <Star size={10} className="text-yellow-400" />
                          <span className="text-[10px] font-black text-white">{u.bonusBalance || 0}</span>
                        </div>
                      </div>
                      <div className="bg-[#0B1121] px-2 py-1.5 rounded-lg border border-gray-800/50 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Crosshair size={10} className="text-red-500" />
                          <span className="text-[10px] font-black text-white">{u.totalKills || 0}</span>
                        </div>
                        <div className="w-px h-2.5 bg-gray-800" />
                        <div className="flex items-center gap-1">
                          <Trophy size={10} className="text-blue-500" />
                          <span className="text-[10px] font-black text-white">{u.totalWins || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => {
                          setSelectedUser(u);
                          setBanReasonInput(u.banReason || '');
                        }}
                        className="flex-1 sm:flex-none bg-[#1E293B] hover:bg-[#334155] text-white px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-all text-[9px] uppercase tracking-wider border border-gray-700"
                      >
                        <Eye size={12} /> Details
                      </button>
                      <button 
                        onClick={() => {
                          setIsEditingUser(true);
                          setEditUserData({ ...u });
                          setSelectedUser(u);
                          setBanReasonInput(u.banReason || '');
                        }}
                        className="flex-1 sm:flex-none bg-transparent hover:bg-white/5 text-white px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-all text-[9px] uppercase tracking-wider border border-white/20"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-20 bg-[#131B2F] rounded-3xl border border-gray-800">
                  <Users size={48} className="mx-auto text-gray-700 mb-4 opacity-20" />
                  <p className="text-gray-500 font-bold">No users found matching your search.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-yellow-500">Tournament Results</h2>
              </div>
              
              <div className="flex gap-2 bg-[#131B2F] p-1.5 rounded-xl border border-gray-800 w-fit">
                <button 
                  onClick={() => setResultsTab('pending')}
                  className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${resultsTab === 'pending' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                >
                  Pending
                </button>
                <button 
                  onClick={() => setResultsTab('added')}
                  className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${resultsTab === 'added' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                >
                  Added
                </button>
                <button 
                  onClick={() => setResultsTab('history')}
                  className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${resultsTab === 'history' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                >
                  History
                </button>
              </div>

              {resultsTab === 'pending' && (
                <div className="grid gap-4">
                {tournaments.filter(t => t.status === 'Result').map(t => (
                  <motion.div 
                    key={t.id} 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-[#131B2F] to-[#0B1121] border border-gray-800 p-6 rounded-3xl shadow-2xl hover:border-yellow-500/30 transition-all group"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform duration-300">
                          <Trophy size={28} className="text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-white tracking-tight uppercase drop-shadow-md">{t.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-2.5 py-1 rounded-md border border-yellow-500/20">{t.gameType}</span>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">{t.mode}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Mark as Completed',
                              message: `Are you sure you want to mark ${t.name} as completed? This will remove it from the Pending tab.`,
                              action: async () => {
                                try {
                                  await updateDoc(doc(db, 'tournaments', t.id), { status: 'Completed' });
                                  showToast(`${t.name} marked as completed.`);
                                  setViewingResults(null);
                                } catch (error) {
                                  console.error('Error completing tournament:', error);
                                  showToast('Failed to complete tournament', 'error');
                                }
                              }
                            });
                          }}
                          disabled={isModalProcessing || isEditingResultProcessing}
                          className="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-50"
                        >
                          <CheckCircle2 size={16} /> Mark as Completed
                        </button>
                        <button 
                          onClick={() => {
                            if (viewingResults === t.id) setViewingResults(null);
                            else {
                              const q = query(collection(db, 'registrations'), where('tournamentId', '==', t.id));
                              onSnapshot(q, (snapshot) => {
                                setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                                setViewingResults(t.id);
                              });
                            }
                          }}
                          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${viewingResults === t.id ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] hover:-translate-y-0.5'}`}
                        >
                          {viewingResults === t.id ? <EyeOff size={16} /> : <Plus size={16} />}
                          {viewingResults === t.id ? 'Hide Players' : 'Add Results'}
                        </button>
                      </div>
                    </div>

                    {viewingResults === t.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-6 pt-6 border-t border-gray-800/50"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {registrations.filter(reg => !reg.resultSubmitted && !reg.won).map(reg => {
                            const user = users.find(u => u.id === reg.userId);
                            return (
                            <div key={reg.id} className={`bg-[#0A0F1C] p-5 rounded-2xl text-sm border transition-all duration-300 shadow-xl relative overflow-hidden group/card ${reg.won ? 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.1)]' : 'border-gray-800 hover:border-gray-700'}`}>
                              {reg.won && (
                                <>
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/20 to-transparent rounded-bl-full pointer-events-none" />
                                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 blur-3xl rounded-full pointer-events-none" />
                                </>
                              )}
                              
                              <div className="space-y-4 relative z-10">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${reg.won ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                      {(user?.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-bold text-white text-base truncate max-w-[120px] tracking-tight">{user?.username || 'Unknown'}</p>
                                    </div>
                                  </div>
                                  <div className={`flex flex-col items-end ${reg.won ? 'text-green-400' : 'text-gray-500'}`}>
                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest mb-1 shadow-sm ${reg.won ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-gray-800/80 border border-gray-700 text-gray-400'}`}>
                                      {reg.won ? 'Winner' : 'Participant'}
                                    </span>
                                    {reg.won && <span className="text-[11px] font-black tracking-wider text-green-400 drop-shadow-sm">+{reg.winningAmount} Coins</span>}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 bg-[#131B2F]/50 p-3 rounded-xl border border-gray-800/50">
                                  <div>
                                    <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5 flex items-center gap-1"><Phone size={10}/> Phone</p>
                                    <p className="text-gray-300 text-[11px] truncate font-medium">{reg.phoneNumber}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5 flex items-center gap-1"><Mail size={10}/> Email</p>
                                    <p className="text-gray-300 text-[11px] truncate font-medium">{reg.email}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5 flex items-center gap-1"><User size={10}/> IGN Name</p>
                                    <p className="text-gray-300 text-[11px] truncate font-medium">{reg.freeFireName}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5 flex items-center gap-1"><Gamepad2 size={10}/> UID</p>
                                    <p className="text-gray-300 text-[11px] truncate font-medium">{reg.freeFireId}</p>
                                  </div>
                                </div>

                                <div className="pt-4 border-t border-gray-800/50 space-y-4">
                                  {/* Stats Inputs Grid */}
                                  <div className="grid grid-cols-2 gap-3">
                                    {/* Kills Input */}
                                    <div className="flex items-center justify-between bg-[#131B2F] p-2.5 rounded-xl border border-gray-800 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                                      <label className="text-[10px] text-gray-400 uppercase font-black flex items-center gap-1.5 tracking-wider">
                                        <Crosshair size={14} className="text-blue-400" /> Kills
                                      </label>
                                      <input 
                                        type="number" 
                                        placeholder={reg.kills?.toString() || "0"}
                                        value={killsAmounts[reg.id] !== undefined ? killsAmounts[reg.id] : (reg.kills || '')}
                                        onChange={(e) => setKillsAmounts({...killsAmounts, [reg.id]: e.target.value})}
                                        className="w-14 bg-[#0A0F1C] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs text-right focus:border-blue-500 outline-none transition-colors font-mono font-bold"
                                      />
                                    </div>

                                    {/* Win Toggle */}
                                    <div className="flex items-center justify-between bg-[#131B2F] p-2.5 rounded-xl border border-gray-800 transition-all">
                                      <label className="text-[10px] text-gray-400 uppercase font-black flex items-center gap-1.5 tracking-wider">
                                        <Trophy size={14} className={winStatus[reg.id] ? "text-yellow-500" : "text-gray-500"} /> Win Match
                                      </label>
                                      <button
                                        onClick={() => setWinStatus(prev => ({ ...prev, [reg.id]: !prev[reg.id] }))}
                                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${winStatus[reg.id] ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-gray-700'}`}
                                      >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${winStatus[reg.id] ? 'left-7' : 'left-1'}`} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Winning Amount & Submit/Revert */}
                                  <div className="space-y-2.5 bg-[#131B2F]/30 p-3 rounded-xl border border-gray-800/50">
                                    <label className="block text-[10px] text-gray-400 uppercase font-black flex items-center gap-1.5 tracking-wider">
                                      <Coins size={14} className="text-yellow-500" /> Winning Amount
                                    </label>
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                        <input 
                                          type="number" 
                                          placeholder="0"
                                          value={winningAmounts[reg.id] || ''}
                                          onChange={(e) => setWinningAmounts({...winningAmounts, [reg.id]: e.target.value})}
                                          className="w-full bg-[#0A0F1C] border border-gray-700 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 outline-none transition-all font-mono font-bold"
                                        />
                                      </div>
                                      <button 
                                        onClick={async () => {
                                          const amount = parseInt(winningAmounts[reg.id]) || 0;
                                          const isWin = winStatus[reg.id] || false;
                                          const kills = parseInt(killsAmounts[reg.id] !== undefined ? killsAmounts[reg.id] : (reg.kills || 0)) || 0;
                                          const oldKills = reg.kills || 0;
                                          const killsDiff = kills - oldKills;
                                          const perKill = t.perKill || 0;
                                          const killsCoins = killsDiff * perKill;

                                          if (amount <= 0 && killsDiff === 0 && !isWin) {
                                            showToast('Please enter a valid winning amount, update kills, or mark as win', 'error');
                                            return;
                                          }

                                          setSubmittingResults(prev => ({ ...prev, [reg.id]: true }));

                                          try {
                                            const regUpdate: any = { resultSubmitted: true };
                                            const userUpdate: any = {};
                                            let totalCoinsAdded = 0;

                                            if (isWin) {
                                              regUpdate.won = true;
                                              userUpdate.winStreak = increment(1);
                                              userUpdate.totalWins = increment(1);
                                            }

                                            if (amount > 0) {
                                              regUpdate.winningAmount = amount;
                                              totalCoinsAdded += amount;
                                            }

                                            if (killsDiff !== 0) {
                                              regUpdate.kills = kills;
                                              totalCoinsAdded += killsCoins;
                                            }

                                            if (totalCoinsAdded !== 0) {
                                              userUpdate.walletBalance = increment(totalCoinsAdded);
                                              userUpdate.totalEarnings = increment(totalCoinsAdded);
                                            }

                                            await updateDoc(doc(db, 'registrations', reg.id), regUpdate);
                                            
                                            if (Object.keys(userUpdate).length > 0) {
                                              await updateDoc(doc(db, 'users', reg.userId), userUpdate);
                                            }

                                            if (amount > 0) {
                                              await addDoc(collection(db, 'transactions'), {
                                                userId: reg.userId,
                                                userEmail: reg.email,
                                                amount: amount,
                                                type: 'Winning',
                                                description: `Winning Of ${t.name}`,
                                                status: 'completed',
                                                createdAt: serverTimestamp(),
                                                date: new Date().toLocaleString('en-US', { 
                                                  month: 'short', 
                                                  day: 'numeric', 
                                                  year: 'numeric', 
                                                  hour: 'numeric', 
                                                  minute: '2-digit', 
                                                  hour12: true 
                                                })
                                              });

                                              await addDoc(collection(db, 'notifications'), {
                                                userId: reg.userId,
                                                message: `Winning Of ${t.name} has been added`,
                                                read: false,
                                                createdAt: serverTimestamp(),
                                                type: 'winning'
                                              });

                                              await addDoc(collection(db, 'resultsHistory'), {
                                                tournamentId: t.id,
                                                tournamentName: t.name,
                                                userId: reg.userId,
                                                userName: reg.username || 'Unknown',
                                                ign: reg.freeFireName,
                                                uid: reg.freeFireId,
                                                email: reg.email,
                                                amount: amount,
                                                type: 'Winning',
                                                registrationId: reg.id,
                                                createdAt: serverTimestamp()
                                              });
                                            }

                                            if (killsCoins > 0) {
                                              await addDoc(collection(db, 'transactions'), {
                                                userId: reg.userId,
                                                userEmail: reg.email,
                                                amount: killsCoins,
                                                type: 'Kills',
                                                description: `Kills Reward For ${t.name}`,
                                                status: 'completed',
                                                createdAt: serverTimestamp(),
                                                date: new Date().toLocaleString('en-US', { 
                                                  month: 'short', 
                                                  day: 'numeric', 
                                                  year: 'numeric', 
                                                  hour: 'numeric', 
                                                  minute: '2-digit', 
                                                  hour12: true 
                                                })
                                              });
                                              await addDoc(collection(db, 'resultsHistory'), {
                                                tournamentId: t.id,
                                                tournamentName: t.name,
                                                userId: reg.userId,
                                                userName: reg.username || 'Unknown',
                                                ign: reg.freeFireName,
                                                uid: reg.freeFireId,
                                                email: reg.email,
                                                amount: killsCoins,
                                                type: 'Kills',
                                                kills: killsDiff,
                                                registrationId: reg.id,
                                                createdAt: serverTimestamp()
                                              });
                                            }

                                            showToast(`Result submitted! Added ${totalCoinsAdded} coins.`);
                                            setWinningAmounts({...winningAmounts, [reg.id]: ''});
                                            setKillsAmounts({...killsAmounts, [reg.id]: ''});
                                          } catch (error) {
                                            console.error('Error submitting result:', error);
                                            showToast('Failed to submit result', 'error');
                                          } finally {
                                            setSubmittingResults(prev => ({ ...prev, [reg.id]: false }));
                                          }
                                        }}
                                        disabled={submittingResults[reg.id]}
                                        className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black text-xs font-black px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[100px] justify-center tracking-widest uppercase"
                                      >
                                        {submittingResults[reg.id] ? <Loader2 size={16} className="animate-spin" /> : 'SUBMIT'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )})}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
                {tournaments.filter(t => t.status === 'Result').length === 0 && (
                  <div className="text-center py-20 bg-gradient-to-b from-[#131B2F] to-[#0B1121] rounded-3xl border border-gray-800 shadow-xl">
                    <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-5">
                      <Award className="text-gray-600" size={40} />
                    </div>
                    <p className="text-gray-400 font-bold text-lg">No tournaments marked as "Result" yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Change a tournament's status to "Result" to add winners.</p>
                  </div>
                )}
              </div>
              )}

              {/* Added Results */}
              {resultsTab === 'added' && (
                <div className="space-y-6 mt-6">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                      <History size={20} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Added Results</h2>
                  </div>

                  <div className="mb-6">
                    <input
                      type="text"
                      placeholder="Search results..."
                      value={addedResultsSearch}
                      onChange={(e) => setAddedResultsSearch(e.target.value)}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                    />
                  </div>

                  {(() => {
                    const groupedResults = resultsHistory.reduce((acc: any, curr: any) => {
                      if (!acc[curr.tournamentId]) {
                        acc[curr.tournamentId] = {
                          tournamentId: curr.tournamentId,
                          tournamentName: curr.tournamentName,
                          totalAmount: 0,
                          winnerCount: 0,
                          records: []
                        };
                      }
                      acc[curr.tournamentId].totalAmount += curr.amount || 0;
                      acc[curr.tournamentId].winnerCount += 1;
                      acc[curr.tournamentId].records.push(curr);
                      return acc;
                    }, {});

                    const groups = Object.values(groupedResults).sort((a: any, b: any) => {
                      const latestA = Math.max(...a.records.map((r: any) => r.createdAt?.toMillis() || 0));
                      const latestB = Math.max(...b.records.map((r: any) => r.createdAt?.toMillis() || 0));
                      return latestB - latestA;
                    });

                    const filteredGroups = groups.filter((group: any) => 
                      group.tournamentName.toLowerCase().includes(addedResultsSearch.toLowerCase())
                    );

                    if (filteredGroups.length === 0) {
                      return (
                        <div className="text-center py-20 bg-gradient-to-b from-[#131B2F] to-[#0B1121] rounded-3xl border border-gray-800 shadow-xl">
                          <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-5">
                            <History className="text-gray-600" size={40} />
                          </div>
                          <p className="text-gray-400 font-bold text-lg">No added results found.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {filteredGroups.map((group: any) => (
                          <div key={group.tournamentId} className="bg-gradient-to-br from-[#131B2F] to-[#0B1121] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl hover:border-yellow-500/20 transition-all group/card">
                            <div className="p-6 border-b border-gray-800/50 bg-[#1a243a]/30">
                              <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover/card:scale-110 transition-transform duration-300">
                                    <Trophy size={24} className="text-yellow-500" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight">{group.tournamentName}</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Tournament Results</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    setConfirmModal({
                                      isOpen: true,
                                      title: 'Revert All Results',
                                      message: `Are you sure you want to revert ALL results for ${group.tournamentName}? This will deduct coins from all winners and reset their stats.`,
                                      action: async () => {
                                        try {
                                          const batch = writeBatch(db);
                                          for (const record of group.records) {
                                            // Update user
                                            const userRef = doc(db, 'users', record.userId);
                                            const userUpdate: any = {
                                              walletBalance: increment(-record.amount)
                                            };
                                            if (record.type === 'Winning') {
                                              userUpdate.winStreak = increment(-1);
                                              userUpdate.totalWins = increment(-1);
                                            }
                                            batch.update(userRef, userUpdate);

                                            // Update registration
                                            if (record.registrationId) {
                                              const regRef = doc(db, 'registrations', record.registrationId);
                                              const regUpdate: any = { resultSubmitted: false };
                                              if (record.type === 'Winning') {
                                                regUpdate.won = false;
                                                regUpdate.winningAmount = deleteField();
                                              } else if (record.type === 'Kills' && record.kills) {
                                                regUpdate.kills = increment(-record.kills);
                                              }
                                              batch.update(regRef, regUpdate);
                                            }

                                            // Delete original transaction and notification
                                            if (record.type === 'Winning') {
                                              const txQuery = query(collection(db, 'transactions'), where('userId', '==', record.userId), where('description', '==', `Winning Of ${record.tournamentName}`));
                                              const txSnapshot = await getDocs(txQuery);
                                              txSnapshot.forEach((docSnap) => batch.delete(docSnap.ref));

                                              const notifQuery = query(collection(db, 'notifications'), where('userId', '==', record.userId), where('message', '==', `Winning Of ${record.tournamentName} has been added`));
                                              const notifSnapshot = await getDocs(notifQuery);
                                              notifSnapshot.forEach((docSnap) => batch.delete(docSnap.ref));
                                            }

                                            // Delete result history
                                            const rhRef = doc(db, 'resultsHistory', record.id);
                                            batch.delete(rhRef);
                                          }
                                          await batch.commit();
                                          showToast(`Successfully reverted all results for ${group.tournamentName}`);
                                          setResultsTab('pending');
                                          
                                          const q = query(collection(db, 'registrations'), where('tournamentId', '==', group.tournamentId));
                                          onSnapshot(q, (snapshot) => {
                                            setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                                            setViewingResults(group.tournamentId);
                                          });
                                        } catch (error) {
                                          console.error('Error reverting all results:', error);
                                          showToast('Failed to revert all results', 'error');
                                        }
                                      }
                                    });
                                  }}
                                  disabled={isModalProcessing || isEditingResultProcessing}
                                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  <ArrowDownUp size={14} /> Revert All
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0A0F1C] p-3 rounded-2xl border border-gray-800/50">
                                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Total Winners</p>
                                  <p className="text-xl font-black text-white">{group.winnerCount}</p>
                                </div>
                                <div className="bg-[#0A0F1C] p-3 rounded-2xl border border-gray-800/50">
                                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Total Coins</p>
                                  <p className="text-xl font-black text-yellow-500">{group.totalAmount}</p>
                                </div>
                              </div>
                            </div>

                            <div className="px-6 pb-4 text-center">
                              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                {new Date(Math.max(...group.records.map((r: any) => r.createdAt?.toMillis() || 0))).toLocaleString()}
                              </p>
                            </div>

                            <div className="flex items-center justify-center p-6 pt-0">
                              <button
                                onClick={() => setSelectedResultHistory(group)}
                                className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                              >
                                <Eye size={16} /> View Result
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* History Log */}
              {resultsTab === 'history' && (
              <div className="mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <History size={20} className="text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">History Log</h2>
                  </div>
                  
                  {(() => {
                    const totalDistributed = resultsHistory.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
                    const totalRecords = resultsHistory.length;
                    return (
                      <div className="flex items-center gap-4">
                        <div className="bg-[#131B2F] border border-gray-800 rounded-xl px-4 py-2">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Total Distributed</p>
                          <p className="text-lg font-black text-green-400">+{totalDistributed} <span className="text-[10px] text-gray-500">Coins</span></p>
                        </div>
                        <div className="bg-[#131B2F] border border-gray-800 rounded-xl px-4 py-2">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Total Records</p>
                          <p className="text-lg font-black text-white">{totalRecords}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      placeholder="Search tournament history..."
                      value={addedResultsSearch}
                      onChange={(e) => setAddedResultsSearch(e.target.value)}
                      className="w-full bg-[#131B2F] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
                    />
                  </div>
                </div>
                
                {(() => {
                  const filteredHistory = resultsHistory.filter((r: any) => 
                    r.tournamentName?.toLowerCase().includes(addedResultsSearch.toLowerCase())
                  );

                  const groupedResultsHistory = Object.values(filteredHistory.reduce((acc: any, curr: any) => {
                    if (!acc[curr.tournamentId]) {
                      acc[curr.tournamentId] = {
                        tournamentId: curr.tournamentId,
                        tournamentName: curr.tournamentName,
                        latestDate: curr.createdAt,
                        totalCoins: 0,
                        records: []
                      };
                    }
                    acc[curr.tournamentId].totalCoins += curr.amount || 0;
                    acc[curr.tournamentId].records.push(curr);
                    return acc;
                  }, {})).sort((a: any, b: any) => (b.latestDate?.toMillis() || 0) - (a.latestDate?.toMillis() || 0));

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {groupedResultsHistory.length === 0 ? (
                        <div className="col-span-full py-16 bg-gradient-to-b from-[#131B2F] to-[#0B1121] rounded-2xl border border-gray-800 shadow-xl text-center">
                          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <History className="text-gray-600" size={32} />
                          </div>
                          <p className="text-gray-400 font-bold text-base">No results history found.</p>
                          <p className="text-gray-500 text-xs mt-1">Try a different search term.</p>
                        </div>
                      ) : (
                        groupedResultsHistory.map((group: any) => (
                          <div key={group.tournamentId} className="bg-gradient-to-br from-[#131B2F] to-[#0B1121] p-4 rounded-xl border border-gray-800 hover:border-yellow-500/30 transition-all shadow-lg group relative overflow-hidden cursor-pointer" onClick={() => setSelectedResultHistory(group)}>
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-yellow-500/5 to-transparent rounded-bl-full pointer-events-none" />
                            
                            <div className="flex justify-between items-start mb-3 relative z-10">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-105 transition-transform">
                                  <Trophy size={18} className="text-yellow-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Tournament</p>
                                  <p className="font-bold text-white text-sm truncate">{group.tournamentName}</p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-[#0A0F1C]/50 rounded-lg p-3 border border-gray-800/30 mb-3 flex justify-between items-center">
                              <div>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Distributed</p>
                                <p className="text-base font-black text-green-400">+{group.totalCoins}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Records</p>
                                <p className="text-base font-bold text-white">{group.records.length}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-800/30">
                              <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} />
                                {formatDate(group.latestDate?.toDate?.()?.toISOString() || new Date().toISOString())}
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedResultHistory(group); }}
                                className="text-[9px] font-black text-yellow-500 uppercase tracking-widest hover:text-yellow-400 flex items-center gap-1 transition-colors bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20 hover:bg-yellow-500/20"
                              >
                                <Eye size={10} /> View
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })()}
              </div>
              )}
            </motion.div>
          )}

          {/* Daily Tasks Tab */}
          {activeTab === 'tasks' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Header and Reset Buttons */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-yellow-500 mb-1">Daily & Weekly Tasks</h1>
                  <p className="text-gray-400 text-sm">Manage tasks and view completion stats</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Reset Daily Tasks',
                        message: 'Are you sure you want to reset daily tasks for ALL users? This will clear their daily progress.',
                        action: async () => {
                          try {
                            setIsModalProcessing(true);
                            const batchSize = 500;
                            const chunks = [];
                            for (let i = 0; i < users.length; i += batchSize) {
                                chunks.push(users.slice(i, i + batchSize));
                            }
                            
                            for (const chunk of chunks) {
                                const batch = writeBatch(db);
                                chunk.forEach(user => {
                                    const userRef = doc(db, 'users', user.id);
                                    batch.update(userRef, { 
                                      dailyClaims: deleteField(),
                                      weeklyClaims: deleteField(),
                                      'taskLastClaimed.join_2': deleteField(),
                                      'taskLastClaimed.join_6': deleteField(),
                                      'taskLastClaimed.win_3_matches': deleteField(),
                                      dailyTaskResetAt: serverTimestamp(),
                                      weeklyTaskResetAt: serverTimestamp()
                                    });
                                });
                                await batch.commit();
                            }
                            showToast('Daily tasks reset successfully!');
                          } catch (error: any) {
                            console.error('Error resetting daily tasks:', error);
                            showToast(`Failed to reset: ${error.message}`, 'error');
                          } finally {
                            setIsModalProcessing(false);
                          }
                        }
                      });
                    }}
                    className="bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/50 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                  >
                    <History size={16} /> Reset Daily
                  </button>
                  <button 
                    onClick={() => {
                       setConfirmModal({
                        isOpen: true,
                        title: 'Reset Weekly Tasks',
                        message: 'Are you sure you want to reset weekly tasks for ALL users? This will clear their weekly progress.',
                        action: async () => {
                          try {
                            setIsModalProcessing(true);
                            const batchSize = 500;
                            const chunks = [];
                            for (let i = 0; i < users.length; i += batchSize) {
                                chunks.push(users.slice(i, i + batchSize));
                            }
                            
                            for (const chunk of chunks) {
                                const batch = writeBatch(db);
                                chunk.forEach(user => {
                                    const userRef = doc(db, 'users', user.id);
                                    batch.update(userRef, { 
                                      weeklyClaims: deleteField(),
                                      'taskLastClaimed.weekly_join_20': deleteField(),
                                      weeklyTaskResetAt: serverTimestamp()
                                    });
                                });
                                await batch.commit();
                            }
                            showToast('Weekly tasks reset successfully!');
                          } catch (error: any) {
                            console.error('Error resetting weekly tasks:', error);
                            showToast(`Failed to reset: ${error.message}`, 'error');
                          } finally {
                            setIsModalProcessing(false);
                          }
                        }
                      });
                    }}
                    className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 border border-purple-600/50 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                  >
                    <History size={16} /> Reset Weekly
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Task List */}
                {[
                  { id: 'join_2', title: 'Join 2 Tournaments', type: 'daily', icon: <Target size={24} />, color: 'blue' },
                  { id: 'join_6', title: 'Join 6 Tournaments', type: 'daily', icon: <Target size={24} />, color: 'indigo' },
                  { id: 'win_3_matches', title: 'Win 3 Matches', type: 'daily', icon: <Trophy size={24} />, color: 'yellow' },
                  { id: 'daily_login', title: 'Daily Login', type: 'daily', icon: <Star size={24} />, color: 'emerald' },
                  { id: 'weekly_join_20', title: 'Weekly Warrior (Join 20)', type: 'weekly', icon: <Crown size={24} />, color: 'purple' }
                ].map(task => {
                  // Calculate stats
                  const completedUsers = users.filter(u => {
                    if (task.type === 'daily') {
                      return u.dailyClaims?.claimed?.includes(task.id);
                    } else {
                      return u.weeklyClaims?.claimed?.includes(task.id);
                    }
                  });

                  // Get all claims for this task
                  const now = new Date().getTime();
                  const allClaims = transactions
                    .filter(t => {
                      if (t.taskId !== task.id || t.type !== 'Task Reward') return false;
                      if (task.type === 'daily') {
                        const txTime = t.createdAt?.toMillis() || 0;
                        return (now - txTime) <= 24 * 60 * 60 * 1000;
                      }
                      return true;
                    })
                    .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

                  const recentClaims = allClaims.slice(0, 3);
                  const completionRate = users.length > 0 ? (completedUsers.length / users.length) * 100 : 0;

                  return (
                    <div key={task.id} className="bg-[#151517] border border-gray-800/60 rounded-3xl overflow-hidden group hover:border-gray-700/80 transition-all duration-300 shadow-lg shadow-black/20 flex flex-col">
                      <div className={`p-6 border-b border-gray-800/60 flex justify-between items-start bg-gradient-to-br from-${task.color}-500/5 to-transparent`}>
                        <div className="flex items-start gap-4">
                          <div className={`p-3.5 rounded-2xl bg-${task.color}-500/10 text-${task.color}-400 shadow-inner shadow-${task.color}-500/20`}>
                            {task.icon}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white mb-1.5 leading-tight">{task.title}</h3>
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-${task.color}-500/20 text-${task.color}-400 border border-${task.color}-500/30`}>
                              {task.type} Task
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="flex items-baseline gap-1">
                            <p className="text-3xl font-black text-white">{completedUsers.length}</p>
                          </div>
                          <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-1">Completed</p>
                        </div>
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                              <Clock size={12} /> Recent Claims
                            </h4>
                            <button 
                                onClick={() => setViewingTaskDetails({ task, claims: allClaims })}
                                className={`text-[10px] font-bold text-${task.color}-400 hover:text-${task.color}-300 flex items-center gap-1 transition-colors bg-${task.color}-500/10 px-3 py-1.5 rounded-lg`}
                            >
                                View All ({allClaims.length}) <ArrowUpRight size={12} />
                            </button>
                        </div>
                        
                        {recentClaims.length > 0 ? (
                          <div className="space-y-3 flex-1">
                            {recentClaims.map(claim => {
                              const user = users.find(u => u.id === claim.userId);
                              // Handle various date formats (Firestore Timestamp, JS Date, string)
                              let claimDate = new Date();
                              if (claim.createdAt?.toDate) {
                                claimDate = claim.createdAt.toDate();
                              } else if (claim.createdAt?.seconds) {
                                claimDate = new Date(claim.createdAt.seconds * 1000);
                              } else if (claim.createdAt instanceof Date) {
                                claimDate = claim.createdAt;
                              } else if (claim.date) {
                                claimDate = new Date(claim.date);
                              }
                              
                              return (
                                <div key={claim.id || Math.random().toString()} className="flex items-center justify-between p-3 rounded-xl bg-[#131314] border border-gray-800/50 hover:border-gray-700 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700 text-xs font-bold text-gray-300">
                                      {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        user?.username?.[0] || '?'
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-white">{user?.username || claim.userEmail || 'Unknown User'}</p>
                                      <p className="text-[9px] text-gray-500 font-medium">{user?.email || 'No email'}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-black text-yellow-400 flex items-center justify-end gap-1">
                                      +{claim.amount} <Coins size={10} />
                                    </p>
                                    <p className="text-[9px] text-gray-500 font-medium mt-0.5">
                                      {claimDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-gray-800/50 rounded-2xl">
                            <History size={24} className="text-gray-600 mb-2" />
                            <p className="text-xs font-bold text-gray-500">No recent claims</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Task Details Modal */}
              <AnimatePresence>
                {viewingTaskDetails && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 20 }}
                      className="bg-[#151517] rounded-[1.5rem] md:rounded-[2rem] w-full max-w-3xl md:max-w-4xl lg:max-w-5xl border border-gray-800/60 shadow-2xl flex flex-col max-h-[85vh] md:max-h-[90vh] overflow-hidden relative"
                    >
                      {/* Decorative Background Gradient */}
                      <div className={`absolute top-0 left-0 w-full h-40 md:h-64 bg-gradient-to-b from-${viewingTaskDetails.task.color || (viewingTaskDetails.task.type === 'daily' ? 'blue' : 'purple')}-500/10 to-transparent pointer-events-none`} />

                      <div className="p-5 sm:p-6 md:p-8 border-b border-gray-800/60 flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-4 md:gap-5">
                          <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-${viewingTaskDetails.task.color || (viewingTaskDetails.task.type === 'daily' ? 'blue' : 'purple')}-500/10 text-${viewingTaskDetails.task.color || (viewingTaskDetails.task.type === 'daily' ? 'blue' : 'purple')}-400 shadow-inner shadow-${viewingTaskDetails.task.color || (viewingTaskDetails.task.type === 'daily' ? 'blue' : 'purple')}-500/20`}>
                            {viewingTaskDetails.task.icon || (viewingTaskDetails.task.type === 'daily' ? <Star className="w-6 h-6 md:w-7 md:h-7" /> : <Trophy className="w-6 h-6 md:w-7 md:h-7" />)}
                          </div>
                          <div>
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">{viewingTaskDetails.task.title}</h3>
                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] md:text-[10px] font-black px-2 md:px-2.5 py-0.5 md:py-1 rounded-full uppercase tracking-widest bg-${viewingTaskDetails.task.color || (viewingTaskDetails.task.type === 'daily' ? 'blue' : 'purple')}-500/20 text-${viewingTaskDetails.task.color || (viewingTaskDetails.task.type === 'daily' ? 'blue' : 'purple')}-400 border border-${viewingTaskDetails.task.color || (viewingTaskDetails.task.type === 'daily' ? 'blue' : 'purple')}-500/30`}>
                                {viewingTaskDetails.task.type} Task
                              </span>
                              <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Full Claim History</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setViewingTaskDetails(null)} className="p-2 md:p-2.5 text-gray-500 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors border border-transparent hover:border-gray-700">
                          <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                      </div>

                      <div className="p-5 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 relative z-10">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                            <div className="bg-[#1A1A1C] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800/60 flex items-center gap-4 md:gap-5 shadow-lg shadow-black/20">
                                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                  <Users className="w-5 h-5 md:w-7 md:h-7" />
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 md:mb-1">Total Claims</p>
                                  <p className="text-2xl md:text-3xl font-black text-white">{viewingTaskDetails.claims.length}</p>
                                </div>
                            </div>
                            <div className="bg-[#1A1A1C] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800/60 flex items-center gap-4 md:gap-5 shadow-lg shadow-black/20">
                                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
                                  <Coins className="w-5 h-5 md:w-7 md:h-7" />
                                </div>
                                <div>
                                  <p className="text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 md:mb-1">Total Distributed</p>
                                  <p className="text-2xl md:text-3xl font-black text-yellow-400">
                                      {viewingTaskDetails.claims.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0).toLocaleString()}
                                  </p>
                                </div>
                            </div>
                         </div>

                         {viewingTaskDetails.claims.length > 0 ? (
                            <div className="bg-[#1A1A1C] rounded-2xl md:rounded-3xl border border-gray-800/60 overflow-hidden shadow-lg shadow-black/20">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead className="bg-[#131314] border-b border-gray-800/60">
                                      <tr className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest">
                                        <th className="p-4 md:p-5 font-black">User</th>
                                        <th className="p-4 md:p-5 font-black">Reward</th>
                                        <th className="p-4 md:p-5 font-black">Time & Date</th>
                                        <th className="p-4 md:p-5 font-black text-right">Transaction ID</th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-xs md:text-sm text-gray-300 divide-y divide-gray-800/60">
                                      {viewingTaskDetails.claims.map((claim: any) => {
                                        const user = users.find(u => u.id === claim.userId);
                                        // Handle various date formats (Firestore Timestamp, JS Date, string)
                                        let claimDate = new Date();
                                        if (claim.createdAt?.toDate) {
                                          claimDate = claim.createdAt.toDate();
                                        } else if (claim.createdAt?.seconds) {
                                          claimDate = new Date(claim.createdAt.seconds * 1000);
                                        } else if (claim.createdAt instanceof Date) {
                                          claimDate = claim.createdAt;
                                        } else if (claim.date) {
                                          claimDate = new Date(claim.date);
                                        }

                                        return (
                                          <tr key={claim.id} className="hover:bg-gray-800/30 transition-colors group">
                                            <td className="p-4 md:p-5">
                                              <div className="flex items-center gap-3 md:gap-4">
                                                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-800 flex items-center justify-center text-xs md:text-sm font-bold text-gray-300 border border-gray-700 overflow-hidden shadow-inner">
                                                    {user?.photoURL ? (
                                                      <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                      user?.username?.[0] || '?'
                                                    )}
                                                  </div>
                                                  <div>
                                                      <p className="font-bold text-white text-xs md:text-sm group-hover:text-blue-400 transition-colors">{user?.username || 'Unknown User'}</p>
                                                      <p className="text-[9px] md:text-[10px] text-gray-500 font-medium mt-0.5">{user?.email || claim.userEmail || 'No email provided'}</p>
                                                  </div>
                                              </div>
                                            </td>
                                            <td className="p-4 md:p-5">
                                              <div className="inline-flex items-center gap-1 md:gap-1.5 bg-yellow-500/10 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg border border-yellow-500/20">
                                                <span className="text-yellow-400 font-black text-xs md:text-sm">+{claim.amount}</span>
                                                <Coins className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-500" />
                                              </div>
                                            </td>
                                            <td className="p-4 md:p-5">
                                              <div className="flex flex-col">
                                                <span className="text-gray-300 font-bold text-xs md:text-sm">{claimDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                <span className="text-gray-500 text-[9px] md:text-[10px] font-medium mt-0.5 uppercase tracking-wider">{claimDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                              </div>
                                            </td>
                                            <td className="p-4 md:p-5 text-right">
                                              <span className="inline-block bg-gray-900 text-gray-500 font-mono text-[9px] md:text-[10px] px-2 md:px-2.5 py-1 md:py-1.5 rounded-md md:rounded-lg border border-gray-800">
                                                {claim.id}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                            </div>
                         ) : (
                            <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center border-2 border-dashed border-gray-800/60 rounded-2xl md:rounded-3xl bg-[#1A1A1C]/50">
                                <History className="w-9 h-9 md:w-12 md:h-12 text-gray-700 mb-3 md:mb-4" />
                                <p className="text-gray-400 font-bold text-base md:text-lg mb-1">No claims found</p>
                                <p className="text-gray-600 text-xs md:text-sm">There are no recorded claims for this task yet.</p>
                            </div>
                         )}
                      </div>
                      
                      <div className="p-5 md:p-6 border-t border-gray-800/60 bg-[#131314] relative z-10">
                        <button 
                            onClick={() => setViewingTaskDetails(null)}
                            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 md:py-3.5 rounded-xl transition-colors uppercase tracking-widest text-[10px] md:text-xs border border-gray-700 hover:border-gray-600 shadow-lg"
                        >
                            Close Details
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Referral Tab */}
          {activeTab === 'referral' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-yellow-500 mb-1">Referral Management</h1>
                  <p className="text-gray-400 text-sm">Manage referral rewards and requests.</p>
                </div>
                <div className="flex items-center gap-2 bg-[#131B2F] border border-gray-800 rounded-xl px-4 py-2">
                  <Coins size={16} className="text-yellow-500" />
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Referrer Reward:</span>
                  <span className="text-white font-bold">{referralSettings.referrerReward} Coins</span>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Users size={40} className="text-blue-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Requests</p>
                  <h3 className="text-2xl font-black text-white">{referralRequests.length}</h3>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Clock size={40} className="text-yellow-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Review</p>
                  <h3 className="text-2xl font-black text-white">{referralRequests.filter(r => r.status === 'pending').length}</h3>
                </div>
                <div className="bg-[#131B2F] border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Approved</p>
                  <h3 className="text-2xl font-black text-white">{referralRequests.filter(r => r.status === 'approved').length}</h3>
                </div>
              </div>

              {/* Referral Settings */}
              <div className="bg-[#131B2F] border border-gray-800 p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Settings size={20} className="text-blue-400" /> Referral Settings
                </h3>
                <div className="space-y-6 max-w-2xl">
                  
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between bg-[#0B1121] p-4 rounded-xl border border-gray-800">
                    <div>
                      <p className="text-white font-bold text-sm">Enable Referral System</p>
                      <p className="text-gray-500 text-xs">Allow new users to enter referral codes and earn rewards.</p>
                    </div>
                    <button 
                      onClick={() => setNewReferralSettings({...newReferralSettings, enabled: !newReferralSettings.enabled})}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${newReferralSettings.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${newReferralSettings.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Referrer Reward (Code Owner)</label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
                        <input 
                          type="number" 
                          value={newReferralSettings.referrerReward}
                          onChange={(e) => setNewReferralSettings({...newReferralSettings, referrerReward: Number(e.target.value)})}
                          className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Referee Reward (New User)</label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                        <input 
                          type="number" 
                          value={newReferralSettings.refereeReward}
                          onChange={(e) => setNewReferralSettings({...newReferralSettings, refereeReward: Number(e.target.value)})}
                          className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleUpdateReferralReward}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
                  >
                    Save Settings
                  </button>
                </div>
              </div>

              {/* Referral Requests List */}
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users size={20} className="text-green-400" /> Referral Requests
                  </h3>
                  
                  <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                      <input 
                        type="text" 
                        placeholder="Search referrals..." 
                        value={referralSearchTerm}
                        onChange={(e) => setReferralSearchTerm(e.target.value)}
                        className="bg-[#0B1121] border border-gray-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors w-48 md:w-64"
                      />
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-[#0B1121] p-1 rounded-xl border border-gray-800/50">
                      <button
                        onClick={() => setReferralTab('pending')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          referralTab === 'pending' 
                            ? 'bg-[#1E293B] text-white shadow-sm border border-gray-700' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => setReferralTab('history')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          referralTab === 'history' 
                            ? 'bg-[#1E293B] text-white shadow-sm border border-gray-700' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        History
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Card View for Referral Requests */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {referralRequests
                    .filter(req => {
                      const matchesTab = referralTab === 'pending' ? req.status === 'pending' : req.status !== 'pending';
                      if (!matchesTab) return false;

                      const referrer = users.find(u => u.id === req.referrerId);
                      const referee = users.find(u => u.id === req.refereeId);
                      const search = referralSearchTerm.toLowerCase();

                      return (
                        referrer?.username?.toLowerCase().includes(search) ||
                        referrer?.email?.toLowerCase().includes(search) ||
                        referrer?.referralCode?.toLowerCase().includes(search) ||
                        referee?.username?.toLowerCase().includes(search) ||
                        referee?.email?.toLowerCase().includes(search) ||
                        req.refereeName?.toLowerCase().includes(search)
                      );
                    })
                    .map((req) => {
                    const referrer = users.find(u => u.id === req.referrerId);
                    const referee = users.find(u => u.id === req.refereeId);
                    
                    return (
                      <div key={req.id} className="bg-[#131B2F] border border-gray-800 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-900/10">
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                            req.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            req.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="mb-4">
                          <div className="text-gray-300 text-xs font-bold flex items-center gap-2">
                            <Calendar size={12} className="text-gray-500" />
                            {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-[10px] text-gray-600 pl-5">
                            {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>

                        {/* Referrer Section */}
                        <div className="mb-3 bg-[#0B1121] rounded-xl p-3 border border-gray-800/50 group-hover:border-gray-700 transition-colors">
                          <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-1.5">
                            <User size={10} /> Referrer (Owner)
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-sm border border-blue-500/20 shadow-inner">
                              {referrer?.username?.[0]?.toUpperCase() || <User size={16} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-white font-bold text-sm truncate">{referrer?.username || 'Unknown'}</div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {referrer?.email || 'No Email'} • <span className="text-yellow-500 font-black">+{referralSettings.referrerReward}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Referee Section */}
                        <div className="mb-4 bg-[#0B1121] rounded-xl p-3 border border-gray-800/50 group-hover:border-gray-700 transition-colors">
                          <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-1.5">
                            <User size={10} /> Referee (Joined)
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-black text-sm border border-purple-500/20 shadow-inner">
                              {referee?.username?.[0]?.toUpperCase() || <User size={16} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-white font-bold text-sm truncate">{referee?.username || req.refereeName || 'Unknown'}</div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {referee?.email || 'No Email'} • <span className="text-blue-500 font-black">+{referralSettings.refereeReward}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Code & Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Referral Code</span>
                            <span className="text-blue-400 font-mono font-black text-sm tracking-widest bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 inline-block">
                              {referrer?.referralCode || 'N/A'}
                            </span>
                          </div>

                          {req.status === 'pending' && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleApproveReferral(req)}
                                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-all shadow-lg shadow-green-500/20 active:scale-95"
                                title="Approve"
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => handleRejectReferral(req)}
                                className="bg-[#1E293B] hover:bg-red-500 hover:text-white text-gray-400 p-2 rounded-lg transition-all border border-gray-700 hover:border-red-500 active:scale-95"
                                title="Reject"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {referralRequests.filter(req => {
                      const matchesTab = referralTab === 'pending' ? req.status === 'pending' : req.status !== 'pending';
                      if (!matchesTab) return false;

                      const referrer = users.find(u => u.id === req.referrerId);
                      const referee = users.find(u => u.id === req.refereeId);
                      const search = referralSearchTerm.toLowerCase();

                      return (
                        referrer?.username?.toLowerCase().includes(search) ||
                        referrer?.email?.toLowerCase().includes(search) ||
                        referrer?.referralCode?.toLowerCase().includes(search) ||
                        referee?.username?.toLowerCase().includes(search) ||
                        referee?.email?.toLowerCase().includes(search) ||
                        req.refereeName?.toLowerCase().includes(search)
                      );
                    }).length === 0 && (
                    <div className="col-span-full p-16 text-center text-gray-500 bg-[#131B2F] border border-gray-800 rounded-2xl border-dashed">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-800/30 rounded-full flex items-center justify-center">
                          <Users className="opacity-20" size={32} />
                        </div>
                        <p className="font-bold uppercase tracking-widest text-xs">No {referralTab} referral requests found</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* View Transactions Tab */}
          {activeTab === 'viewTransactions' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {!viewingTransactionUser ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">User Transactions</h2>
                      <p className="text-gray-400 text-sm">Select a user to view their transaction history.</p>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={transactionSearchTerm}
                        onChange={(e) => setTransactionSearchTerm(e.target.value)}
                        className="bg-[#131B2F] border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors w-full md:w-80"
                      />
                    </div>
                  </div>

                  <div className="bg-[#131B2F] border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#0B1121] border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                            <th className="p-4 font-bold">User</th>
                            <th className="p-4 font-bold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {users
                            .filter(u => {
                              const search = transactionSearchTerm.toLowerCase();
                              return (
                                u.username?.toLowerCase().includes(search) ||
                                u.email?.toLowerCase().includes(search)
                              );
                            })
                            .map((user) => (
                              <tr key={user.id} className="hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => setViewingTransactionUser(user)}>
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 font-bold text-sm border border-blue-500/20">
                                      {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                      <p className="font-bold text-white text-sm">{user.username || 'Unknown User'}</p>
                                      <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 text-right">
                                  <button className="text-blue-400 hover:text-blue-300 text-xs font-bold bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors">
                                    View History
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {users.length === 0 && (
                            <tr>
                              <td colSpan={2} className="p-8 text-center text-gray-500">
                                No users found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setViewingTransactionUser(null)}
                        className="bg-[#131B2F] hover:bg-gray-800 text-white p-2 rounded-lg border border-gray-800 transition-colors"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                          Transactions for <span className="text-blue-400">{viewingTransactionUser.username}</span>
                        </h2>
                        <p className="text-gray-400 text-sm">{viewingTransactionUser.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#131B2F] border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#0B1121] border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                            <th className="p-4 font-bold">Type</th>
                            <th className="p-4 font-bold text-right">Amount</th>
                            <th className="p-4 font-bold">Status</th>
                            <th className="p-4 font-bold">Date</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {userTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-800/30 transition-colors">
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                                  tx.type === 'Deposit' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                  tx.type === 'Withdrawal' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  tx.type === 'Winning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className={`p-4 text-right font-bold ${
                                tx.type === 'Deposit' || tx.type === 'Winning' || tx.type === 'Prize Pool' || tx.type === 'Referral' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {tx.type === 'Deposit' || tx.type === 'Winning' || tx.type === 'Prize Pool' || tx.type === 'Referral' ? '+' : '-'}{tx.amount}
                              </td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                                  tx.status === 'completed' || tx.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                  tx.status === 'rejected' || tx.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-gray-400">
                                {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : tx.date || 'N/A'}
                                <div className="text-[10px] text-gray-600">
                                  {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingTransaction(tx); }}
                                    className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" 
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id); }}
                                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" 
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {userTransactions.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-gray-500">
                                No transactions found for this user.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Edit Transaction Modal */}
              {editingTransaction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingTransaction(null)}>
                  <div className="bg-[#131B2F] border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-white">Edit Transaction</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Amount</label>
                        <input
                          type="number"
                          value={editingTransaction.amount}
                          onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: Number(e.target.value) })}
                          className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                        <select
                          value={editingTransaction.status}
                          onChange={(e) => setEditingTransaction({ ...editingTransaction, status: e.target.value })}
                          className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                        <select
                          value={editingTransaction.type}
                          onChange={(e) => setEditingTransaction({ ...editingTransaction, type: e.target.value })}
                          className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="Deposit">Deposit</option>
                          <option value="Withdrawal">Withdrawal</option>
                          <option value="Winning">Winning</option>
                          <option value="Referral">Referral</option>
                          <option value="Prize Pool">Prize Pool</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setEditingTransaction(null)}
                        className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateTransaction(editingTransaction.id, {
                          amount: editingTransaction.amount,
                          status: editingTransaction.status,
                          type: editingTransaction.type
                        })}
                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Push Notifications Tab */}
          {activeTab === 'push' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-yellow-500 mb-1">Push Notifications</h1>
                  <p className="text-gray-400 text-sm">Send real-time push notifications to your users.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Send Notification Form */}
                <div className="bg-[#131B2F] border border-gray-800 p-8 rounded-3xl space-y-8 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 p-3 rounded-2xl">
                      <Send size={24} className="text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Compose Notification</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Target Audience</label>
                      <select 
                        value={pushForm.target}
                        onChange={(e) => setPushForm({...pushForm, target: e.target.value})}
                        className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-all font-bold text-sm"
                      >
                        <option value="all">All Registered Users</option>
                        <option value="admins">Admins Only</option>
                        <option value="active">Active Players Only</option>
                        <option value="specific">Specific User (by Email)</option>
                      </select>
                    </div>

                    {pushForm.target === 'specific' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">User Email</label>
                        <input 
                          type="email" 
                          placeholder="user@example.com"
                          value={pushForm.specificUserEmail}
                          onChange={(e) => setPushForm({...pushForm, specificUserEmail: e.target.value})}
                          className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all font-bold text-sm"
                        />
                      </motion.div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Notification Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g. New Tournament Alert!"
                        value={pushForm.title}
                        onChange={(e) => setPushForm({...pushForm, title: e.target.value})}
                        className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all font-bold text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Message Body</label>
                      <textarea 
                        rows={4}
                        placeholder="Enter the message you want to send to users..."
                        value={pushForm.body}
                        onChange={(e) => setPushForm({...pushForm, body: e.target.value})}
                        className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all resize-none font-bold text-sm"
                      />
                    </div>

                    {/* Live Preview */}
                    <div className="bg-[#0B1121] rounded-2xl p-6 border border-gray-800/50">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-5">Live Preview</label>
                      <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-2xl max-w-sm mx-auto border border-gray-800">
                        <div className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Bell size={24} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate">{pushForm.title || 'Notification Title'}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Just now</p>
                          </div>
                        </div>
                        <div className="px-4 pb-4">
                          <p className="text-xs text-gray-400 font-medium leading-relaxed line-clamp-3">{pushForm.body || 'Notification message body will appear here...'}</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleSendPush}
                      disabled={isSendingPush}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-900/20 text-xs uppercase tracking-[0.2em]"
                    >
                      {isSendingPush ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={20} /> Send Notification
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Setup Instructions */}
                <div className="bg-[#131B2F] border border-gray-800 p-6 rounded-2xl space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <History size={20} className="text-blue-500" /> Notification History
                    </h3>
                    {pushHistory.length > 0 && (
                      <button 
                        onClick={handleDeleteAllNotifications}
                        className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors uppercase tracking-wider"
                      >
                        <Trash2 size={12} /> Delete All
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {pushHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-[#0B1121] rounded-2xl border border-dashed border-gray-800">
                        <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                          <BellOff size={32} className="text-gray-600" />
                        </div>
                        <h3 className="text-gray-400 font-bold text-lg">No Notifications Yet</h3>
                        <p className="text-gray-600 text-sm mt-1">Send your first push notification to get started.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pushHistory.map((notification) => (
                          <div key={notification.id} className="group bg-[#0B1121] p-5 rounded-2xl border border-gray-800 hover:border-blue-500/30 transition-all hover:shadow-lg hover:shadow-blue-900/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-blue-500/10 p-2 rounded-lg">
                                <Send size={14} className="text-blue-400" />
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-4">
                              <div className="shrink-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-gray-700 ${
                                  notification.type === 'transaction' ? 'bg-yellow-500/10 text-yellow-500' :
                                  notification.target === 'all' ? 'bg-blue-500/10 text-blue-500' : 
                                  'bg-purple-500/10 text-purple-500'
                                }`}>
                                  {notification.type === 'transaction' ? <DollarSign size={20} /> : <Bell size={20} />}
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-white text-sm truncate">{notification.title}</h4>
                                  <span className="text-[10px] font-medium text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                                    {notification.createdAt?.toDate?.()?.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) || 'Just now'}
                                  </span>
                                </div>
                                
                                <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{notification.body}</p>
                                
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                    notification.target === 'all' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    notification.type === 'transaction' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                    'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  }`}>
                                    {notification.type === 'transaction' ? <User size={10} /> : <Users size={10} />}
                                    {notification.target === 'all' ? 'Broadcast' : notification.type === 'transaction' ? 'User Transaction' : notification.target}
                                  </div>

                                  {notification.userEmail && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 border border-gray-700 text-[10px] font-mono">
                                      <Mail size={10} />
                                      {notification.userEmail}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase tracking-wider">
                                    <CheckCircle2 size={10} />
                                    Sent
                                  </div>

                                  <span className="text-[10px] text-gray-600 ml-auto font-mono">
                                    {notification.createdAt?.toDate?.()?.toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#131B2F] border border-gray-800 p-6 rounded-2xl space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings size={20} className="text-yellow-500" /> Firebase Setup Guide
                  </h3>
                  
                  <div className="space-y-4 text-sm text-gray-400">
                    <div className="bg-[#0B1121] p-4 rounded-xl border border-gray-800">
                      <p className="text-white font-bold mb-2">Step 1: Enable FCM</p>
                      <p>Go to Firebase Console &gt; Project Settings &gt; Cloud Messaging. Enable "Firebase Cloud Messaging API (V1)".</p>
                    </div>

                    <div className="bg-[#0B1121] p-4 rounded-xl border border-gray-800">
                      <p className="text-white font-bold mb-2">Step 2: VAPID Key</p>
                      <p>In the same tab, scroll to "Web configuration" and generate a "Web Push certificate". Copy the "Key pair" (VAPID key).</p>
                    </div>

                    <div className="bg-[#0B1121] p-4 rounded-xl border border-gray-800">
                      <p className="text-white font-bold mb-2">Step 3: Environment Variable</p>
                      <p>Add your VAPID key to the <code>VITE_FIREBASE_VAPID_KEY</code> variable in your environment settings.</p>
                    </div>

                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                      <p className="text-blue-400 font-bold mb-1">Backend Setup Complete</p>
                      <p className="text-xs">The server is now configured with the Firebase Admin SDK. To send notifications, ensure you have added <code>FIREBASE_PROJECT_ID</code>, <code>FIREBASE_CLIENT_EMAIL</code>, and <code>FIREBASE_PRIVATE_KEY</code> to your environment variables.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6 overflow-hidden">
              
              {/* Ticket List Sidebar */}
              <div className={`flex-1 flex flex-col bg-[#0F172A] border border-gray-800 rounded-2xl overflow-hidden ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
                {/* Header & Filters */}
                <div className="p-4 border-b border-gray-800 bg-[#131B2F] space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <MessageSquare className="text-yellow-500" size={20} />
                      Support
                    </h2>
                    <div className="bg-[#0B1121] px-3 py-1 rounded-lg border border-gray-800 text-xs text-gray-400">
                      Total: <span className="text-white font-bold">{supportTickets.length}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 bg-[#0B1121] p-1 rounded-xl border border-gray-800">
                    {['Pending', 'Open', 'Solved'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setSupportFilter(tab as any);
                          setSelectedTicket(null);
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          supportFilter === tab 
                            ? 'bg-yellow-500 text-black shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {['All', 'High', 'Medium', 'Low'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriorityFilter(p as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${
                          priorityFilter === p
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-[#0B1121] border-gray-800 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {p} Priority
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ticket List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {supportTickets
                    .filter(t => {
                      const statusMatch = t.status === supportFilter;
                      const priorityMatch = priorityFilter === 'All' || t.priority === priorityFilter;
                      return statusMatch && priorityMatch;
                    })
                    .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
                    .map(ticket => {
                      const ticketUser = users.find(u => u.id === ticket.userId);
                      return (
                        <div 
                          key={ticket.id}
                          onClick={async () => {
                            if (ticket.status === 'Pending') {
                              setSelectedTicket({ ...ticket, status: 'Open' });
                              await updateDoc(doc(db, 'support_tickets', ticket.id), { status: 'Open' });
                            } else {
                              setSelectedTicket(ticket);
                            }
                          }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-[#1E293B] ${
                            selectedTicket?.id === ticket.id 
                              ? 'bg-[#1E293B] border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                              : 'bg-[#131B2F] border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {ticket.status === 'Open' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                ticket.priority === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                                ticket.priority === 'Medium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                                'bg-gray-700 text-gray-400 border border-gray-600'
                              }`}>
                                {ticket.priority}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500">{ticket.date}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-bold text-sm line-clamp-1">{ticket.subject}</h4>
                          <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{ticket.category}</span>
                        </div>
                        <p className="text-gray-400 text-xs line-clamp-1 mb-3">{ticket.lastMessage}</p>
                          
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50">
                            <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300">
                              {ticketUser?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="text-xs text-gray-400 truncate max-w-[120px]">
                              {ticketUser?.username || ticketUser?.email || 'Unknown User'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {supportTickets.filter(t => {
                      const statusMatch = t.status === supportFilter;
                      const priorityMatch = priorityFilter === 'All' || t.priority === priorityFilter;
                      return statusMatch && priorityMatch;
                    }).length === 0 && (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                        <MessageSquare size={32} className="mb-2 opacity-50" />
                        <p className="text-xs">No {supportFilter.toLowerCase()} tickets</p>
                      </div>
                    )}
                </div>
              </div>

              {/* Chat Area */}
              <div className={`flex-[2] flex flex-col bg-[#0F172A] border border-gray-800 rounded-2xl overflow-hidden ${!selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
                {selectedTicket ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-800 bg-[#131B2F] flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedTicket(null)} className="lg:hidden text-gray-400 hover:text-white">
                          <ArrowDownUp className="rotate-90" size={20} />
                        </button>
                        <div>
                          <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            {selectedTicket.subject}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              selectedTicket.status === 'Open' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                              selectedTicket.status === 'Solved' ? 'bg-gray-700/50 border-gray-600 text-gray-400' :
                              'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                            }`}>
                              {selectedTicket.status}
                            </span>
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            {(() => {
                              const u = users.find(user => user.id === selectedTicket.userId);
                              return (
                                <>
                                  <span className="flex items-center gap-1"><User size={12} /> {u?.username || u?.email || 'Unknown'}</span>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="hidden sm:inline">{u?.email}</span>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="hidden sm:inline">{u?.phoneNumber || 'No Phone'}</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={async () => {
                          const newStatus = selectedTicket.status === 'Solved' ? 'Open' : 'Solved';
                          await updateDoc(doc(db, 'support_tickets', selectedTicket.id), { status: newStatus });
                          setSelectedTicket({...selectedTicket, status: newStatus});
                          showToast(`Ticket marked as ${newStatus}`);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                          selectedTicket.status === 'Solved'
                            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20'
                        }`}
                      >
                        {selectedTicket.status === 'Solved' ? <ArrowUpRight size={14} /> : <CheckCircle2 size={14} />}
                        {selectedTicket.status === 'Solved' ? 'Reopen Ticket' : 'Mark Solved'}
                      </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-[#0B1121]">
                      {selectedTicket.messages?.map((msg: any, idx: number) => (
                        <div key={idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl p-3 ${
                            msg.sender === 'admin' 
                              ? 'bg-blue-600 text-white rounded-tr-none' 
                              : 'bg-[#1E293B] border border-gray-700 text-gray-200 rounded-tl-none'
                          }`}>
                            <div className="flex items-center justify-between gap-4 mb-1">
                              <span className={`text-[10px] font-bold ${msg.sender === 'admin' ? 'text-blue-200' : 'text-yellow-500'}`}>
                                {msg.sender === 'admin' ? 'Support Team' : 'User'}
                              </span>
                              <span className={`text-[10px] ${msg.sender === 'admin' ? 'text-blue-200' : 'text-gray-500'}`}>
                                {msg.timestamp}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#131B2F] border-t border-gray-800">
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!adminReply.trim()) return;
                          
                          try {
                            const newMessage = {
                              id: Date.now().toString(),
                              text: adminReply,
                              sender: 'admin',
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            };
                            
                            const updatedMessages = [...(selectedTicket.messages || []), newMessage];
                            
                            await updateDoc(doc(db, 'support_tickets', selectedTicket.id), {
                              messages: updatedMessages,
                              lastMessage: adminReply,
                              status: 'Open', // Reopen if admin replies
                              userUnreadCount: increment(1)
                            });
                            
                            // Update local state immediately for better UX
                            setSelectedTicket({
                              ...selectedTicket,
                              messages: updatedMessages,
                              lastMessage: adminReply,
                              status: 'Open'
                            });
                            
                            setAdminReply('');
                          } catch (err) {
                            console.error("Error sending reply:", err);
                            showToast('Failed to send reply', 'error');
                          }
                        }}
                        className="flex gap-3"
                      >
                        <input
                          type="text"
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 bg-[#0B1121] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button 
                          type="submit"
                          disabled={!adminReply.trim()}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
                        >
                          <ArrowUpRight size={20} />
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                    <div className="w-20 h-20 bg-[#131B2F] rounded-full flex items-center justify-center mb-4 border border-gray-800">
                      <MessageSquare size={32} className="text-gray-600" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Select a Ticket</h3>
                    <p className="text-sm max-w-xs">Choose a support ticket from the list to view details and chat with the user.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'payment-methods' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <PaymentMethods />
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-yellow-500">Global Notifications</h2>
                <button 
                  onClick={() => {
                    setEditingNotification(null);
                    setNotificationForm({ title: '', message: '', type: 'system' });
                    setIsNotificationModalOpen(true);
                  }}
                  className="bg-yellow-500 text-black px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                >
                  <Plus size={18} /> Send Notification
                </button>
              </div>

              <div className="grid gap-4">
                {notifications.map(notif => (
                  <div key={notif.id} className="bg-[#131B2F] border border-gray-800 p-4 md:p-6 rounded-2xl hover:border-yellow-500/30 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                            notif.type === 'system' ? 'bg-blue-500/20 text-blue-400' : 
                            notif.type === 'tournament' ? 'bg-yellow-500/20 text-yellow-400' : 
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {notif.type}
                          </span>
                          <h3 className="text-lg font-bold text-white">{notif.title}</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{notif.message}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                          <Clock size={12} />
                          {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString() : 'Just now'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingNotification(notif);
                            setNotificationForm({ title: notif.title, message: notif.message, type: notif.type });
                            setIsNotificationModalOpen(true);
                          }}
                          className="p-2 bg-blue-600/10 text-blue-500 border border-blue-600/20 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Delete Notification',
                              message: 'Are you sure you want to delete this notification?',
                              action: async () => {
                                await deleteDoc(doc(db, 'global_notifications', notif.id));
                                showToast('Notification deleted successfully');
                              }
                            });
                          }}
                          className="p-2 bg-red-600/10 text-red-500 border border-red-600/20 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-20 bg-[#131B2F] rounded-2xl border border-gray-800">
                    <Bell className="mx-auto text-gray-700 mb-4" size={48} />
                    <p className="text-gray-500 font-bold">No global notifications sent yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'blocked-accounts' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-red-500">Blocked Accounts</h2>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search blocked users..."
                    value={blockedSearchTerm}
                    onChange={(e) => setBlockedSearchTerm(e.target.value)}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-600" size={16} />
                </div>
              </div>

              <div className="bg-[#131B2F] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0B1121] text-gray-500 text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="p-4">User</th>
                        <th className="p-4 hidden md:table-cell">Reason</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {users
                        .filter(u => u.isBanned && (u.username?.toLowerCase().includes(blockedSearchTerm.toLowerCase()) || u.email?.toLowerCase().includes(blockedSearchTerm.toLowerCase())))
                        .map(u => (
                        <tr key={u.id} className="hover:bg-[#1E293B] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600/20 to-orange-600/20 text-red-400 flex items-center justify-center font-black text-sm border border-red-500/10">
                                {u.username ? u.username[0].toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p className="font-black text-white text-sm">{u.username || 'Anonymous'}</p>
                                <p className="text-[10px] text-gray-500 font-bold">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-300 text-sm hidden md:table-cell max-w-xs truncate">{u.banReason || 'No reason provided'}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setViewingBanReason(u)}
                                className="md:hidden bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all"
                              >
                                View Reason
                              </button>
                              <button 
                                onClick={() => setConfirmModal({
                                  isOpen: true,
                                  title: 'Unblock User',
                                  message: `Are you sure you want to unblock ${u.username || 'this user'}?`,
                                  action: async () => {
                                    await updateDoc(doc(db, 'users', u.id), { isBanned: false, banReason: '' });
                                    showToast('User unblocked successfully!');
                                  }
                                })}
                                className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                              >
                                Unblock
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.filter(u => u.isBanned && (u.username?.toLowerCase().includes(blockedSearchTerm.toLowerCase()) || u.email?.toLowerCase().includes(blockedSearchTerm.toLowerCase()))).length === 0 && (
                    <div className="text-center py-20 text-gray-500 font-bold">No blocked accounts found.</div>
                  )}
                </div>
              </div>

              {/* View Reason Modal */}
              {viewingBanReason && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-[#131B2F] border border-gray-800 p-6 rounded-2xl w-full max-w-md">
                    <h3 className="text-lg font-bold text-white mb-4">Ban Reason</h3>
                    <p className="text-gray-300 text-sm mb-6">{viewingBanReason.banReason || 'No reason provided'}</p>
                    <button 
                      onClick={() => setViewingBanReason(null)}
                      className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-yellow-500 mb-1">App Settings</h1>
                <p className="text-gray-400 text-sm">Manage app-wide settings.</p>
              </div>
              <div className="bg-[#131B2F] border border-gray-800 p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">Email Verification</h3>
                    <p className="text-gray-400 text-sm">Require users to verify their email with OTP.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      await setDoc(doc(db, 'settings', 'app'), { ...appSettings, emailVerificationEnabled: !appSettings.emailVerificationEnabled }, { merge: true });
                      showToast(`Email verification ${!appSettings.emailVerificationEnabled ? 'enabled' : 'disabled'}`);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors ${appSettings.emailVerificationEnabled ? 'bg-yellow-500' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.emailVerificationEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">One Device One Account</h3>
                    <p className="text-gray-400 text-sm">Restrict users to one account per device.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      await setDoc(doc(db, 'settings', 'app'), { ...appSettings, oneDeviceOneAccount: !appSettings.oneDeviceOneAccount }, { merge: true });
                      showToast(`One device one account ${!appSettings.oneDeviceOneAccount ? 'enabled' : 'disabled'}`);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors ${appSettings.oneDeviceOneAccount ? 'bg-yellow-500' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.oneDeviceOneAccount ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">Maintenance Mode</h3>
                    <p className="text-gray-400 text-sm">Enable this to show maintenance screen to users.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      await setDoc(doc(db, 'settings', 'app'), { ...appSettings, maintenanceMode: !appSettings.maintenanceMode }, { merge: true });
                      showToast(`Maintenance mode ${!appSettings.maintenanceMode ? 'enabled' : 'disabled'}`);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors ${appSettings.maintenanceMode ? 'bg-yellow-500' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.maintenanceMode ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
                {appSettings.maintenanceMode && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-400">Maintenance Message</label>
                    <input
                      type="text"
                      value={appSettings.maintenanceMessage || ''}
                      onChange={(e) => setAppSettings({ ...appSettings, maintenanceMessage: e.target.value })}
                      onBlur={async () => {
                        await setDoc(doc(db, 'settings', 'app'), { ...appSettings }, { merge: true });
                      }}
                      className="w-full bg-[#0B1221] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500"
                      placeholder="Enter maintenance message..."
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">Primary Color</h3>
                    <p className="text-gray-400 text-sm">Change the app's primary color.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={appSettings.primaryColor}
                      onChange={(e) => setAppSettings({ ...appSettings, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent"
                    />
                    <button 
                      onClick={async () => {
                        await setDoc(doc(db, 'settings', 'app'), { ...appSettings, primaryColor: '#eab308' }, { merge: true });
                        showToast('Color reset to default');
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Reset Default
                    </button>
                    <button 
                      onClick={async () => {
                        await setDoc(doc(db, 'settings', 'app'), { ...appSettings }, { merge: true });
                        showToast('Color updated successfully');
                      }}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm transition-colors font-bold"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-yellow-500">Leaderboard Management</h2>
              </div>

              {/* Global Settings */}
              <div className="bg-[#131B2F] border border-gray-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Settings size={20} className="text-blue-400" /> Global Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Lifetime Achievement Text</label>
                    <textarea 
                      value={leaderboardForm.allTimeChampion}
                      onChange={(e) => setLeaderboardForm({ ...leaderboardForm, allTimeChampion: e.target.value })}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors min-h-[100px]"
                      placeholder="Enter text for Lifetime Achievements section..."
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        await setDoc(doc(db, 'settings', 'leaderboard'), leaderboardForm, { merge: true });
                        showToast('Leaderboard settings updated!');
                      } catch (err) {
                        showToast('Failed to update settings', 'error');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm"
                  >
                    Save Settings
                  </button>
                </div>
              </div>

              {/* User Rankings */}
              <div className="bg-[#131B2F] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy size={20} className="text-yellow-500" /> User Rankings
                  </h3>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Reset All Wins',
                        message: 'Are you sure you want to reset total wins for ALL users? This action cannot be undone.',
                        action: async () => {
                          try {
                            // In a real app with many users, this should be done via a cloud function or batched carefully
                            // For this size, we'll iterate
                            const batch = writeBatch(db);
                            users.forEach(u => {
                              const ref = doc(db, 'users', u.id);
                              batch.update(ref, { totalWins: 0 });
                            });
                            await batch.commit();
                            showToast('All user wins reset to 0');
                          } catch (err) {
                            console.error(err);
                            showToast('Failed to reset wins', 'error');
                          }
                        }
                      });
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors"
                  >
                    Reset All Wins
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0B1121] text-gray-500 text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="p-4">User Name</th>
                        <th className="p-4 text-center">Total Wins</th>
                        <th className="p-4 text-center">Wallet</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {users.sort((a, b) => (b.totalWins || 0) - (a.totalWins || 0)).map(u => (
                        <tr key={u.id} className="hover:bg-[#1E293B] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 text-blue-400 flex items-center justify-center font-black text-sm border border-blue-500/10">
                                {u.username ? u.username[0].toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p className="font-black text-white text-sm">{u.username || 'Anonymous'}</p>
                                <p className="text-[10px] text-gray-500 font-bold truncate max-w-[150px]">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-bold text-yellow-500">{u.totalWins || 0}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-bold text-white">{u.walletBalance || 0}</span>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => {
                                setEditUserData({ ...u });
                                setIsEditingLeaderboardUser(true);
                              }}
                              className="text-blue-400 hover:text-white text-xs font-bold hover:underline"
                            >
                              Edit Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
          </div>
        </div>
      </div>

      {/* Leaderboard User Edit Modal */}
      <AnimatePresence>
        {isEditingLeaderboardUser && editUserData && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingLeaderboardUser(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-[#131B2F] border border-gray-800 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
              
              <div className="relative flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Edit Stats</h3>
                  <p className="text-gray-500 text-xs font-bold">Update wins for <span className="text-blue-400">{editUserData.username || 'User'}</span></p>
                </div>
                <button 
                  onClick={() => setIsEditingLeaderboardUser(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-8">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Total Wins Count</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-yellow-500/50 group-focus-within:text-yellow-500 transition-colors">
                    <Trophy size={18} />
                  </div>
                  <input 
                    type="number" 
                    value={editUserData.totalWins || 0}
                    onChange={(e) => setEditUserData({ ...editUserData, totalWins: Number(e.target.value) })}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white font-mono focus:outline-none focus:border-blue-500 transition-all text-xl font-black"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'users', editUserData.id), { totalWins: editUserData.totalWins });
                      showToast('User wins updated successfully!');
                      setIsEditingLeaderboardUser(false);
                    } catch (err) {
                      showToast('Failed to update user', 'error');
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                >
                  <Check size={16} /> Save Changes
                </button>
                <button 
                  onClick={() => setIsEditingLeaderboardUser(false)}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-black py-4 rounded-2xl transition-all uppercase text-xs tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Room Details Modal */}
      <AnimatePresence>
        {roomModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#131B2F] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Set Room Details</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Room ID</label>
                  <input 
                    type="text" 
                    value={roomModal.roomId}
                    onChange={(e) => setRoomModal({...roomModal, roomId: e.target.value})}
                    className="w-full bg-[#0B1121] border border-gray-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. 12345678"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Password</label>
                  <input 
                    type="text" 
                    value={roomModal.password}
                    onChange={(e) => setRoomModal({...roomModal, password: e.target.value})}
                    className="w-full bg-[#0B1121] border border-gray-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. pass123"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveRoomDetails} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                  Save Details
                </button>
                <button onClick={() => setRoomModal(null)} className="flex-1 bg-[#0B1121] hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors border border-gray-800">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Proof Modal */}
      <AnimatePresence>
        {selectedProofImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setSelectedProofImage(null)}
          >
            <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
              <button 
                onClick={() => setSelectedProofImage(null)} 
                className="absolute top-4 right-4 bg-gray-800/50 text-white p-3 rounded-full hover:bg-gray-700 transition-colors z-10"
              >
                <X size={24} />
              </button>
              <motion.img 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={selectedProofImage} 
                alt="Payment Proof" 
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" 
                onClick={e => e.stopPropagation()} 
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Details / Edit Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-2xl bg-[#0B1121] border border-gray-800 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Top Banner Accent */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="relative flex flex-col sm:flex-row items-center justify-between p-5 md:p-8 gap-4 md:gap-6 z-10">
                  <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
                    <div className="relative group">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                        <div className="w-full h-full rounded-[0.9rem] bg-[#0B1121] flex items-center justify-center overflow-hidden">
                          {selectedUser.photoURL ? (
                            <img src={selectedUser.photoURL} alt={selectedUser.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-2xl md:text-3xl font-black text-white">{selectedUser.username ? selectedUser.username[0].toUpperCase() : 'U'}</span>
                          )}
                        </div>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 md:w-8 md:h-8 border-2 border-[#0B1121] rounded-lg md:rounded-xl flex items-center justify-center shadow-xl ${selectedUser.isAdmin ? 'bg-blue-500' : 'bg-gray-600'}`}>
                        {selectedUser.isAdmin ? <Shield size={12} className="text-white" /> : <User size={12} className="text-white" />}
                      </div>
                    </div>
                    <div className="text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 md:gap-3 mb-1">
                        <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                          {isEditingUser ? 'Edit Profile' : (selectedUser.username || 'Anonymous')}
                        </h3>
                        <div className="flex gap-1.5">
                          {selectedUser.isAdmin && (
                            <span className="bg-blue-500/10 text-blue-400 text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-500/20 flex items-center gap-1">
                              <Shield size={8} /> Admin
                            </span>
                          )}
                          <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border flex items-center gap-1 ${
                            selectedUser.isBanned 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                              : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            <div className={`w-1 h-1 rounded-full ${selectedUser.isBanned ? 'bg-red-500' : 'bg-green-500'}`} />
                            {selectedUser.isBanned ? 'Banned' : 'Active'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedUser.id);
                            showToast('User ID copied!');
                          }}
                          className="font-mono text-blue-500/80 text-[10px] md:text-xs hover:text-blue-400 transition-colors flex items-center gap-1.5 bg-blue-500/5 px-2 py-0.5 rounded-lg border border-blue-500/10"
                        >
                          #{selectedUser.id.substring(0, 8)}... <ArrowUpRight size={8} className="rotate-45" />
                        </button>
                        <span className="w-0.5 h-0.5 bg-gray-800 rounded-full" />
                        <span className="text-gray-500 text-[10px] md:text-xs font-medium">Joined {selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:static absolute top-4 right-4">
                    {!isEditingUser && (
                      <button 
                        onClick={() => {
                          setIsEditingUser(true);
                          setEditUserData({ ...selectedUser });
                        }}
                        className="hidden sm:flex bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 items-center gap-2"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedUser(null);
                        setIsEditingUser(false);
                      }}
                      className="p-2 md:p-3 hover:bg-white/5 rounded-lg md:rounded-xl text-gray-500 hover:text-white transition-all border border-transparent hover:border-gray-800"
                      title="Close"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-5 md:p-8 pt-0">
                  {/* Mobile Edit Button */}
                  {!isEditingUser && (
                    <button 
                      onClick={() => {
                        setIsEditingUser(true);
                        setEditUserData({ ...selectedUser });
                      }}
                      className="sm:hidden w-full bg-white hover:bg-gray-200 text-black px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl mb-6 flex items-center justify-center gap-2"
                    >
                      <Pencil size={14} /> Edit Profile
                    </button>
                  )}

                <div className="grid grid-cols-1 gap-6">
                  
                  {/* Left Column: Details */}
                  <div className="space-y-6">
                    <section className="bg-[#131B2F] border border-gray-800/50 p-6 md:p-8 rounded-[1.5rem]">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <User size={18} />
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Account Information</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: 'Username', key: 'username', icon: <User size={14} /> },
                          { label: 'Email Address', key: 'email', icon: <Mail size={14} />, type: 'email' },
                          { label: 'Phone Number', key: 'phoneNumber', icon: <Phone size={14} /> },
                          { label: 'Password (Stored)', key: 'password', icon: <Lock size={14} />, isPassword: true }
                        ].map((field) => (
                          <div key={field.key} className="bg-[#0B1121] border border-gray-800/50 p-4 rounded-xl group hover:border-blue-500/30 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-gray-500">{field.icon}</span>
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{field.label}</p>
                            </div>
                            {isEditingUser ? (
                              <div className="relative group/input">
                                <input 
                                  type={field.type || 'text'} 
                                  value={editUserData[field.key] || ''} 
                                  onChange={(e) => setEditUserData({ ...editUserData, [field.key]: e.target.value })}
                                  className="w-full bg-black/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all font-bold"
                                  placeholder={`Enter ${field.label.toLowerCase()}`}
                                />
                              </div>
                            ) : (
                              <p className={`text-sm font-bold truncate ${field.isPassword ? 'text-red-400 font-mono' : 'text-white'}`}>
                                {selectedUser[field.key] || 'Not Set'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="bg-[#131B2F] border border-gray-800/50 p-6 md:p-8 rounded-[1.5rem] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl -mr-12 -mt-12" />
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <Zap size={18} />
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Quick Actions</h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Add 100 Coins', icon: <Plus size={14} />, action: () => handleQuickAction('walletBalance', 100), color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
                          { label: 'Add 1 Win', icon: <Trophy size={14} />, action: () => handleQuickAction('totalWins', 1), color: 'bg-green-500/10 text-green-500 border-green-500/20' },
                          { label: 'Reset Streak', icon: <Flame size={14} />, action: () => handleQuickAction('winStreak', 0, true), color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
                          { label: 'Clear Bonus', icon: <Coins size={14} />, action: () => handleQuickAction('bonusBalance', 0, true), color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' }
                        ].map((btn, i) => (
                          <button 
                            key={i}
                            onClick={btn.action}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-105 active:scale-95 ${btn.color}`}
                          >
                            {btn.icon}
                            <span className="text-[9px] font-black uppercase tracking-wider text-center">{btn.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="bg-[#131B2F] border border-gray-800/50 p-6 md:p-8 rounded-[1.5rem] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-3xl -mr-12 -mt-12" />
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                          <Shield size={18} />
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Administrative Controls</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#0B1121] border border-gray-800/50 rounded-xl">
                          <div className="text-center sm:text-left">
                            <p className="text-white text-base font-bold mb-0.5">Admin Privileges</p>
                            <p className="text-gray-500 text-[10px] max-w-xs">Granting admin access allows managing system data.</p>
                          </div>
                          <button 
                            onClick={() => toggleAdminStatus(selectedUser.id, !!selectedUser.isAdmin)}
                            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                              selectedUser.isAdmin 
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white'
                            }`}
                          >
                            <Shield size={14}/> {selectedUser.isAdmin ? 'Revoke' : 'Make Admin'}
                          </button>
                        </div>

                        <div className="flex flex-col gap-4 p-4 bg-[#0B1121] border border-gray-800/50 rounded-xl">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-center sm:text-left">
                              <p className="text-white text-base font-bold mb-0.5">Account Status</p>
                              <p className="text-gray-500 text-[10px] max-w-xs">Banning prevents login and tournament entry.</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${selectedUser.isBanned ? 'text-red-500' : 'text-green-500'}`}>
                                {selectedUser.isBanned ? 'Banned' : 'Active'}
                              </span>
                              {selectedUser.isBanned ? (
                                <button 
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'users', selectedUser.id), { isBanned: false, banReason: '' });
                                      showToast('User unbanned successfully!');
                                      setSelectedUser({ ...selectedUser, isBanned: false, banReason: '' });
                                    } catch (err) {
                                      showToast('Action failed', 'error');
                                    }
                                  }}
                                  className="bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                  Unban
                                </button>
                              ) : (
                                <button 
                                  onClick={() => setSelectedUser({ ...selectedUser, showBanInput: !selectedUser.showBanInput })}
                                  className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                  {selectedUser.showBanInput ? 'Cancel Ban' : 'Ban User'}
                                </button>
                              )}
                            </div>
                          </div>
                          {selectedUser.showBanInput && !selectedUser.isBanned && (
                            <div className="mt-2">
                              <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wider">Ban Reason</label>
                              <input
                                type="text"
                                value={banReasonInput}
                                onChange={(e) => setBanReasonInput(e.target.value)}
                                placeholder="Enter reason for banning this user..."
                                className="w-full bg-[#131B2F] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none transition-colors"
                              />
                              <button
                                onClick={async () => {
                                  if (!banReasonInput.trim()) {
                                    showToast('Please enter a ban reason', 'error');
                                    return;
                                  }
                                  try {
                                    await updateDoc(doc(db, 'users', selectedUser.id), { isBanned: true, banReason: banReasonInput.trim() });
                                    showToast('User banned successfully!');
                                    setSelectedUser({ ...selectedUser, isBanned: true, banReason: banReasonInput.trim(), showBanInput: false });
                                    setBanReasonInput('');
                                  } catch (err) {
                                    showToast('Action failed', 'error');
                                  }
                                }}
                                className="mt-2 w-full bg-red-500 text-white font-black py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
                              >
                                Confirm Ban
                              </button>
                            </div>
                          )}
                          {selectedUser.isBanned && (
                            <div className="mt-2 bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                              <p className="text-red-400 text-xs font-bold mb-1 uppercase tracking-wider">Current Ban Reason:</p>
                              <p className="text-white text-sm">{selectedUser.banReason || 'No reason provided.'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Stats Section in Details */}
                    <section className="bg-[#131B2F] border border-gray-800/50 p-6 md:p-8 rounded-[1.5rem]">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                          <Award size={18} />
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Performance Stats</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Wallet', key: 'walletBalance', icon: <Coins size={16} />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                          { label: 'Earnings', key: 'totalEarnings', icon: <DollarSign size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                          { label: 'Kills', key: 'totalKills', icon: <Crosshair size={16} />, color: 'text-red-500', bg: 'bg-red-500/10' },
                          { label: 'Wins', key: 'totalWins', icon: <Trophy size={16} />, color: 'text-green-500', bg: 'bg-green-500/10' },
                          { label: 'Streak', key: 'winStreak', icon: <Flame size={16} />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                          { label: 'Account', key: 'isBanned', icon: <Ban size={16} />, color: 'text-purple-500', bg: 'bg-purple-500/10', isStatus: true }
                        ].map((stat) => (
                          <div key={stat.key} className="bg-[#0B1121] border border-gray-800/50 p-4 rounded-xl flex items-center gap-3 group hover:border-blue-500/30 transition-colors">
                            <div className={`w-10 h-10 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shadow-lg`}>
                              {stat.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">{stat.label}</p>
                              {isEditingUser ? (
                                stat.isStatus ? (
                                  <button 
                                    onClick={() => setEditUserData({ ...editUserData, isBanned: !editUserData.isBanned })}
                                    className={`w-full py-1 rounded-lg text-[10px] font-black uppercase transition-all ${!editUserData.isBanned ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}
                                  >
                                    {!editUserData.isBanned ? 'Active' : 'Banned'}
                                  </button>
                                ) : (
                                  <input 
                                    type="number" 
                                    value={editUserData[stat.key] || 0} 
                                    onChange={(e) => setEditUserData({ ...editUserData, [stat.key]: Number(e.target.value) })}
                                    className="w-full bg-black/40 border border-gray-800 rounded-lg px-2 py-1 text-xs text-white focus:border-blue-500 outline-none font-bold"
                                  />
                                )
                              ) : (
                                <p className={`text-base font-black truncate ${stat.isStatus ? (selectedUser.isBanned ? 'text-red-500' : 'text-green-500') : 'text-white'}`}>
                                  {stat.isStatus ? (selectedUser.isBanned ? 'Banned' : 'Active') : (selectedUser[stat.key] || 0)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="bg-[#131B2F] border border-gray-800/50 p-6 md:p-8 rounded-[1.5rem]">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <Calendar size={18} />
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Daily Progress</h4>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <p className="text-white font-bold text-sm">Daily Claims</p>
                            <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest">{selectedUser.dailyClaims?.date || 'No Activity'}</p>
                          </div>
                          <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1.5 rounded-lg border border-blue-500/20">
                            {selectedUser.dailyClaims?.claimed?.length || 0} / 7
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedUser.dailyClaims?.claimed?.map((claim: string, i: number) => (
                            <span key={i} className="bg-[#0B1121] text-gray-400 text-[9px] font-bold px-3 py-1.5 rounded-lg border border-gray-800">
                              {claim}
                            </span>
                          )) || <p className="text-gray-500 text-xs italic py-4 text-center w-full">No tasks completed today.</p>}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
              <div className="p-5 md:p-8 border-t border-gray-800 bg-[#131B2F] z-20">
                {isEditingUser ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => setIsEditingUser(false)}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          setIsModalProcessing(true);
                          const { id, ...updateData } = editUserData;
                          await updateDoc(doc(db, 'users', id), updateData);
                          showToast('Profile updated successfully!');
                          setIsEditingUser(false);
                          setSelectedUser({ ...editUserData });
                        } catch (err) {
                          showToast('Update failed', 'error');
                        } finally {
                          setIsModalProcessing(false);
                        }
                      }}
                      disabled={isModalProcessing}
                      className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isModalProcessing ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Save Changes
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    Close Details
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Tournament Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0F172A] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#131B2F]">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/10 p-2 rounded-lg">
                    <Trophy className="text-yellow-500" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Create New Tournament</h3>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <form id="create-tournament-form" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('name') as string;
                  const gameType = formData.get('gameType') as string;
                  const mode = formData.get('mode') as string;
                  const time = formData.get('time') as string;
                  const registrationOpenTime = formData.get('registrationOpenTime') as string;
                  const registrationCloseTime = formData.get('registrationCloseTime') as string;
                  const entryFee = Number(formData.get('entryFee'));
                  const prizePool = Number(formData.get('prizePool'));
                  const perKill = Number(formData.get('perKill'));
                  const totalSlots = Number(formData.get('totalSlots')) || 48;
                  const prizeType = formData.get('prizeType') as string;
                  const showPrizeDistribution = formData.get('showPrizeDistribution') === 'on';
                  const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(t => t);

                  try {
                    setIsModalProcessing(true);
                    await addDoc(collection(db, 'tournaments'), {
                      name,
                      gameType,
                      mode,
                      time,
                      registrationOpenTime,
                      registrationCloseTime,
                      entryFee,
                      prizePool,
                      perKill,
                      totalSlots,
                      prizeType,
                      showPrizeDistribution,
                      tags,
                      participants: 0,
                      status: 'Upcoming',
                      createdAt: serverTimestamp(),
                      distribution: [
                        { rank: 'Top 1', points: Math.floor(prizePool * 0.3), percent: '30%', color: 'text-yellow-400' },
                        { rank: 'Top 2', points: Math.floor(prizePool * 0.2), percent: '20%', color: 'text-gray-200' },
                        { rank: 'Top 3', points: Math.floor(prizePool * 0.15), percent: '15%', color: 'text-orange-400' },
                        { rank: 'Top 4', points: Math.floor(prizePool * 0.1), percent: '10%', color: 'text-blue-400' },
                        { rank: 'Top 5', points: Math.floor(prizePool * 0.08), percent: '8%', color: 'text-purple-400' },
                        { rank: 'Top 6', points: Math.floor(prizePool * 0.06), percent: '6%', color: 'text-green-400' },
                        { rank: 'Top 7', points: Math.floor(prizePool * 0.04), percent: '4%', color: 'text-pink-400' },
                        { rank: 'Top 8', points: Math.floor(prizePool * 0.03), percent: '3%', color: 'text-indigo-400' },
                        { rank: 'Top 9', points: Math.floor(prizePool * 0.02), percent: '2%', color: 'text-teal-400' },
                        { rank: 'Top 10', points: Math.floor(prizePool * 0.02), percent: '2%', color: 'text-cyan-400' },
                      ]
                    });
                    showToast('Tournament created successfully!');
                    setCreatedTournamentName(name);
                    setNotificationTitle("New Tournament Alert!");
                    setNotificationBody(`New ${name} has been added. Join Now!`);
                    setIsCreateModalOpen(false);
                    setIsTournamentCreatedModalOpen(true);
                  } catch (err) {
                    showToast('Failed to create tournament', 'error');
                  } finally {
                    setIsModalProcessing(false);
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Tournament Title</label>
                      <input name="name" required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" placeholder="e.g. SOLO FOURTEENTH 6" />
                    </div>

                    {/* Game Type & Mode */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Game Type (Tag)</label>
                      <select name="gameType" className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs">
                        <option value="BR">BR (Battle Royale)</option>
                        <option value="CS">CS (Clash Squad)</option>
                        <option value="FREE FIRE">FREE FIRE</option>
                        <option value="CLASSIC">CLASSIC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Category / Mode</label>
                      <select name="mode" className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs">
                        <option value="Solo">Solo</option>
                        <option value="Duo">Duo</option>
                        <option value="Squad">Squad</option>
                      </select>
                    </div>

                    {/* Time & Entry Fee */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Match Time</label>
                      <input name="time" type="datetime-local" required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Entry Fee (Coins)</label>
                      <input name="entryFee" type="number" required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" placeholder="12" />
                    </div>

                    {/* Registration Times */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Registration Opens</label>
                      <input name="registrationOpenTime" type="datetime-local" className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Registration Closes</label>
                      <input name="registrationCloseTime" type="datetime-local" className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" />
                    </div>

                    {/* Prize Pool & Per Kill */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Total Prize Pool</label>
                      <input name="prizePool" type="number" required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" placeholder="290" />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Per Kill (Coins)</label>
                      <input name="perKill" type="number" defaultValue="0" className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" />
                    </div>

                    {/* Prize Type & Total Slots */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Prize Type</label>
                      <input name="prizeType" required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" placeholder="Top 10" />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Total Slots</label>
                      <input name="totalSlots" type="number" required defaultValue="48" className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" placeholder="48" />
                    </div>

                    {/* Tags */}
                    <div className="md:col-span-2">
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Additional Tags (Comma separated)</label>
                      <input name="tags" className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-yellow-500 transition-colors font-bold text-xs" placeholder="BR, Solo, Pro" />
                    </div>

                    {/* Toggle Prize Distribution */}
                    <div className="md:col-span-2 flex items-center justify-between bg-[#0B1121] p-3 rounded-lg border border-gray-800">
                      <div>
                        <p className="text-xs font-bold text-white">Show Prize Distribution</p>
                        <p className="text-[9px] text-gray-500">Enable to show the prize breakdown grid to users</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input name="showPrizeDistribution" type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-800 bg-[#131B2F] flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  form="create-tournament-form"
                  disabled={isModalProcessing}
                  className="flex-[2] bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isModalProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Create Tournament'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {isNotificationModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsNotificationModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0F172A] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#131B2F]">
                <h3 className="text-xl font-bold text-white">{editingNotification ? 'Edit Notification' : 'Send Notification'}</h3>
                <button onClick={() => setIsNotificationModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Title</label>
                  <input 
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 font-bold text-sm"
                    placeholder="Notification Title"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Message</label>
                  <textarea 
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 text-sm min-h-[100px]"
                    placeholder="Notification Message"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Type</label>
                  <select 
                    value={notificationForm.type}
                    onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="system">System</option>
                    <option value="tournament">Tournament</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      if (editingNotification) {
                        await updateDoc(doc(db, 'global_notifications', editingNotification.id), {
                          ...notificationForm,
                          updatedAt: serverTimestamp()
                        });
                        showToast('Notification updated!');
                      } else {
                        await addDoc(collection(db, 'global_notifications'), {
                          ...notificationForm,
                          createdAt: serverTimestamp()
                        });
                        showToast('Notification sent!');
                      }
                      setIsNotificationModalOpen(false);
                    } catch (err) {
                      showToast('Failed to save notification', 'error');
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
                >
                  {editingNotification ? 'Update' : 'Send'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTournament && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setEditingTournament(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0F172A] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#131B2F]">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/10 p-2 rounded-lg">
                    <Pencil className="text-blue-500" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Edit Tournament</h3>
                </div>
                <button 
                  onClick={() => setEditingTournament(null)}
                  className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <form id="edit-tournament-form" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('name') as string;
                  const gameType = formData.get('gameType') as string;
                  const mode = formData.get('mode') as string;
                  const time = formData.get('time') as string;
                  const registrationOpenTime = formData.get('registrationOpenTime') as string;
                  const registrationCloseTime = formData.get('registrationCloseTime') as string;
                  const entryFee = Number(formData.get('entryFee'));
                  const prizePool = Number(formData.get('prizePool'));
                  const perKill = Number(formData.get('perKill'));
                  const totalSlots = Number(formData.get('totalSlots')) || 48;
                  const prizeType = formData.get('prizeType') as string;
                  const showPrizeDistribution = formData.get('showPrizeDistribution') === 'on';
                  const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(t => t);

                  try {
                    setIsModalProcessing(true);
                    await updateDoc(doc(db, 'tournaments', editingTournament.id), {
                      name,
                      gameType,
                      mode,
                      time,
                      registrationOpenTime,
                      registrationCloseTime,
                      entryFee,
                      prizePool,
                      perKill,
                      totalSlots,
                      prizeType,
                      showPrizeDistribution,
                      tags
                    });
                    showToast('Tournament updated successfully!');
                    setEditingTournament(null);
                  } catch (err) {
                    console.error(err);
                    showToast('Failed to update tournament', 'error');
                  } finally {
                    setIsModalProcessing(false);
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Tournament Title</label>
                      <input name="name" defaultValue={editingTournament.name} required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>

                    {/* Game Type & Mode */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Game Type (Tag)</label>
                      <select name="gameType" defaultValue={editingTournament.gameType} className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs">
                        <option value="BR">BR (Battle Royale)</option>
                        <option value="CS">CS (Clash Squad)</option>
                        <option value="FREE FIRE">FREE FIRE</option>
                        <option value="CLASSIC">CLASSIC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Category / Mode</label>
                      <select name="mode" defaultValue={editingTournament.mode} className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs">
                        <option value="Solo">Solo</option>
                        <option value="Duo">Duo</option>
                        <option value="Squad">Squad</option>
                      </select>
                    </div>

                    {/* Time & Entry Fee */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Match Time</label>
                      <input name="time" type="datetime-local" defaultValue={editingTournament.time} required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Entry Fee (Coins)</label>
                      <input name="entryFee" type="number" defaultValue={editingTournament.entryFee} required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>

                    {/* Registration Times */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Registration Opens</label>
                      <input name="registrationOpenTime" type="datetime-local" defaultValue={editingTournament.registrationOpenTime} className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Registration Closes</label>
                      <input name="registrationCloseTime" type="datetime-local" defaultValue={editingTournament.registrationCloseTime} className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>

                    {/* Prize Pool & Per Kill */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Total Prize Pool</label>
                      <input name="prizePool" type="number" defaultValue={editingTournament.prizePool} required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Per Kill (Coins)</label>
                      <input name="perKill" type="number" defaultValue={editingTournament.perKill} className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>

                    {/* Prize Type & Total Slots */}
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Prize Type</label>
                      <input name="prizeType" defaultValue={editingTournament.prizeType} required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Total Slots</label>
                      <input name="totalSlots" type="number" defaultValue={editingTournament.totalSlots} required className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>

                    {/* Tags */}
                    <div className="md:col-span-2">
                      <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Additional Tags (Comma separated)</label>
                      <input name="tags" defaultValue={editingTournament.tags?.join(', ')} className="w-full bg-[#0B1121] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-xs" />
                    </div>

                    {/* Toggle Prize Distribution */}
                    <div className="md:col-span-2 flex items-center justify-between bg-[#0B1121] p-3 rounded-lg border border-gray-800">
                      <div>
                        <p className="text-xs font-bold text-white">Show Prize Distribution</p>
                        <p className="text-[9px] text-gray-500">Enable to show the prize breakdown grid to users</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input name="showPrizeDistribution" type="checkbox" defaultChecked={editingTournament.showPrizeDistribution} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-800 bg-[#131B2F] flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingTournament(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  form="edit-tournament-form"
                  disabled={isModalProcessing}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isModalProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#131B2F] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-gray-400 text-sm mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  disabled={isModalProcessing}
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
                  className="flex-1 bg-[#0B1121] hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors border border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button 
                  disabled={isModalProcessing}
                  onClick={async () => {
                    if (confirmModal.action) {
                      setIsModalProcessing(true);
                      try {
                        await confirmModal.action();
                      } catch (error) {
                        console.error('Action failed:', error);
                      } finally {
                        setIsModalProcessing(false);
                      }
                    }
                    setConfirmModal({ ...confirmModal, isOpen: false });
                  }} 
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isModalProcessing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result History Details Modal */}
      <AnimatePresence>
        {selectedResultHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-gradient-to-b from-[#131B2F] to-[#0B1121] rounded-2xl p-4 w-full max-w-lg border border-gray-800 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 blur-3xl rounded-full pointer-events-none" />
              
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                  <input
                    type="text"
                    placeholder="Search results..."
                    value={modalResultsSearch}
                    onChange={(e) => setModalResultsSearch(e.target.value)}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mb-4 relative z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                    <Trophy size={20} className="text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight uppercase leading-tight">{selectedResultHistory.tournamentName}</h3>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                      Results • {new Date(Math.max(...selectedResultHistory.records.map((r: any) => r.createdAt?.toMillis() || 0))).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Revert All Results',
                        message: `Are you sure you want to revert ALL results for ${selectedResultHistory.tournamentName}? This will deduct coins from all winners and reset their stats.`,
                        action: async () => {
                          try {
                            const batch = writeBatch(db);
                            
                            for (const record of selectedResultHistory.records) {
                              // Update user
                              const userRef = doc(db, 'users', record.userId);
                              const userUpdate: any = {
                                walletBalance: increment(-record.amount)
                              };
                              if (record.type === 'Winning') {
                                userUpdate.winStreak = increment(-1);
                                userUpdate.totalWins = increment(-1);
                              }
                              batch.update(userRef, userUpdate);

                              // Update registration
                              if (record.registrationId) {
                                const regRef = doc(db, 'registrations', record.registrationId);
                                const regUpdate: any = { resultSubmitted: false };
                                if (record.type === 'Winning') {
                                  regUpdate.won = false;
                                  regUpdate.winningAmount = deleteField();
                                } else if (record.type === 'Kills' && record.kills) {
                                  regUpdate.kills = increment(-record.kills);
                                }
                                batch.update(regRef, regUpdate);
                              }

                              // Delete original transaction and notification
                              if (record.type === 'Winning') {
                                const txQuery = query(collection(db, 'transactions'), where('userId', '==', record.userId), where('description', '==', `Winning Of ${record.tournamentName}`));
                                const txSnapshot = await getDocs(txQuery);
                                txSnapshot.forEach((docSnap) => batch.delete(docSnap.ref));

                                const notifQuery = query(collection(db, 'notifications'), where('userId', '==', record.userId), where('message', '==', `Winning Of ${record.tournamentName} has been added`));
                                const notifSnapshot = await getDocs(notifQuery);
                                notifSnapshot.forEach((docSnap) => batch.delete(docSnap.ref));
                              }

                              // Delete result history
                              const rhRef = doc(db, 'resultsHistory', record.id);
                              batch.delete(rhRef);
                            }

                            await batch.commit();
                            showToast(`Successfully reverted all results for ${selectedResultHistory.tournamentName}`);
                            setSelectedResultHistory(null);
                            setResultsTab('pending');
                            
                            const q = query(collection(db, 'registrations'), where('tournamentId', '==', selectedResultHistory.tournamentId));
                            onSnapshot(q, (snapshot) => {
                              setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                              setViewingResults(selectedResultHistory.tournamentId);
                            });
                          } catch (error) {
                            console.error('Error reverting all results:', error);
                            showToast('Failed to revert all results', 'error');
                          }
                        }
                      });
                    }}
                    className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-colors flex items-center gap-1.5 border border-red-500/20 disabled:opacity-50"
                    disabled={isModalProcessing || isEditingResultProcessing}
                  >
                    <ArrowDownUp size={12} /> Revert
                  </button>
                  <button 
                    onClick={() => setSelectedResultHistory(null)}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 shrink-0 relative z-10">
                <div className="bg-[#0A0F1C] p-2.5 rounded-xl border border-gray-800/80 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Distributed</p>
                    <p className="text-sm font-black text-green-400">+{selectedResultHistory.totalCoins} <span className="text-[10px] text-gray-500">Coins</span></p>
                  </div>
                  <Coins size={16} className="text-green-500/30" />
                </div>
                <div className="bg-[#0A0F1C] p-2.5 rounded-xl border border-gray-800/80 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Records</p>
                    <p className="text-sm font-black text-white">{selectedResultHistory.records.length}</p>
                  </div>
                  <Users size={16} className="text-blue-500/30" />
                </div>
              </div>

              <div className="overflow-y-auto pr-2 space-y-2 relative z-10 custom-scrollbar flex-1 min-h-[200px]">
                {selectedResultHistory.records.filter((record: any) => 
                  (record.userName || '').toLowerCase().includes(modalResultsSearch.toLowerCase())
                ).map((record: any, idx: number) => {
                  const user = users.find(u => u.id === record.userId);
                  return (
                  <div key={idx} className="bg-[#0A0F1C] p-3 rounded-xl border border-gray-800/50 hover:border-gray-700 transition-colors relative group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm ${record.type === 'Kills' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                          {(record.userName || user?.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm leading-tight">{record.userName || user?.username}</p>
                          <p className="text-[9px] text-gray-500 font-mono">{record.email || user?.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-green-400">+{record.amount}</p>
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{formatDate(record.createdAt?.toDate?.()?.toISOString() || new Date().toISOString())}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-[#131B2F]/50 p-2 rounded-lg border border-gray-800/50">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 flex items-center gap-1"><User size={8}/> IGN</p>
                        <p className="text-[10px] font-bold text-white truncate">{record.ign || users.find(u => u.id === record.userId)?.freeFireName || 'N/A'}</p>
                      </div>
                      <div className="bg-[#131B2F]/50 p-2 rounded-lg border border-gray-800/50">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 flex items-center gap-1"><Gamepad2 size={8}/> UID</p>
                        <p className="text-[10px] font-bold text-white truncate">{record.uid || users.find(u => u.id === record.userId)?.freeFireId || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 ${record.type === 'Kills' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                          {record.type === 'Kills' ? <Crosshair size={10} /> : <Trophy size={10} />}
                          {record.type}
                        </span>
                        {record.type === 'Kills' && record.kills && (
                          <span className="text-[9px] text-gray-400 font-medium bg-gray-800/50 px-1.5 py-0.5 rounded-md border border-gray-700/50">{record.kills} Kills</span>
                        )}
                        {record.type === 'Winning' && user?.winStreak > 0 && (
                          <span className="text-[9px] text-orange-400 font-medium bg-orange-500/10 px-1.5 py-0.5 rounded-md border border-orange-500/20 flex items-center gap-1"><Flame size={9}/> {user.winStreak} Streak</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setEditingResultRecord(record)}
                          disabled={isModalProcessing || isEditingResultProcessing}
                          className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors border border-transparent hover:border-blue-500/20 disabled:opacity-50"
                          title="Edit Result"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Revert Result',
                              message: `Are you sure you want to revert this ${record.type} result for ${record.userName}? This will deduct ${record.amount} coins from their wallet.`,
                              action: async () => {
                                try {
                                  const userUpdate: any = {
                                    walletBalance: increment(-record.amount)
                                  };
                                  
                                  if (record.type === 'Winning') {
                                    userUpdate.winStreak = increment(-1);
                                    userUpdate.totalWins = increment(-1);
                                  }
                                  
                                  await updateDoc(doc(db, 'users', record.userId), userUpdate);

                                  if (record.registrationId) {
                                    const regUpdate: any = { resultSubmitted: false };
                                    if (record.type === 'Winning') {
                                      regUpdate.won = false;
                                      regUpdate.winningAmount = deleteField();
                                    } else if (record.type === 'Kills' && record.kills) {
                                      regUpdate.kills = increment(-record.kills);
                                    }
                                    await updateDoc(doc(db, 'registrations', record.registrationId), regUpdate);
                                  }

                                  if (record.type === 'Winning') {
                                    const txQuery = query(collection(db, 'transactions'), where('userId', '==', record.userId), where('description', '==', `Winning Of ${record.tournamentName}`));
                                    const txSnapshot = await getDocs(txQuery);
                                    txSnapshot.forEach(async (docSnap) => await deleteDoc(docSnap.ref));

                                    const notifQuery = query(collection(db, 'notifications'), where('userId', '==', record.userId), where('message', '==', `Winning Of ${record.tournamentName} has been added`));
                                    const notifSnapshot = await getDocs(notifQuery);
                                    notifSnapshot.forEach(async (docSnap) => await deleteDoc(docSnap.ref));
                                  }

                                  await deleteDoc(doc(db, 'resultsHistory', record.id));

                                  showToast(`Result reverted successfully.`);
                                  setSelectedResultHistory(null);
                                  setResultsTab('pending');
                                  
                                  const q = query(collection(db, 'registrations'), where('tournamentId', '==', record.tournamentId));
                                  onSnapshot(q, (snapshot) => {
                                    setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                                    setViewingResults(record.tournamentId);
                                  });
                                } catch (error) {
                                  console.error('Error reverting result:', error);
                                  showToast('Failed to revert result', 'error');
                                }
                              }
                            });
                          }}
                          disabled={isModalProcessing || isEditingResultProcessing}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20 disabled:opacity-50"
                          title="Revert Result"
                        >
                          <ArrowDownUp size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              <button 
                onClick={() => setSelectedResultHistory(null)}
                className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3.5 rounded-xl transition-colors border border-gray-700 uppercase tracking-widest text-sm shrink-0 relative z-10"
              >
                Close Details
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -100, x: "-50%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-6 left-1/2 z-[1000] w-[calc(100%-2rem)] max-w-lg"
          >
            <div className={`relative overflow-hidden rounded-2xl border-2 shadow-2xl p-5 flex items-start gap-4 ${
              toast.type === 'success' 
                ? 'bg-[#064E3B] border-[#10B981] text-white' 
                : 'bg-[#7F1D1D] border-[#EF4444] text-white'
            }`}>
              
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  toast.type === 'success' ? 'bg-[#10B981]/20 border-[#10B981]' : 'bg-[#EF4444]/20 border-[#EF4444]'
                }`}>
                  {toast.type === 'success' ? <CheckCircle2 size={20} strokeWidth={3} className="text-[#10B981]" /> : <XCircle size={20} strokeWidth={3} className="text-[#EF4444]" />}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 z-10 pr-8">
                <p className="text-[15px] font-bold leading-snug">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setToast(null)} 
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 z-10"
              >
                <X size={20} />
              </button>

              {/* Progress Bar */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-1.5 ${
                  toast.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                }`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instant Result Edit Modal */}
      <AnimatePresence>
        {editingResultRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-gradient-to-b from-[#131B2F] to-[#0B1121] rounded-3xl p-6 w-full max-w-md border border-gray-800 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Edit2 size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">Edit Result</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{editingResultRecord.userName}</p>
                  </div>
                </div>
                <button onClick={() => setEditingResultRecord(null)} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newAmount = parseInt(formData.get('amount') as string);
                const newKills = parseInt(formData.get('kills') as string) || 0;
                const newWon = formData.get('won') === 'on';
                const newWinStreak = parseInt(formData.get('winStreak') as string);

                if (isNaN(newAmount)) {
                  showToast('Invalid amount', 'error');
                  return;
                }

                try {
                  setIsEditingResultProcessing(true);
                  const amountDiff = newAmount - editingResultRecord.amount;
                  const user = users.find(u => u.id === editingResultRecord.userId);

                  // 1. Update User Wallet and Stats
                  const userRef = doc(db, 'users', editingResultRecord.userId);
                  const userUpdate: any = {
                    walletBalance: increment(amountDiff)
                  };

                  if (editingResultRecord.type === 'Winning') {
                    // If won status changed from won to not won
                    if (!newWon) {
                      userUpdate.winStreak = increment(-1);
                      userUpdate.totalWins = increment(-1);
                    }
                    
                    if (!isNaN(newWinStreak) && user) {
                      userUpdate.winStreak = newWinStreak;
                    }
                  }
                  
                  await updateDoc(userRef, userUpdate);

                  // 2. Update Registration
                  if (editingResultRecord.registrationId) {
                    const regRef = doc(db, 'registrations', editingResultRecord.registrationId);
                    const regUpdate: any = {};
                    if (editingResultRecord.type === 'Winning') {
                      regUpdate.winningAmount = newAmount;
                      regUpdate.won = newWon;
                    } else if (editingResultRecord.type === 'Kills') {
                      regUpdate.kills = newKills;
                      regUpdate.winningAmount = newAmount;
                      // If they were not a winner but now they are
                      if (newWon) {
                        regUpdate.won = true;
                      }
                    }
                    await updateDoc(regRef, regUpdate);
                  }

                  // 3. Update Transaction
                  const txQuery = query(collection(db, 'transactions'), 
                    where('userId', '==', editingResultRecord.userId), 
                    where('description', '==', `Winning Of ${editingResultRecord.tournamentName}`)
                  );
                  const txSnapshot = await getDocs(txQuery);
                  const txUpdatePromises = txSnapshot.docs.map(docSnap => updateDoc(docSnap.ref, { amount: newAmount }));
                  await Promise.all(txUpdatePromises);

                  // 4. Update Result History
                  await updateDoc(doc(db, 'resultsHistory', editingResultRecord.id), {
                    amount: newAmount,
                    kills: newKills,
                    type: newWon ? 'Winning' : 'Kills',
                    updatedAt: serverTimestamp()
                  });

                  showToast('Result updated instantly!');
                  setEditingResultRecord(null);
                  if (selectedResultHistory) {
                    const updatedRecords = selectedResultHistory.records.map((r: any) => 
                      r.id === editingResultRecord.id ? { ...r, amount: newAmount, kills: newKills } : r
                    );
                    setSelectedResultHistory({
                      ...selectedResultHistory,
                      records: updatedRecords,
                      totalCoins: selectedResultHistory.totalCoins + amountDiff
                    });
                  }
                } catch (error) {
                  console.error('Error updating result:', error);
                  showToast('Failed to update result', 'error');
                } finally {
                  setIsEditingResultProcessing(false);
                }
              }}>
                <div className="space-y-4">
                  <div className="bg-[#0A0F1C] p-4 rounded-2xl border border-gray-800/50 mb-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Current Record Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase font-bold">Type</p>
                        <p className="text-sm font-bold text-white">{editingResultRecord.type}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase font-bold">Tournament</p>
                        <p className="text-sm font-bold text-white truncate">{editingResultRecord.tournamentName}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Winning Amount</label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input 
                        name="amount"
                        type="number"
                        defaultValue={editingResultRecord.amount}
                        className="w-full bg-[#0A0F1C] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="Enter amount"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Kills Count</label>
                    <div className="relative">
                      <Crosshair className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input 
                        name="kills"
                        type="number"
                        defaultValue={editingResultRecord.kills || 0}
                        className="w-full bg-[#0A0F1C] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="Enter kills"
                        required
                      />
                    </div>
                  </div>

                  {editingResultRecord.type === 'Winning' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Win Streak</label>
                        <div className="relative">
                          <Flame className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                          <input 
                            name="winStreak"
                            type="number"
                            defaultValue={users.find(u => u.id === editingResultRecord.userId)?.winStreak || 0}
                            className="w-full bg-[#0A0F1C] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all"
                            placeholder="Enter win streak"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-[#0A0F1C] p-3 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-2">
                          <Trophy size={16} className="text-yellow-500" />
                          <span className="text-xs font-bold text-white">Winner Status</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input name="won" type="checkbox" defaultChecked={editingResultRecord.type === 'Winning'} className="sr-only peer" />
                          <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                    </>
                  )}

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setEditingResultRecord(null)}
                      disabled={isEditingResultProcessing}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isEditingResultProcessing}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {isEditingResultProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tournament Created Success & Push Modal */}
      <AnimatePresence>
        {isTournamentCreatedModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsTournamentCreatedModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0F172A] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">Tournament Created!</h3>
              <p className="text-gray-400 text-sm mb-6">Your tournament has been successfully created. Would you like to notify all users?</p>

              <div className="bg-[#131B2F] rounded-xl p-4 border border-gray-800 mb-6 text-left space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Notification Title</label>
                  <input 
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    disabled={isSendingPush}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Enter title"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Notification Message</label>
                  <textarea 
                    value={notificationBody}
                    onChange={(e) => setNotificationBody(e.target.value)}
                    disabled={isSendingPush}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
                    placeholder="Enter message"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Preview</label>
                  <div className="bg-white rounded-lg p-3 shadow-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                      <Bell size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{notificationTitle || 'Notification Title'}</p>
                      <p className="text-xs text-gray-600 line-clamp-2">{notificationBody || 'Notification message...'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsTournamentCreatedModalOpen(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Skip
                </button>
                <button 
                  onClick={handleSendNewTournamentPush}
                  disabled={isSendingPush}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  {isSendingPush ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  Send Notification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Notification Modal */}
      <AnimatePresence>
        {isTxNotificationModalOpen && txNotificationData && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsTxNotificationModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0F172A] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-center"
            >
              <div className={`w-16 h-16 ${txNotificationData.type === 'deposit' ? 'bg-yellow-500/10' : 'bg-purple-500/10'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                {txNotificationData.type === 'deposit' ? (
                  <DollarSign size={32} className="text-yellow-500" />
                ) : (
                  <ArrowDownUp size={32} className="text-purple-500" />
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">{txNotificationData.type === 'deposit' ? 'Deposit Approved!' : 'Withdrawal Approved!'}</h3>
              <p className="text-gray-400 text-sm mb-6">Transaction has been approved. Notify the user?</p>

              <div className="bg-[#131B2F] rounded-xl p-4 border border-gray-800 mb-6 text-left space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Notification Title</label>
                  <input 
                    type="text"
                    value={txNotificationData.title}
                    onChange={(e) => setTxNotificationData({...txNotificationData, title: e.target.value})}
                    disabled={isSendingPush}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Enter title"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Notification Message</label>
                  <textarea 
                    value={txNotificationData.body}
                    onChange={(e) => setTxNotificationData({...txNotificationData, body: e.target.value})}
                    disabled={isSendingPush}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
                    placeholder="Enter message"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Preview</label>
                  <div className="bg-white rounded-lg p-3 shadow-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                      <Bell size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{txNotificationData.title || 'Notification Title'}</p>
                      <p className="text-xs text-gray-600 line-clamp-2">{txNotificationData.body || 'Notification message...'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsTxNotificationModalOpen(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Skip
                </button>
                <button 
                  onClick={handleSendTxPush}
                  disabled={isSendingPush}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  {isSendingPush ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  Send Notification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tournament Slots Modal */}
      <AnimatePresence>
        {viewingSlotsTournament && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setViewingSlotsTournament(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#0F172A] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-[#131B2F]">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="text-purple-500" size={24} />
                    Tournament Slots
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {viewingSlotsTournament.title} • {registrations.length}/{viewingSlotsTournament.totalSlots || 48} Players
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search player..." 
                      value={playerSearchTerm}
                      onChange={(e) => setPlayerSearchTerm(e.target.value)}
                      className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setViewingSlotsTournament(null)}
                    className="p-2 hover:bg-gray-800 rounded-full text-gray-400 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#0B1121]/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {registrations.filter(reg => 
                    reg.freeFireName?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                    reg.freeFireId?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                    reg.accountName?.toLowerCase().includes(playerSearchTerm.toLowerCase())
                  ).map(reg => (
                    <div key={reg.id} className="bg-[#131B2F] p-4 rounded-2xl border border-gray-800 hover:border-purple-500/30 transition-all group">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Account Name</p>
                            <p className="font-bold text-white text-lg leading-tight">{reg.accountName}</p>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${reg.won ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                            {reg.won ? 'Winner' : 'Joined'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Player Name</p>
                            <p className="font-bold text-gray-300 truncate text-sm">{reg.freeFireName}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Player ID</p>
                            <p className="font-mono text-gray-300 truncate text-sm">{reg.freeFireId}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Phone</p>
                            <p className="text-gray-400 text-xs font-medium">{reg.phoneNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Email</p>
                            <p className="text-gray-400 text-xs font-medium truncate">{reg.email}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-800/50 flex items-center justify-between">
                          <div>
                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-0.5">Joined At</p>
                            <p className="text-gray-400 text-[10px]">
                              {reg.joinedAt?.toDate ? reg.joinedAt.toDate().toLocaleString('en-GB', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                              }) : 'N/A'}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Gamepad2 size={14} className="text-purple-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {registrations.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-[#131B2F] rounded-3xl border border-dashed border-gray-800">
                      <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="text-gray-600" size={40}/>
                      </div>
                      <h4 className="text-white font-bold text-lg">No slots filled yet</h4>
                      <p className="text-gray-500 text-sm mt-1">Players who join this tournament will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
