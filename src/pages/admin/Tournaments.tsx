import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, orderBy, addDoc, serverTimestamp, increment, writeBatch, getDocs, deleteField } from 'firebase/firestore';
import { 
  Trophy, Plus, Trash2, Edit2, Eye, EyeOff, CheckCircle2, XCircle, 
  Clock, Calendar, Users, Gamepad2, AlertTriangle, Search, Filter,
  ArrowDownUp, Award, History, Crosshair, Flame, Coins, Phone, Mail, User, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [resultsHistory, setResultsHistory] = useState<any[]>([]);
  const [viewingResults, setViewingResults] = useState<string | null>(null);
  const [resultsTab, setResultsTab] = useState<'pending' | 'added' | 'history'>('pending');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void} | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  // Results Management State
  const [winningAmounts, setWinningAmounts] = useState<{[key: string]: string}>({});
  const [killsAmounts, setKillsAmounts] = useState<{[key: string]: string}>({});
  const [submittingResults, setSubmittingResults] = useState<{[key: string]: boolean}>({});
  const [editingResultRecord, setEditingResultRecord] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTournaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubHistory = onSnapshot(collection(db, 'resultsHistory'), (snapshot) => {
      setResultsHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubHistory();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteTournament = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Tournament',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      action: async () => {
        try {
          await deleteDoc(doc(db, 'tournaments', id));
          showToast('Tournament deleted successfully');
          setConfirmModal(null);
        } catch (error) {
          console.error('Error deleting tournament:', error);
          showToast('Failed to delete tournament', 'error');
        }
      }
    });
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'tournaments', id), { status: newStatus });
      showToast(`Tournament status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Tournaments</h1>
          <p className="text-gray-400 text-sm">Manage tournaments and results</p>
        </div>
        <Link 
          to="/admin/tournaments/new" 
          className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/20"
        >
          <Plus size={20} /> Create Tournament
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[#131B2F] p-1.5 rounded-xl border border-gray-800 w-fit">
        <button 
          onClick={() => setResultsTab('pending')}
          className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${resultsTab === 'pending' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
        >
          Tournaments
        </button>
        <button 
          onClick={() => setResultsTab('added')}
          className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${resultsTab === 'added' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
        >
          Admin Result
        </button>
        <button 
          onClick={() => setResultsTab('history')}
          className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${resultsTab === 'history' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {resultsTab === 'pending' && (
          <div className="grid gap-4">
            {tournaments.filter(t => t.status === 'Open' || t.status === 'Closed').map(t => (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6 relative overflow-hidden group"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  {/* Tournament Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700 shadow-lg">
                      {t.image ? (
                        <img src={t.image} alt={t.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <Trophy size={32} className="text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{t.name}</h3>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          t.status === 'Open' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                          t.status === 'Result' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(t.date)}</span>
                        <span className="flex items-center gap-1"><Gamepad2 size={12} /> {t.gameType} • {t.mode} • {t.map}</span>
                        <span className="flex items-center gap-1"><Coins size={12} className="text-yellow-500" /> Pool: {t.prizePool}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <select 
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className="bg-[#0B1121] border border-gray-700 text-white text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Result">Result</option>
                      <option value="Completed">Completed</option>
                    </select>

                    <button 
                      onClick={() => handleDeleteTournament(t.id, t.name)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {tournaments.filter(t => t.status === 'Open' || t.status === 'Closed').length === 0 && (
              <div className="text-center py-10 text-gray-500">No active tournaments found.</div>
            )}
          </div>
        )}

        {resultsTab === 'added' && (
          <div className="grid gap-4">
            {tournaments.filter(t => t.status === 'Result').map(t => (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#131B2F] border border-gray-800 rounded-2xl p-6 relative overflow-hidden group"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  {/* Tournament Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700 shadow-lg">
                      {t.image ? (
                        <img src={t.image} alt={t.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <Trophy size={32} className="text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{t.name}</h3>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                          {t.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(t.date)}</span>
                        <span className="flex items-center gap-1"><Gamepad2 size={12} /> {t.gameType} • {t.mode} • {t.map}</span>
                        <span className="flex items-center gap-1"><Coins size={12} className="text-yellow-500" /> Pool: {t.prizePool}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <select 
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className="bg-[#0B1121] border border-gray-700 text-white text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Result">Result</option>
                      <option value="Completed">Completed</option>
                    </select>

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
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                        viewingResults === t.id 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {viewingResults === t.id ? <EyeOff size={14} /> : <Trophy size={14} />}
                      {viewingResults === t.id ? 'Hide Results' : 'Manage Results'}
                    </button>

                    <button 
                      onClick={() => handleDeleteTournament(t.id, t.name)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Results Management Section */}
                <AnimatePresence>
                  {viewingResults === t.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-6 border-t border-gray-800"
                    >
                      <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-4">Manage Player Results</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {registrations.map(reg => (
                          <div key={reg.id} className={`bg-[#0B1121] p-4 rounded-xl border ${reg.won ? 'border-green-500/30' : 'border-gray-800'}`}>
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-bold text-white text-sm">{reg.freeFireName || 'Unknown'}</p>
                                <p className="text-xs text-gray-500">{reg.email}</p>
                              </div>
                              {reg.won && <span className="text-[10px] font-black bg-green-500/10 text-green-500 px-2 py-1 rounded uppercase">Winner</span>}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                              <div className="bg-[#131B2F] p-2 rounded-lg border border-gray-700">
                                <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Kills</label>
                                <input 
                                  type="number" 
                                  placeholder={reg.kills?.toString() || "0"}
                                  value={killsAmounts[reg.id] !== undefined ? killsAmounts[reg.id] : (reg.kills || '')}
                                  onChange={(e) => setKillsAmounts({...killsAmounts, [reg.id]: e.target.value})}
                                  className="w-full bg-transparent text-white text-xs font-bold outline-none"
                                />
                              </div>
                              <div className="bg-[#131B2F] p-2 rounded-lg border border-gray-700">
                                <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Win Amount</label>
                                <input 
                                  type="number" 
                                  placeholder="0"
                                  value={winningAmounts[reg.id] || ''}
                                  onChange={(e) => setWinningAmounts({...winningAmounts, [reg.id]: e.target.value})}
                                  className="w-full bg-transparent text-white text-xs font-bold outline-none"
                                />
                              </div>
                            </div>

                            <button 
                              onClick={async () => {
                                const amount = parseInt(winningAmounts[reg.id]) || 0;
                                const kills = parseInt(killsAmounts[reg.id] !== undefined ? killsAmounts[reg.id] : (reg.kills || 0)) || 0;
                                const oldKills = reg.kills || 0;
                                const killsDiff = kills - oldKills;
                                const perKill = t.perKill || 0;
                                const killsCoins = killsDiff * perKill;

                                if (amount <= 0 && killsDiff === 0) {
                                  showToast('Enter valid amount or kills', 'error');
                                  return;
                                }

                                setSubmittingResults(prev => ({ ...prev, [reg.id]: true }));

                                try {
                                  const batch = writeBatch(db);
                                  const regRef = doc(db, 'registrations', reg.id);
                                  const userRef = doc(db, 'users', reg.userId);

                                  // Update Registration
                                  const regUpdate: any = { resultSubmitted: true, kills: kills };
                                  if (amount > 0) {
                                    regUpdate.won = true;
                                    regUpdate.winningAmount = amount;
                                  }
                                  batch.update(regRef, regUpdate);

                                  // Update User
                                  const userUpdate: any = {
                                    walletBalance: increment(amount + killsCoins)
                                  };
                                  if (amount > 0) {
                                    userUpdate.winStreak = increment(1);
                                    userUpdate.totalWins = increment(1);
                                  }
                                  batch.update(userRef, userUpdate);

                                  // Create Transactions & History
                                  if (amount > 0) {
                                    const txRef = doc(collection(db, 'transactions'));
                                    batch.set(txRef, {
                                      userId: reg.userId,
                                      amount: amount,
                                      type: 'Winning',
                                      description: `Winning Of ${t.name}`,
                                      status: 'completed',
                                      createdAt: serverTimestamp(),
                                      date: new Date().toLocaleString()
                                    });

                                    const histRef = doc(collection(db, 'resultsHistory'));
                                    batch.set(histRef, {
                                      tournamentId: t.id,
                                      tournamentName: t.name,
                                      userId: reg.userId,
                                      userName: reg.freeFireName, // Fallback
                                      amount: amount,
                                      type: 'Winning',
                                      registrationId: reg.id,
                                      createdAt: serverTimestamp()
                                    });
                                  }

                                  if (killsCoins > 0) {
                                     const histRef = doc(collection(db, 'resultsHistory'));
                                     batch.set(histRef, {
                                      tournamentId: t.id,
                                      tournamentName: t.name,
                                      userId: reg.userId,
                                      userName: reg.freeFireName,
                                      amount: killsCoins,
                                      type: 'Kills',
                                      kills: killsDiff,
                                      registrationId: reg.id,
                                      createdAt: serverTimestamp()
                                    });
                                  }

                                  await batch.commit();
                                  showToast('Result submitted successfully');
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
                              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-2 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                              {submittingResults[reg.id] ? <Loader2 size={14} className="animate-spin" /> : 'Submit Result'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {tournaments.filter(t => t.status === 'Result').length === 0 && (
              <div className="text-center py-10 text-gray-500">No tournaments awaiting results.</div>
            )}
          </div>
        )}

        {resultsTab === 'history' && (
          <div className="space-y-8">
            <div className="grid gap-4">
               {tournaments.filter(t => t.status === 'Completed').map(t => (
                 <div key={t.id} className="bg-[#131B2F] border border-gray-800 rounded-xl p-4 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                        <Trophy size={20} className="text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{t.name}</h3>
                        <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="text-xs font-bold bg-green-500/10 text-green-500 px-2 py-1 rounded">Completed</span>
                     <button onClick={() => handleDeleteTournament(t.id, t.name)} className="text-red-500 hover:bg-red-500/10 p-2 rounded">
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               ))}
            </div>

            {/* Results History */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="text-blue-500" /> Player Results History
              </h2>
              {resultsHistory.length > 0 ? (
                <div className="grid gap-3">
                  {resultsHistory.map(history => (
                    <div key={history.id} className="bg-[#131B2F] border border-gray-800 rounded-xl p-4 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${history.type === 'Winning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                           {history.type === 'Winning' ? <Trophy size={20} /> : <Crosshair size={20} />}
                         </div>
                         <div>
                           <h3 className="font-bold text-white text-sm">{history.userName || 'Unknown User'}</h3>
                           <p className="text-xs text-gray-500">{history.tournamentName} • {history.type}</p>
                         </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${history.type === 'Winning' ? 'text-green-500' : 'text-white'}`}>
                          +{history.amount} Coins
                        </p>
                        <p className="text-[10px] text-gray-600">{history.createdAt?.toDate ? history.createdAt.toDate().toLocaleString() : 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>No individual results history found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131B2F] border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-gray-400 text-sm mb-6">{confirmModal.message}</p>
              <div className="flex justify-between gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmModal.action();
                    setConfirmModal(null);
                  }}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
