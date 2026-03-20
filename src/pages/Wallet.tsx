import { useState, useEffect } from 'react';
import { ArrowLeft, Wallet as WalletIcon, CreditCard, ArrowRight, Star, Flame, Diamond, ArrowDownUp, History, Plus, Coins, CheckCircle, X, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import BuyCoinsModal from '../components/BuyCoinsModal';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, setDoc, updateDoc, increment, addDoc, collection, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface Transaction {
  id: string;
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'rejected';
  paymentMethod?: string;
  accountNumber?: string;
  proofUrl?: string;
}

export default function Wallet() {
  const [user] = useAuthState(auth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  
  const [balance, setBalance] = useState(0);
  const [minDeposit, setMinDeposit] = useState(50);
  const [minWithdrawal, setMinWithdrawal] = useState(100);
  const [paymentMethods, setPaymentMethods] = useState<{ name: string; enabled: boolean; details: string; imageUrl?: string }[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch transaction settings
    const unsubSettings = onSnapshot(doc(db, 'admin', 'transaction_settings'), (doc) => {
      if (doc.exists()) {
        setMinDeposit(doc.data().minDeposit || 50);
        setMinWithdrawal(doc.data().minWithdrawal || 100);
      }
    });

    // Fetch payment methods
    const unsubPaymentMethods = onSnapshot(collection(db, 'payment_methods'), (snapshot) => {
      const methods = snapshot.docs.map(doc => ({
        name: doc.data().name,
        enabled: doc.data().enabled,
        details: doc.data().details,
        imageUrl: doc.data().imageUrl
      }));
      setPaymentMethods(methods);
    });

    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().walletBalance || 0);
      } else {
        await setDoc(userRef, {
          email: user.email,
          walletBalance: 1000,
          createdAt: new Date()
        });
        setBalance(1000);
      }
    });
    const txQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      
      // Sort by date descending locally since we don't have a composite index
      txData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setTransactions(txData);
    });

    return () => {
      unsubSettings();
      unsubscribeUser();
      unsubscribeTx();
    };
  }, [user]);

  const openModal = (amount: string = '') => {
    setInitialAmount(amount);
    setIsModalOpen(true);
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const handleDepositSubmit = async (amount: number, paymentMethod: string, file: File) => {
    if (!user) return;

    try {
      showNotification('Uploading proof and submitting request...', 'success');
      
      // Upload proof image to ImgBB
      const formData = new FormData();
      formData.append('image', file);
      
      // Use environment variable for ImgBB API key, fallback to a placeholder if not set
      const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY || 'YOUR_IMGBB_API_KEY_HERE'; 
      
      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: 'POST',
        body: formData
      });
      
      const imgbbData = await imgbbRes.json();
      
      if (!imgbbData.success) {
        throw new Error('Failed to upload image to ImgBB');
      }
      
      const proofUrl = imgbbData.data.url;

      // Create pending transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        userEmail: user.email,
        type: 'Deposit',
        amount: amount,
        paymentMethod: paymentMethod,
        proofUrl: proofUrl,
        status: 'pending',
        date: new Date().toLocaleDateString(),
        createdAt: new Date()
      });

      showNotification(`Deposit request for ${amount} coins submitted! Waiting for admin approval.`, 'success');
    } catch (error) {
      console.error("Error submitting deposit:", error);
      showNotification('Failed to submit deposit. Please check your ImgBB API key or try again.', 'error');
    }
  };

  const handleWithdrawalSubmit = async () => {
    const amount = parseInt(withdrawalAmount);
    
    if (!withdrawalAmount || isNaN(amount)) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    if (amount < minWithdrawal) {
      showNotification(`Minimum withdrawal is ${minWithdrawal} coins`, 'error');
      return;
    }

    if (amount > balance) {
      showNotification('Insufficient Balance', 'error');
      return;
    }

    if (!accountNumber) {
      showNotification('Please enter your account number', 'error');
      return;
    }

    if (!user) return;

    setIsSubmittingWithdrawal(true);

    try {
      // 1. Deduct balance immediately to prevent double spending
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        walletBalance: increment(-amount)
      });

      // 2. Create withdrawal transaction record
      const paymentMethodElement = document.getElementById('withdrawalMethod') as HTMLSelectElement;
      const paymentMethod = paymentMethodElement ? paymentMethodElement.value : 'Unknown';

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        userEmail: user.email,
        type: 'Withdrawal',
        amount: amount,
        paymentMethod: paymentMethod,
        accountNumber: accountNumber,
        accountName: accountName,
        status: 'pending',
        date: new Date().toLocaleDateString(),
        createdAt: new Date()
      });
      
      setWithdrawalAmount('');
      setAccountNumber('');
      setAccountName('');
      
      showNotification('Withdrawal request submitted! Coins deducted.', 'success');

    } catch (error) {
      console.error("Error processing withdrawal:", error);
      showNotification('Failed to process withdrawal. Please try again.', 'error');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 font-sans relative">
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-4 right-4 z-50 border p-4 rounded-xl shadow-lg flex items-start ${
              toastType === 'success' 
                ? 'bg-green-900/90 border-green-500 text-white' 
                : 'bg-red-900/90 border-red-500 text-white'
            }`}
          >
            {toastType === 'success' ? (
              <CheckCircle className="text-green-400 mr-3 mt-0.5 flex-shrink-0" size={20} />
            ) : (
              <AlertCircle className="text-red-400 mr-3 mt-0.5 flex-shrink-0" size={20} />
            )}
            <div className="flex-1">
              <p className="font-medium text-sm">{toastMessage}</p>
            </div>
            <button onClick={() => setShowToast(false)} className={`ml-2 ${toastType === 'success' ? 'text-green-200 hover:text-white' : 'text-red-200 hover:text-white'}`}>
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto">
        {/* Back to Dashboard */}
        <Link to="/" className="flex items-center text-blue-400 mb-6 hover:text-blue-300">
          <ArrowLeft size={20} className="mr-2" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <WalletIcon size={32} className="text-yellow-400 mr-3" />
            <h1 className="text-3xl font-bold text-yellow-400">My Wallet</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Manage your coins, purchases, and withdrawals
          </p>
        </div>

        {/* Available Balance Card */}
        <div className="bg-gradient-to-br from-[#1E293B] to-[#2D2416] rounded-2xl p-6 mb-8 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden">
          <div className="flex items-center text-gray-300 mb-4">
            <WalletIcon size={20} className="mr-2" />
            <span>Available Balance</span>
          </div>
          <div className="flex items-center mb-1">
            <div className="relative mr-3">
              <Coins size={40} className="text-yellow-400" />
            </div>
            <span className="text-6xl font-bold text-yellow-400">{balance}</span>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            coins • ≈ {balance} PKR
          </p>
          <button 
            onClick={() => openModal()}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Buy Coins
          </button>
        </div>

        {/* Purchase Coins Section */}
        <div className="bg-[#0B1120] rounded-2xl p-6 mb-8 border border-gray-800">
          <div className="flex items-start mb-6">
            <div className="bg-green-500/10 p-3 rounded-xl mr-4">
              <Coins size={24} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Purchase Coins</h2>
              <div className="bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-lg inline-block mt-2">
                <p className="text-green-500 text-xs font-bold uppercase tracking-wider">Min Deposit: {minDeposit} PKR</p>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-[#131B2F] rounded-xl p-5 border border-blue-900/50 mb-6">
            <div className="flex items-center text-blue-400 font-semibold mb-3">
              <ArrowRight size={18} className="mr-2" />
              Payment Instructions
            </div>
            <p className="text-gray-300 text-sm mb-3">
              <span className="font-bold text-blue-400">Methods:</span> NayaPay, Sadapay, JazzCash, EasyPaisa
            </p>
            <p className="text-gray-300 text-sm mb-5">
              Upload payment screenshot after transfer. Admin verifies within 24 hours.
            </p>
            
            <div className="border-t border-gray-800 pt-4 mb-4">
              <p className="text-blue-400 font-semibold text-sm mb-3">Payment Account Numbers:</p>
              
              <div className="space-y-3">
                {paymentMethods.filter(m => m.enabled).map((method) => (
                  <div key={method.name} className="bg-[#0B1120] p-3 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-xs mb-1">{method.name}</p>
                    <p className="text-yellow-400 font-bold text-lg tracking-wider">{method.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coin Packages */}
          <div className="space-y-4">
            {/* 50 Coins */}
            <div className="bg-[#131B2F] rounded-2xl p-6 border border-gray-800 text-center flex flex-col items-center">
              <Star size={40} className="text-yellow-400 mb-3 fill-yellow-400" />
              <h3 className="text-2xl font-bold mb-1">50 Coins</h3>
              <p className="text-gray-400 text-sm mb-3">Starter</p>
              <p className="text-3xl font-bold text-yellow-400 mb-5">50 PKR</p>
              <button 
                onClick={() => openModal('50')}
                className="w-full bg-[#1E293B] hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Buy Now
              </button>
            </div>

            {/* 100 Coins */}
            <div className="bg-[#131B2F] rounded-2xl p-6 border border-yellow-500 text-center flex flex-col items-center relative shadow-[0_0_15px_rgba(234,179,8,0.1)]">
              <div className="absolute -top-3 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <Flame size={40} className="text-orange-500 mb-3 fill-orange-500" />
              <h3 className="text-2xl font-bold mb-1">100 Coins</h3>
              <p className="text-gray-400 text-sm mb-3">Popular</p>
              <p className="text-3xl font-bold text-yellow-400 mb-5">100 PKR</p>
              <button 
                onClick={() => openModal('100')}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl transition-colors"
              >
                Buy Now
              </button>
            </div>

            {/* 250 Coins */}
            <div className="bg-[#131B2F] rounded-2xl p-6 border border-gray-800 text-center flex flex-col items-center">
              <Diamond size={40} className="text-blue-400 mb-3 fill-blue-400" />
              <h3 className="text-2xl font-bold mb-1">250 Coins</h3>
              <p className="text-gray-400 text-sm mb-3">Best Value</p>
              <p className="text-3xl font-bold text-yellow-400 mb-5">250 PKR</p>
              <button 
                onClick={() => openModal('250')}
                className="w-full bg-[#1E293B] hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Withdraw Coins Section */}
        <div className="bg-[#0B1120] rounded-2xl p-6 mb-8 border border-gray-800">
          <div className="flex items-start mb-6">
            <div className="bg-purple-900/30 p-3 rounded-xl mr-4">
              <ArrowDownUp size={24} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Withdrawals</h2>
              <p className="text-white text-lg">Balance: <span className="text-yellow-400 font-bold">{balance} coins</span></p>
            </div>
          </div>

          <div className="bg-[#2D1A1A] border border-orange-900/50 rounded-xl p-4 mb-6">
            <p className="text-gray-300 text-sm">
              <span className="text-orange-500 font-bold">Limits:</span> Min {minWithdrawal} coins • Max 1,200 coins per request
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Amount (Coins)</label>
              <input 
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="e.g. 500" 
                disabled={isSubmittingWithdrawal}
                className="w-full bg-[#131B2F] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-gray-500 text-xs mt-2">Available: {balance} coins</p>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Payment Method</label>
              <select id="withdrawalMethod" disabled={isSubmittingWithdrawal} className="w-full bg-[#131B2F] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed">
                {paymentMethods.filter(m => m.enabled).map((method) => (
                  <option key={method.name} value={method.name}>{method.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Your Account Number / IBAN<br/><span className="text-gray-400 text-xs">(JazzCash / EasyPaisa / Bank)</span></label>
              <input 
                type="text" 
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g., 03001234567 (JazzCash/I" 
                disabled={isSubmittingWithdrawal}
                className="w-full bg-[#131B2F] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Account Holder Name</label>
              <input 
                type="text" 
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., John Doe" 
                disabled={isSubmittingWithdrawal}
                className="w-full bg-[#131B2F] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button 
              onClick={handleWithdrawalSubmit}
              disabled={isSubmittingWithdrawal}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors mt-2 shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmittingWithdrawal ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                'Submit Withdrawal Request'
              )}
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#0B1120] rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-blue-900/30 p-2 rounded-lg mr-3">
                <History size={20} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-bold">Recent</h2>
            </div>
            <Link to="/transactions" className="text-blue-400 text-sm hover:text-blue-300 flex items-center">
              View All <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>

          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-[#131B2F] rounded-xl p-4 border border-gray-800 flex justify-between items-center">
                <div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded mb-2 inline-block ${
                    tx.type === 'Deposit' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                  }`}>
                    {tx.type}
                  </span>
                  <p className={`font-bold text-lg ${tx.type === 'Deposit' ? 'text-yellow-400' : 'text-white'}`}>
                    {tx.type === 'Deposit' ? '+' : '-'}{tx.amount} coins
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-sm mb-2">{tx.date}</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                    tx.status === 'completed' 
                      ? 'bg-green-900/40 text-green-500 border-green-700/50' 
                      : tx.status === 'rejected'
                      ? 'bg-red-900/40 text-red-500 border-red-700/50'
                      : 'bg-yellow-900/40 text-yellow-500 border-yellow-700/50'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
            
            {transactions.length === 0 && (
              <p className="text-center text-gray-500 py-4">No recent transactions</p>
            )}
          </div>
        </div>

      </div>

      <BuyCoinsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialAmount={initialAmount} 
        onSubmit={handleDepositSubmit}
        minDeposit={minDeposit}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}
