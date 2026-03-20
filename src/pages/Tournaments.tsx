import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Filter, Users, Calendar, Award, Coins, X, Copy, Check, CheckCircle, AlertCircle, Target, Clock, Link as LinkIcon } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, addDoc, query, where, doc, updateDoc, getDoc, setDoc, increment, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'framer-motion';

export default function Tournaments() {
  const [user] = useAuthState(auth);
  const [gameType, setGameType] = useState('All');
  const [mode, setMode] = useState('All');
  const [activeModal, setActiveModal] = useState<{ type: 'join' | 'details', tournament: any } | null>(null);

  const handleGameTypeChange = (type: string) => {
    if (type !== gameType) {
      setGameType(type);
    }
  };

  const handleModeChange = (m: string) => {
    if (m !== mode) {
      setMode(m);
    }
  };

  const handleCopy = (text: string, field: string) => {
    if (!text || text === 'Pending' || text === '---') return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [joinedTournaments, setJoinedTournaments] = useState<string[]>([]); // Store tournament IDs as strings
  const [userBalance, setUserBalance] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for instant registration status updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Form state
  const [freeFireName, setFreeFireName] = useState('');
  const [freeFireId, setFreeFireId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  // Fetch tournaments
  useEffect(() => {
    const q = query(collection(db, 'tournaments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tournamentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTournaments(tournamentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch user data and joined tournaments
  useEffect(() => {
    if (!user) return;

    // Fetch user balance
    const userRef = doc(db, 'users', user.uid);
    
    const unsubUser = onSnapshot(userRef, async (userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserBalance(data.walletBalance || 0);
        setUserData(data);
      } else {
        // Create user doc if not exists (with default balance for testing)
        const newUser = {
          email: user.email,
          walletBalance: 1000, // Default balance
          createdAt: new Date()
        };
        await setDoc(userRef, newUser);
        setUserBalance(1000);
        setUserData(newUser);
      }
    });

    // Fetch joined tournaments
    const registrationsQuery = query(
      collection(db, 'registrations'),
      where('userId', '==', user.uid)
    );
    
    const unsubReg = onSnapshot(registrationsQuery, (snapshot) => {
      const joinedIds = snapshot.docs.map(doc => doc.data().tournamentId);
      setJoinedTournaments(joinedIds);
    });

    return () => {
      unsubUser();
      unsubReg();
    };
  }, [user]);

  const handleJoin = async () => {
    if (activeModal && activeModal.type === 'join' && user) {
      const tournament = activeModal.tournament;
      
      if (!freeFireName || !freeFireId || !phoneNumber) {
        showNotification("Please fill in all required fields", "error");
        return;
      }
      
      setIsJoining(true);
      try {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await transaction.get(userRef);
          
          if (!userSnap.exists()) {
            throw new Error("User document does not exist!");
          }
          
          const currentBalance = userSnap.data().walletBalance || 0;
          if (currentBalance < tournament.entryFee) {
            throw new Error("Insufficient balance");
          }
          
          // 1. Deduct balance
          transaction.update(userRef, {
            walletBalance: increment(-tournament.entryFee)
          });
          
          // 2. Add to registrations
          const regRef = doc(collection(db, 'registrations'));
          transaction.set(regRef, {
            userId: user.uid,
            username: userData?.username || user.displayName || user.email?.split('@')[0] || 'Unknown',
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            joinedAt: serverTimestamp(),
            freeFireName: freeFireName, 
            freeFireId: freeFireId,
            phoneNumber: phoneNumber,
            email: email || user.email || '',
            won: false,
            kills: 0
          });
          
          // 3. Update tournament participants
          const tournamentRef = doc(db, 'tournaments', tournament.id);
          transaction.update(tournamentRef, {
            participants: increment(1)
          });

          // 4. Add transaction record
          const txRef = doc(collection(db, 'transactions'));
          transaction.set(txRef, {
            userId: user.uid,
            userEmail: user.email || '',
            amount: tournament.entryFee,
            type: 'Entry Fee',
            description: `Entry Fee for ${tournament.name}`,
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
        });

        // Check for referral reward eligibility (first tournament)
        if (joinedTournaments.length === 0 && userData?.referredBy) {
          try {
            // Check if referral system is enabled
            const settingsDoc = await getDoc(doc(db, 'settings', 'referral'));
            const isReferralEnabled = settingsDoc.exists() ? settingsDoc.data().enabled !== false : true;

            if (isReferralEnabled) {
              // Check if request already exists to avoid duplicates
              const q = query(
                collection(db, 'referral_requests'), 
                where('refereeId', '==', user.uid)
              );
              const snapshot = await getDocs(q);
              
              if (snapshot.empty) {
                await addDoc(collection(db, 'referral_requests'), {
                  referrerId: userData.referredBy,
                  refereeId: user.uid,
                  refereeName: userData.username || user.displayName || user.email,
                  tournamentId: tournament.id,
                  status: 'pending',
                  createdAt: serverTimestamp()
                });
              }
            }
          } catch (err) {
            console.error("Error creating referral request:", err);
          }
        }

        showNotification(`Successfully Joined ${tournament.name} !`, "success");
        setActiveModal(null);
        setFreeFireName('');
        setFreeFireId('');
        setPhoneNumber('');
        setEmail('');
      } catch (error: any) {
        console.error("Error joining tournament:", error);
        const message = error.message === "Insufficient balance" 
          ? "Insufficient balance. Please recharge." 
          : "Failed to join tournament. Please try again.";
        showNotification(message, "error");
      } finally {
        setIsJoining(false);
      }
    }
  };

  // Filter logic
  const filteredTournaments = tournaments.filter(tournament => {
    const isJoined = joinedTournaments.includes(tournament.id);
    const isCompleted = tournament.status === 'Completed' || tournament.status === 'completed';
    const isResultPending = tournament.status === 'Result' || tournament.status === 'result';
    
    // If "Result" tab is selected, show ONLY completed tournaments
    if (gameType === 'Result') {
      return isCompleted;
    }

    // For all other tabs, HIDE completed tournaments AND result-pending tournaments
    if (isCompleted || isResultPending) return false;

    // If "Joined" tab is selected, show ONLY joined tournaments
    if (gameType === 'Joined') {
      return isJoined;
    }

    // Otherwise, show all tournaments (including joined ones) so users can see rooms
    // But we can filter by game type if needed
    const matchesGameType = gameType === 'All' || (tournament.gameType || 'BR') === gameType;
    const matchesMode = mode === 'All' || (tournament.mode || 'Solo') === mode;
    
    return matchesGameType && matchesMode;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex flex-col items-center justify-center text-white">
        <div className="relative flex items-center justify-center mb-4 w-14 h-14 md:w-16 md:h-16">
          <div className="absolute inset-0 border-[2px] border-yellow-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-[3px] md:border-[4px] border-transparent border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
          <div className="absolute inset-2.5 md:inset-3 border-[2px] border-transparent border-b-yellow-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
          <div className="absolute inset-0 m-auto w-2 h-2 md:w-2.5 md:h-2.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
        </div>
        <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-widest text-xs md:text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">Loading tournaments...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-white p-4 pb-24 font-sans relative">
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-4 right-4 z-[60] border p-4 rounded-xl shadow-lg flex items-start ${
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

        {/* Header */}
        <div className="mb-6">
          <Link to="/" className="flex items-center text-blue-400 text-sm mb-4 hover:text-blue-300 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="text-yellow-400" size={28} />
            <h1 className="text-3xl font-bold text-yellow-400">Tournaments</h1>
          </div>
          <p className="text-gray-400 text-sm">Join Gamer Zone tournaments and compete for prizes!</p>
        </div>

        {/* Balance Card */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-4 mb-6">
          <div className="flex items-center text-gray-400 text-sm mb-1">
            <Coins size={16} className="mr-2" /> Your Balance
          </div>
          <div className="text-left text-2xl font-bold text-yellow-400">{userBalance} coins</div>
        </div>

        {/* Filters */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-4 mb-6">
          <div className="flex items-center text-yellow-400 font-bold mb-3">
            <Filter size={20} className="mr-2" /> Filters
          </div>
          
          <div className="mb-3">
            <div className="text-gray-400 text-xs font-bold mb-2">Game Type</div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['All', 'BR', 'CS', 'Joined', 'Result'].map(type => (
                <button 
                  key={type}
                  onClick={() => handleGameTypeChange(type)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                    gameType === type 
                      ? 'bg-yellow-400 text-black' 
                      : 'bg-[#1E293B] text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-gray-400 text-xs font-bold mb-2">Mode</div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['All', 'Solo', 'Duo', 'Squad'].map(m => (
                <button 
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                    mode === m 
                      ? 'bg-yellow-400 text-black' 
                      : 'bg-[#1E293B] text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tournaments List */}
        <div className="space-y-6">
          {filteredTournaments.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No tournaments found for this filter.
            </div>
          ) : (
            filteredTournaments.map(tournament => {
              const isJoined = joinedTournaments.includes(tournament.id);
              const parseDate = (dateVal: any) => {
                  if (!dateVal) return null;
                  if (dateVal?.toDate) return dateVal.toDate();
                  if (dateVal?.seconds) return new Date(dateVal.seconds * 1000);
                  if (dateVal instanceof Date) return dateVal;
                  return new Date(dateVal);
              };

              const now = currentTime;
              const openTime = parseDate(tournament.registrationOpenTime);
              const closeTime = parseDate(tournament.registrationCloseTime);
              
              const isRegistrationOpen = (!openTime || now >= openTime) && (!closeTime || now <= closeTime);
              const isSlotsFull = (tournament.participants || 0) >= (tournament.totalSlots || 48);
              
              const formatTime12Hour = (dateVal: any) => {
                  if (!dateVal) return '';
                  const date = parseDate(dateVal);
                  if (!date || isNaN(date.getTime())) return dateVal;
                  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
              };

              const getRemainingTime = (targetDate: Date) => {
                  const diff = targetDate.getTime() - now.getTime();
                  if (diff <= 0) return '00:00:00';
                  
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                  
                  return `${hours}h ${minutes}m ${seconds}s`;
              };

              let buttonContent;
              
              if (isJoined) {
                buttonContent = (
                  <button 
                    onClick={() => setActiveModal({ type: 'details', tournament })}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  >
                    Room Details
                  </button>
                );
              } else if (isSlotsFull) {
                buttonContent = (
                  <button disabled className="w-full bg-red-900/20 border border-red-900/50 text-red-500 font-bold py-3 rounded-xl cursor-not-allowed">
                    Slots Full
                  </button>
                );
              } else if (!isRegistrationOpen) {
                 const message = openTime && now < openTime 
                  ? `Opens in ${getRemainingTime(openTime)}` 
                  : `Registration Closed`;
                  
                buttonContent = (
                  <button disabled className="w-full bg-[#1E293B] text-gray-500 font-bold py-3 rounded-xl cursor-not-allowed">
                    {message}
                  </button>
                );
              } else if (userBalance >= tournament.entryFee) {
                buttonContent = (
                  <button 
                    onClick={() => setActiveModal({ type: 'join', tournament })}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl transition-colors"
                  >
                    Join Tournament ({tournament.entryFee} coins)
                  </button>
                );
              } else {
                buttonContent = (
                  <button disabled className="w-full bg-[#1E293B] text-gray-500 font-bold py-3 rounded-xl cursor-not-allowed">
                    Need {tournament.entryFee - userBalance} more coins (Total: {tournament.entryFee})
                  </button>
                );
              }

              return (
                <div key={tournament.id} className="bg-[#0F172A] border border-gray-800 rounded-3xl p-6 mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">{tournament.name}</h2>
                  
                  <div className="flex gap-2 mb-6">
                    <span className="bg-blue-900/40 text-blue-400 text-[10px] font-bold px-3 py-1 rounded-md border border-blue-500/20 uppercase">
                      {tournament.gameType || 'BR'}
                    </span>
                    <span className="bg-purple-900/40 text-purple-400 text-[10px] font-bold px-3 py-1 rounded-md border border-purple-500/20 uppercase">
                      {tournament.category || tournament.mode || 'Solo'}
                    </span>
                  </div>

                  {/* Info Section */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center text-gray-400 text-sm">
                        <LinkIcon size={14} className="mr-2" /> Entry Fee
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold">{tournament.entryFee} coins/person</div>
                        <div className="text-gray-500 text-xs">Total: {tournament.entryFee} coins</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-gray-400 text-sm">
                        <Trophy size={14} className="mr-2" /> Prize Pool
                      </div>
                      <div className="text-green-400 font-bold">{tournament.prizePool} coins</div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-gray-400 text-sm">
                        <Award size={14} className="mr-2" /> Prize Type
                      </div>
                      <div className="text-yellow-400 font-bold">{tournament.prizeType || 'Top 10'}</div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-800 my-4"></div>

                  {/* Prize Distribution */}
                  {tournament.showPrizeDistribution !== false && (
                    <div className="mb-6">
                      <p className="text-gray-500 text-xs mb-3">Prize Distribution:</p>
                      <div className="grid grid-cols-5 gap-y-4 gap-x-2">
                        {(tournament.distribution || [
                          { rank: 'Top 1', points: 87, percent: '30%', color: 'text-yellow-400' },
                          { rank: 'Top 2', points: 58, percent: '20%', color: 'text-gray-200' },
                          { rank: 'Top 3', points: 43, percent: '15%', color: 'text-orange-400' },
                          { rank: 'Top 4', points: 29, percent: '10%', color: 'text-blue-400' },
                          { rank: 'Top 5', points: 23, percent: '8%', color: 'text-purple-400' },
                          { rank: 'Top 6', points: 17, percent: '6%', color: 'text-green-400' },
                          { rank: 'Top 7', points: 11, percent: '4%', color: 'text-pink-400' },
                          { rank: 'Top 8', points: 8, percent: '3%', color: 'text-indigo-400' },
                          { rank: 'Top 9', points: 5, percent: '2%', color: 'text-teal-400' },
                          { rank: 'Top 10', points: 9, percent: '2%', color: 'text-cyan-400' },
                        ]).map((dist: any, idx: number) => (
                          <div key={idx} className="text-center">
                            <div className={`text-[10px] font-bold ${dist.color || 'text-cyan-400'}`}>{dist.rank}</div>
                            <div className="text-white text-xs font-bold">{dist.points}</div>
                            <div className="text-gray-500 text-[10px]">({dist.percent})</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats Section */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center text-gray-400">
                        <Users size={14} className="mr-2" /> Slots
                      </div>
                      <div className="text-white font-bold">{tournament.participants || 0}/{tournament.totalSlots || 48}</div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center text-gray-400">
                        <Calendar size={14} className="mr-2" /> Start Time
                      </div>
                      <div className="text-gray-400 font-bold">{formatTime12Hour(tournament.startTime || tournament.time)}</div>
                    </div>
                    {/* Registration Time Info */}
                    {(tournament.registrationOpenTime || tournament.registrationCloseTime) && (
                       <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center text-gray-400">
                          <Clock size={14} className="mr-2" /> Registration
                        </div>
                        <div className="text-gray-400 font-bold text-xs">
                           {isRegistrationOpen ? (
                             <span className="text-green-400">Open • Ends in {closeTime ? getRemainingTime(closeTime) : 'forever'}</span>
                           ) : (
                             <span className="text-red-400">
                               {openTime && now < openTime ? `Opens in ${getRemainingTime(openTime)}` : 'Closed'}
                             </span>
                           )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="space-y-3">
                    <Link to={`/tournaments/${tournament.id}`} className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-center transition-colors">
                      View details
                    </Link>
                    
                    {buttonContent}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className={`bg-[#0F172A] border border-gray-800 rounded-2xl w-full ${activeModal.type === 'details' ? 'max-w-[300px] shadow-[0_0_25px_rgba(234,179,8,0.15)]' : 'max-w-md'} overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200`}>
            
            {/* Modal Header */}
            <div className={`relative flex items-center ${activeModal.type === 'details' ? 'justify-center p-3' : 'justify-between p-4'} border-b border-gray-800`}>
              <h3 className={`${activeModal.type === 'details' ? 'text-sm' : 'text-lg'} font-bold text-yellow-400 uppercase tracking-wider`}>
                {activeModal.type === 'join' ? 'Join Tournament' : 'Room Details'}
              </h3>
              <button 
                onClick={() => setActiveModal(null)} 
                className={`text-gray-400 hover:text-white transition-colors ${activeModal.type === 'details' ? 'absolute right-3' : ''}`}
              >
                <X size={activeModal.type === 'details' ? 16 : 20} />
              </button>
            </div>

            {activeModal.type === 'join' ? (
              <div className="p-5 space-y-5">
                {/* Tournament Info */}
                <div>
                  <h4 className="text-white font-bold text-lg mb-2">{activeModal.tournament.name}</h4>
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>Mode: <span className="text-white font-bold">{activeModal.tournament.mode || 'Solo'}</span></span>
                    <span>Type: <span className="text-white font-bold">{activeModal.tournament.gameType || 'BR'}</span></span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>Entry Fee: <span className="text-yellow-400 font-bold">{activeModal.tournament.entryFee} coins</span></span>
                    <span>Prize Pool: <span className="text-green-400 font-bold">{activeModal.tournament.prizePool} coins</span></span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Prize Type: <span className="text-yellow-400 font-bold">{activeModal.tournament.prizeType}</span>
                  </div>
                </div>

                {/* Prize Distribution Mini View */}
                {activeModal.tournament.showPrizeDistribution !== false && (
                  <div>
                    <div className="text-gray-500 text-xs mb-2">Prize Distribution - {activeModal.tournament.prizeType}:</div>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {activeModal.tournament.distribution && activeModal.tournament.distribution.map((dist: any, index: number) => (
                        <div key={index} className="flex flex-col items-center">
                          <div className={`text-[10px] font-bold ${dist.color || 'text-cyan-400'}`}>
                            {dist.rank}
                          </div>
                          <div className="text-white text-xs font-bold">{dist.points}</div>
                          <div className="text-gray-500 text-[10px]">({dist.percent})</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form */}
                <div>
                  <h4 className="text-white font-bold text-sm mb-3">Your Details (Captain)</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Free Fire Name *</label>
                      <input 
                        type="text" 
                        value={freeFireName}
                        onChange={(e) => setFreeFireName(e.target.value)}
                        placeholder="Your in-game name"
                        className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Free Fire ID *</label>
                      <input 
                        type="text" 
                        value={freeFireId}
                        onChange={(e) => setFreeFireId(e.target.value)}
                        placeholder="e.g., 123456789"
                        className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Phone Number *</label>
                      <input 
                        type="text" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="03001234567"
                        className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Email (Optional)</label>
                      <input 
                        type="text" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isJoining ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                        Joining...
                      </>
                    ) : (
                      `Join Tournament (${activeModal.tournament.entryFee} coins - ${activeModal.tournament.entryFee} per player × 1)`
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveModal(null)}
                    disabled={isJoining}
                    className="px-6 bg-[#1E293B] hover:bg-gray-700 text-white font-bold py-3 rounded-xl text-xs transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4 text-center">
                {/* Room Details View */}
                <div className="relative group">
                  {/* Background Glow Effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                  
                  <div className="relative bg-[#050B14] p-5 rounded-2xl border border-white/5 overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 p-2 opacity-[0.03] rotate-12">
                      <Trophy size={60} />
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse"></div>
                      <p className="text-gray-500 text-[9px] font-bold uppercase tracking-[0.3em]">Match Credentials</p>
                    </div>
                    
                    <div className="space-y-5">
                      {/* Room ID Section */}
                      <div className="relative">
                        <p className="text-gray-500 text-[8px] uppercase tracking-widest mb-1.5 opacity-70">Room ID</p>
                        <div className="flex items-center justify-center gap-3">
                          <p className="text-2xl font-black text-white tracking-[0.1em] font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                            {activeModal.tournament.roomDetails?.id || 'Pending'}
                          </p>
                          {activeModal.tournament.roomDetails?.id && activeModal.tournament.roomDetails?.id !== 'Pending' && (
                            <button 
                              onClick={() => handleCopy(activeModal.tournament.roomDetails.id, 'id')}
                              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-yellow-400 hover:border-yellow-500/30 transition-all active:scale-90"
                            >
                              {copiedField === 'id' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Divider */}
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-gray-800"></div>
                        <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                        <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-gray-800"></div>
                      </div>
                      
                      {/* Password Section */}
                      <div className="relative">
                        <p className="text-gray-500 text-[8px] uppercase tracking-widest mb-1.5 opacity-70">Password</p>
                        <div className="flex items-center justify-center gap-3">
                          <p className="text-2xl font-black text-yellow-400 tracking-[0.1em] font-mono drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                            {activeModal.tournament.roomDetails?.password || '---'}
                          </p>
                          {activeModal.tournament.roomDetails?.password && activeModal.tournament.roomDetails?.password !== '---' && (
                            <button 
                              onClick={() => handleCopy(activeModal.tournament.roomDetails.password, 'pass')}
                              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-yellow-400 hover:border-yellow-500/30 transition-all active:scale-90"
                            >
                              {copiedField === 'pass' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-[9px] text-gray-500 bg-white/5 py-2.5 px-3 rounded-xl border border-white/5">
                  <Clock size={10} className="text-blue-400" />
                  <p className="tracking-wide">Updated 15m before match start</p>
                </div>

                <button 
                  onClick={() => setActiveModal(null)}
                  className="w-full bg-gradient-to-r from-[#1E293B] to-[#0F172A] hover:from-gray-800 hover:to-gray-900 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] border border-white/5 transition-all active:scale-[0.97] shadow-lg"
                >
                  Close Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
