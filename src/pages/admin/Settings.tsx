import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, addDoc, serverTimestamp, increment, setDoc } from 'firebase/firestore';
import { 
  Settings as SettingsIcon, Save, CheckCircle2, XCircle, Loader2, 
  Trophy, UserPlus, Users, DollarSign, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const [leaderboardSettings, setLeaderboardSettings] = useState<any>(null);
  const [championName, setChampionName] = useState('');
  const [referralSettings, setReferralSettings] = useState<any>(null);
  const [referralRequests, setReferralRequests] = useState<any[]>([]);
  const [accessKey, setAccessKey] = useState('');
  const [newAccessKey, setNewAccessKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [referrerAmount, setReferrerAmount] = useState('');
  const [refereeAmount, setRefereeAmount] = useState('');
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [minDeposit, setMinDeposit] = useState('');
  const [minWithdrawal, setMinWithdrawal] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<{ name: string; isEnabled: boolean; accountNumber: string }[]>([]);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodAccount, setNewMethodAccount] = useState('');

  useEffect(() => {
    // ... existing effects ...
    const unsubTransactions = onSnapshot(doc(db, 'admin', 'transaction_settings'), (docSnap) => {
      if (docSnap.exists()) {
        setMinDeposit(docSnap.data().minDeposit?.toString() || '50');
        setMinWithdrawal(docSnap.data().minWithdrawal?.toString() || '50');
      } else {
        setDoc(doc(db, 'admin', 'transaction_settings'), { minDeposit: 50, minWithdrawal: 50 }, { merge: true });
      }
    });

    const unsubPaymentMethods = onSnapshot(doc(db, 'admin', 'payment_methods'), (doc) => {
      if (doc.exists()) {
        setPaymentMethods(doc.data().methods || []);
      }
    });

    // ... existing effects ...

    return () => {
      // ... existing cleanup ...
      unsubTransactions();
      unsubPaymentMethods();
    };
  }, []);

  const handleSaveLeaderboard = async () => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'admin', 'leaderboard_settings'), {
        championName,
        updatedAt: serverTimestamp()
      });
      showToast('Leaderboard settings updated');
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      showToast('Failed to update leaderboard', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTransactionSettings = async () => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'admin', 'transaction_settings'), {
        minDeposit: Number(minDeposit),
        minWithdrawal: Number(minWithdrawal),
        updatedAt: serverTimestamp()
      });
      showToast('Transaction limits updated');
    } catch (error) {
      console.error('Error updating limits:', error);
      showToast('Failed to update limits', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  const handleSavePaymentMethods = async (updatedMethods: any[]) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'admin', 'payment_methods'), {
        methods: updatedMethods,
        updatedAt: serverTimestamp()
      });
      showToast('Payment methods updated');
    } catch (error) {
      console.error('Error updating payment methods:', error);
      showToast('Failed to update payment methods', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveReferral = async () => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'admin', 'referral_settings'), {
        referrerAmount: Number(referrerAmount),
        refereeAmount: Number(refereeAmount),
        enabled: referralEnabled,
        updatedAt: serverTimestamp()
      });
      showToast('Referral settings updated');
    } catch (error) {
      console.error('Error updating referral:', error);
      showToast('Failed to update settings', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAccessKey = async () => {
    if (!newAccessKey) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'admin', 'access_config'), {
        key: newAccessKey,
        updatedAt: serverTimestamp()
      });
      showToast('Admin access key updated');
      setNewAccessKey('');
    } catch (error) {
      console.error('Error updating access key:', error);
      showToast('Failed to update access key', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAccessKey(result);
  };

  const handleReferralRequest = async (req: any, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      
      // Update request status
      await updateDoc(doc(db, 'referral_requests', req.id), { status });

      if (action === 'approve') {
        // Add coins to referrer
        await updateDoc(doc(db, 'users', req.referrerId), {
          bonusBalance: increment(Number(referrerAmount))
        });
        
        // Add coins to referee (new user)
        await updateDoc(doc(db, 'users', req.userId), {
          bonusBalance: increment(Number(refereeAmount))
        });

        // Notify Referrer
        await addDoc(collection(db, 'notifications'), {
          userId: req.referrerId,
          message: `Referral approved! You earned ${referrerAmount} bonus coins.`,
          read: false,
          createdAt: serverTimestamp(),
          type: 'success'
        });

        // Notify Referee
        await addDoc(collection(db, 'notifications'), {
          userId: req.userId,
          message: `Welcome bonus! You earned ${refereeAmount} bonus coins from referral.`,
          read: false,
          createdAt: serverTimestamp(),
          type: 'success'
        });
      }

      showToast(`Referral request ${status}`);
    } catch (error) {
      console.error('Error processing referral:', error);
      showToast('Failed to process request', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm">Manage global configurations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Leaderboard Settings */}
        <div className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
              <Trophy size={20} className="text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Leaderboard</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">All-Time Champion Name</label>
              <input 
                type="text" 
                value={championName}
                onChange={(e) => setChampionName(e.target.value)}
                placeholder="e.g. ProGamer123"
                className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
              <p className="text-[10px] text-gray-500 mt-1">This name will be displayed as the All-Time Champion on the leaderboard.</p>
            </div>

            <button 
              onClick={handleSaveLeaderboard}
              disabled={isProcessing}
              className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-600/20"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Changes
            </button>
          </div>
        </div>

        {/* Referral Settings */}
        <div className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <UserPlus size={20} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Referral System</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#0B1121] p-3 rounded-xl border border-gray-800">
              <span className="text-sm font-bold text-gray-300">Enable Referrals</span>
              <button 
                onClick={() => setReferralEnabled(!referralEnabled)}
                className={`w-12 h-6 rounded-full relative transition-colors ${referralEnabled ? 'bg-green-600' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${referralEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Referrer Bonus</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="number" 
                    value={referrerAmount}
                    onChange={(e) => setReferrerAmount(e.target.value)}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Referee Bonus</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="number" 
                    value={refereeAmount}
                    onChange={(e) => setRefereeAmount(e.target.value)}
                    className="w-full bg-[#0B1121] border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveReferral}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Changes
            </button>
          </div>
        </div>

        {/* Transaction Settings */}
        <div className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <DollarSign size={20} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Transaction Limits</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Deposit</label>
                <input 
                  type="number" 
                  value={minDeposit}
                  onChange={(e) => setMinDeposit(e.target.value)}
                  className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Withdrawal</label>
                <input 
                  type="number" 
                  value={minWithdrawal}
                  onChange={(e) => setMinWithdrawal(e.target.value)}
                  className="w-full bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveTransactionSettings}
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Limits
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <DollarSign size={20} className="text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Payment Methods</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method, index) => (
                <div key={index} className="bg-[#0B1121] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{method.name}</p>
                    <p className="text-xs text-gray-500">{method.accountNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const updated = [...paymentMethods];
                        updated[index].isEnabled = !updated[index].isEnabled;
                        handleSavePaymentMethods(updated);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${method.isEnabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                      {method.isEnabled ? 'Shown' : 'Hidden'}
                    </button>
                    <button 
                      onClick={() => {
                        const updated = paymentMethods.filter((_, i) => i !== index);
                        handleSavePaymentMethods(updated);
                      }}
                      className="text-red-500 hover:text-red-400"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-800">
              <input 
                type="text" 
                value={newMethodName}
                onChange={(e) => setNewMethodName(e.target.value)}
                placeholder="Method Name (e.g. JazzCash)"
                className="flex-1 bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <input 
                type="text" 
                value={newMethodAccount}
                onChange={(e) => setNewMethodAccount(e.target.value)}
                placeholder="Account Number"
                className="flex-1 bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button 
                onClick={() => {
                  if (!newMethodName || !newMethodAccount) return;
                  handleSavePaymentMethods([...paymentMethods, { name: newMethodName, isEnabled: true, accountNumber: newMethodAccount }]);
                  setNewMethodName('');
                  setNewMethodAccount('');
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl font-bold text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Admin Access Key Settings */}
        <div className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <ShieldAlert size={20} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Admin Access Key</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Key</label>
              <div className="bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white font-mono text-sm">
                {accessKey || 'Not Set'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Access Key</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newAccessKey}
                  onChange={(e) => setNewAccessKey(e.target.value)}
                  placeholder="Enter or generate key"
                  className="flex-1 bg-[#0B1121] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors font-mono"
                />
                <button 
                  onClick={generateRandomKey}
                  className="px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-xs"
                >
                  Generate
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">This key is required to access the admin panel from any device.</p>
            </div>

            <button 
              onClick={handleUpdateAccessKey}
              disabled={isProcessing || !newAccessKey}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Update Access Key
            </button>
          </div>
        </div>
      </div>

      {/* Referral Requests */}
      <div className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Users size={20} className="text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Pending Referrals</h3>
        </div>

        <div className="space-y-3">
          {referralRequests.filter(r => r.status === 'pending').map(req => (
            <div key={req.id} className="bg-[#0B1121] border border-gray-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-white text-sm">New User: {req.userEmail}</p>
                <p className="text-xs text-gray-500">Referred by: {req.referrerEmail}</p>
                <p className="text-[10px] text-gray-600 mt-1">{req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : 'Just now'}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleReferralRequest(req, 'approve')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Approve
                </button>
                <button 
                  onClick={() => handleReferralRequest(req, 'reject')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>
            </div>
          ))}
          {referralRequests.filter(r => r.status === 'pending').length === 0 && (
            <div className="text-center py-10 text-gray-500">No pending referral requests.</div>
          )}
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
