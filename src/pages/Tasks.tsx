import { Link } from 'react-router-dom';
import { ArrowLeft, Zap, Coins, Target, Gift, Award, Calendar, CheckCircle2, Clock, Trophy, Crown, Check, Star } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function Tasks() {
  const [user] = useAuthState(auth);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [winStreak, setWinStreak] = useState(0);
  const [claims, setClaims] = useState<string[]>([]);
  const [taskClaims, setTaskClaims] = useState<Record<string, any>>({});
  const [dailyTaskResetAt, setDailyTaskResetAt] = useState<Date | null>(null);
  const [weeklyTaskResetAt, setWeeklyTaskResetAt] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);

  // Helper to get today's date string YYYY-MM-DD
  const getTodayString = (date: Date = new Date()) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getWeekStartString = (date: Date = new Date()) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const today = getTodayString(currentTime);
  const weekStart = getWeekStartString(currentTime);

  // Timer for countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. Listen to User Data (Balance & Claims)
    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.walletBalance || 0);
        setWinStreak(data.winStreak || 0);
        
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
        const currentToday = getTodayString();
        const currentWeekStart = getWeekStartString();

        if (data.dailyClaims && data.dailyClaims.date === currentToday) {
          setClaims(data.dailyClaims.claimed || []);
        } else if (data.weeklyClaims && data.weeklyClaims.weekStart === currentWeekStart) {
          // Keep weekly claims if they exist for this week
          setClaims(data.weeklyClaims.claimed || []);
        } else {
          setClaims([]);
        }
      }
    });

    // 2. Listen to Registrations for Today's Progress
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', user.uid)
    );
    
    const unsubReg = onSnapshot(q, (snapshot) => {
      const regs: any[] = [];
      snapshot.docs.forEach(doc => {
        regs.push({ id: doc.id, ...doc.data() });
      });
      setRegistrations(regs);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubReg();
    };
  }, [user]);

  const handleClaim = async (taskId: string, reward: number, isWeekly: boolean = false) => {
    if (!user) return;
    
    // Optimistic Update
    const previousBalance = balance;
    const previousClaims = [...claims];
    const previousTaskClaims = { ...taskClaims };

    setBalance(prev => prev + reward);
    setClaims(prev => [...prev, taskId]);
    setTaskClaims(prev => ({ ...prev, [taskId]: new Date() }));
    setToast(`Claimed ${reward} coins!`);
    const toastTimer = setTimeout(() => setToast(null), 3000);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      if (isWeekly) {
        await updateDoc(userRef, {
          walletBalance: increment(reward),
          [`weeklyClaims.claimed`]: [...claims, taskId],
          [`taskLastClaimed.${taskId}`]: new Date()
        });
      } else {
        await updateDoc(userRef, {
          walletBalance: increment(reward),
          [`dailyClaims.date`]: today,
          [`dailyClaims.claimed`]: [...claims, taskId],
          [`taskLastClaimed.${taskId}`]: new Date()
        });
      }

      // Create transaction record
      const transactionRef = doc(collection(db, 'transactions'));
      await setDoc(transactionRef, {
        userId: user.uid,
        amount: reward,
        type: 'Task Reward',
        status: 'completed',
        description: `Claimed reward for task: ${taskId}`,
        taskId: taskId,
        createdAt: new Date(),
        date: new Date().toLocaleString()
      });

    } catch (error) {
      console.error("Error claiming reward:", error);
      // Rollback on error
      setBalance(previousBalance);
      setClaims(previousClaims);
      setTaskClaims(previousTaskClaims);
      setToast("Failed to claim reward. Please try again.");
      clearTimeout(toastTimer);
      
      // Fallback for creating the field if it doesn't exist (e.g. first time)
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          dailyClaims: {
            date: today,
            claimed: [...previousClaims, taskId]
          },
          taskLastClaimed: {
            [taskId]: new Date()
          },
          walletBalance: increment(reward)
        }, { merge: true });
        
        // Create transaction record (retry)
        const transactionRef = doc(collection(db, 'transactions'));
        await setDoc(transactionRef, {
          userId: user.uid,
          amount: reward,
          type: 'Task Reward',
          status: 'completed',
          description: `Claimed reward for task: ${taskId}`,
          taskId: taskId,
          createdAt: new Date(),
          date: new Date().toLocaleString()
        });

        // Re-apply success state
        setBalance(prev => prev + reward);
        setClaims(prev => [...prev, taskId]);
        setTaskClaims(prev => ({ ...prev, [taskId]: new Date() }));
        setToast(`Claimed ${reward} coins!`);
        setTimeout(() => setToast(null), 3000);
      } catch (retryError) {
        console.error("Retry failed:", retryError);
      }
    }
  };

  // Helper to calculate progress dynamically
  const getTaskProgress = (taskId: string, type: 'daily' | 'weekly', isWinTask: boolean = false, target: number = 1) => {
    const startOfPeriod = new Date(currentTime);
    if (type === 'daily') {
      startOfPeriod.setHours(0, 0, 0, 0);
    } else {
      startOfPeriod.setDate(startOfPeriod.getDate() - startOfPeriod.getDay());
      startOfPeriod.setHours(0, 0, 0, 0);
    }

    // Determine the baseline time (when to start counting from)
    let baselineTime = startOfPeriod.getTime();

    // If admin reset the tasks, we only count after the reset
    const resetAt = type === 'daily' ? dailyTaskResetAt : weeklyTaskResetAt;
    if (resetAt && resetAt.getTime() > baselineTime) {
      baselineTime = resetAt.getTime();
    }

    // If user claimed the task in the current period, it's completed.
    // We return target so it stays full and doesn't increase further.
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
          if (wonDate.getTime() >= baselineTime) {
            progress++;
          }
        }
      } else {
        if (joinedDate.getTime() >= baselineTime) {
          progress++;
        }
      }
    });

    return progress;
  };

  // Task Definitions
  const dailyTasks = useMemo(() => {
    const p_join_2 = getTaskProgress('join_2', 'daily', false, 2);
    const p_join_6 = getTaskProgress('join_6', 'daily', false, 6);
    const p_win_3 = getTaskProgress('win_3_matches', 'daily', true, 3);

    return [
      {
        id: 'join_2',
        title: 'Join 2 Tournaments',
        description: 'Join 2 tournaments in one day',
        icon: <Target size={24} className="text-gray-400 mr-3" />,
        progress: p_join_2,
        target: 2,
        reward: 10,
        type: 'coins',
        isReady: p_join_2 >= 2
      },
      {
        id: 'join_6',
        title: 'Join 6 Tournaments',
        description: 'Join 6 tournaments in one day',
        icon: <Target size={24} className="text-gray-400 mr-3" />,
        progress: p_join_6,
        target: 6,
        reward: 20,
        type: 'coins',
        isReady: p_join_6 >= 6
      },
      {
        id: 'win_3_matches',
        title: 'Win 3 Matches',
        description: 'Win 3 matches in one day',
        icon: <Trophy size={24} className="text-yellow-400 mr-3" />,
        progress: p_win_3,
        target: 3,
        reward: 10,
        type: 'coins',
        isReady: p_win_3 >= 3
      }
    ];
  }, [registrations, taskClaims, dailyTaskResetAt, currentTime]);

  const weeklyTasks = useMemo(() => {
    const p_weekly_20 = getTaskProgress('weekly_join_20', 'weekly', false, 20);

    return [
      {
        id: 'weekly_join_20',
        title: 'Weekly Warrior',
        description: 'Join 20 Tournaments in a week to earn bonus coins',
        icon: <Target size={24} className="text-purple-400 mr-3" />,
        progress: p_weekly_20,
        target: 20,
        reward: 50,
        type: 'coins',
        isReady: p_weekly_20 >= 20
      }
    ];
  }, [registrations, taskClaims, weeklyTaskResetAt, currentTime]);

  // Calculate Stats
  const tasksCompleted = claims.length;
  const coinsToClaim = dailyTasks.reduce((acc, task) => {
    if (task.isReady && !claims.includes(task.id)) return acc + task.reward;
    return acc;
  }, 0);
  const pendingClaims = dailyTasks.filter(task => task.isReady && !claims.includes(task.id)).length;

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8 pb-24 font-sans relative">
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-black px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-5">
          <Check size={18} /> {toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-flex items-center text-gray-400 mb-8 hover:text-white transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Zap size={40} className="text-yellow-400 mr-4" />
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tight">
              Daily & Weekly Tasks
            </h1>
            <div className="ml-6 bg-gray-900 border border-yellow-500/30 rounded-xl px-4 py-2 flex items-center shadow-[0_0_15px_rgba(250,204,21,0.1)]">
              <Coins size={20} className="text-yellow-400 mr-2" />
              <span className="text-yellow-400 font-bold text-lg">{balance}</span>
              <span className="text-gray-500 text-sm ml-1 font-medium">coins</span>
            </div>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            Complete tasks to earn coins and exclusive rewards!
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center mb-4 w-16 h-16">
              <div className="absolute inset-0 border-[2px] border-yellow-500/10 rounded-full"></div>
              <div className="absolute inset-0 border-[4px] border-transparent border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
              <div className="absolute inset-3 border-[2px] border-transparent border-b-yellow-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
              <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
            </div>
            <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-widest text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">Loading tasks...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 mb-12">
              <div className="bg-[#0B1120] border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center transition-all hover:border-blue-500/30 group">
                <Target size={28} className="text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-3xl font-black text-white mb-1">{tasksCompleted}/{dailyTasks.length}</div>
                <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Tasks Completed</div>
              </div>
              <div className="bg-[#0B1120] border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center transition-all hover:border-green-500/30 group">
                <Gift size={28} className="text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-3xl font-black text-white mb-1">{pendingClaims}</div>
                <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Pending Claims</div>
              </div>
              <div className="bg-[#0B1120] border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center transition-all hover:border-yellow-500/30 group">
                <Coins size={28} className="text-yellow-400 mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-3xl font-black text-yellow-400 mb-1">{coinsToClaim}</div>
                <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Coins to Claim</div>
              </div>
              <div className="bg-[#0B1120] border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center transition-all hover:border-purple-500/30 group">
                <Award size={28} className="text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-3xl font-black text-white mb-1">{claims.length}</div>
                <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Rewards Claimed</div>
              </div>
            </div>

            {/* Daily Tasks Section */}
            <div className="mb-16">
              <div className="flex items-center mb-6">
                <Calendar size={24} className="text-blue-400 mr-3" />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Daily Tasks</h2>
                <span className="ml-4 bg-blue-500/10 text-blue-400 text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest border border-blue-500/20">Resets every day</span>
              </div>

          <div className="grid grid-cols-1 gap-4">
            {dailyTasks.map(task => {
              // Calculate reset cooldown
              let timeLeft = null;
              let isCooldown = false;
              
              if (taskClaims[task.id]) {
                const lastClaim = taskClaims[task.id];
                const lastClaimDate = lastClaim.toDate ? lastClaim.toDate() : new Date(lastClaim);
                
                const startOfToday = new Date(currentTime);
                startOfToday.setHours(0, 0, 0, 0);

                if (lastClaimDate.getTime() >= startOfToday.getTime()) {
                  isCooldown = true;
                  const nextReset = new Date(startOfToday);
                  nextReset.setHours(24, 0, 0, 0);
                  const diff = nextReset.getTime() - currentTime.getTime();
                  
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                  timeLeft = `${hours}h ${minutes}m ${seconds}s`;
                }
              }

              const isClaimed = claims.includes(task.id) || isCooldown;
              const progressPercent = Math.min(100, (task.progress / task.target) * 100);
              const canClaim = task.isReady && !isClaimed;
              
              // Styles based on task state
              let borderColor = 'border-gray-800';
              let titleColor = 'text-white';
              let iconColor = 'text-gray-400';
              let icon = task.icon;

              return (
                <div key={task.id} className={`bg-[#0B1120] border ${borderColor} rounded-2xl p-5 relative overflow-hidden`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      {icon}
                      <h3 className={`${titleColor} font-bold text-lg`}>{task.title}</h3>
                      <Calendar size={16} className="text-gray-600 ml-2" />
                    </div>
                    
                    {isClaimed ? (
                      <span className="bg-green-500/10 text-green-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-green-500/20 flex items-center">
                        <Check size={12} className="mr-1" /> Claimed
                      </span>
                    ) : canClaim ? (
                      <span className="bg-green-500/20 text-green-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-green-500/30 flex items-center">
                        <CheckCircle2 size={12} className="mr-1" /> Ready
                      </span>
                    ) : (
                      <span className="bg-blue-500/10 text-blue-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-blue-500/20 flex items-center">
                        <Clock size={12} className="mr-1" /> In Progress
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-5">{task.description}</p>
                  
                  <div className="mb-5">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                      <span className="text-gray-500">Progress</span>
                      <span className="text-white">{Math.min(task.progress, task.target)} / {task.target}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div 
                        className={`${isClaimed || canClaim ? 'bg-green-500' : 'bg-blue-500'} h-2 rounded-full transition-all duration-500`} 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-800/50">
                    <div className="flex items-center">
                      <Coins size={18} className="text-yellow-400 mr-2" />
                      <span className="text-white font-bold text-base">{task.reward} Coins</span>
                    </div>
                    
                    {isCooldown ? (
                      <button disabled className="bg-gray-800 text-gray-500 font-bold py-1.5 px-5 rounded-lg text-xs transition-all flex items-center cursor-not-allowed border border-gray-700">
                        <Clock size={14} className="mr-2 flex-shrink-0" /> <span className="truncate">Refresh new task in {timeLeft}</span>
                      </button>
                    ) : canClaim ? (
                      <button 
                        onClick={() => handleClaim(task.id, task.reward)}
                        className="bg-green-500 hover:bg-green-400 text-black font-bold py-1.5 px-5 rounded-lg text-xs transition-all shadow-lg shadow-green-500/20 flex items-center"
                      >
                        <Gift size={14} className="mr-2" /> Claim
                      </button>
                    ) : isClaimed ? (
                      <span className="text-green-500 text-xs font-bold uppercase tracking-widest flex items-center">
                        <CheckCircle2 size={14} className="mr-1" /> Claimed
                      </span>
                    ) : (
                      <span className="text-gray-500 text-[10px] font-medium">Complete by joining tournaments</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Tasks Section */}
        <div className="mb-16">
          <div className="flex items-center mb-8">
            <Trophy size={28} className="text-purple-400 mr-4" />
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Weekly Challenge</h2>
            <span className="ml-6 bg-purple-500/10 text-purple-400 text-xs px-4 py-1.5 rounded-lg font-bold uppercase tracking-widest border border-purple-500/20">Resets every week</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {weeklyTasks.map(task => {
              // Calculate weekly reset cooldown
              let timeLeft = null;
              let isCooldown = false;
              
              if (taskClaims[task.id]) {
                const lastClaim = taskClaims[task.id];
                const lastClaimDate = lastClaim.toDate ? lastClaim.toDate() : new Date(lastClaim);
                
                const startOfWeek = new Date(currentTime);
                startOfWeek.setDate(currentTime.getDate() - currentTime.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                if (lastClaimDate.getTime() >= startOfWeek.getTime()) {
                  isCooldown = true;
                  const nextReset = new Date(startOfWeek);
                  nextReset.setDate(startOfWeek.getDate() + 7);
                  const diff = nextReset.getTime() - currentTime.getTime();
                  
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  timeLeft = `${days}d ${hours}h ${minutes}m`;
                }
              }

              const isClaimed = claims.includes(task.id) || isCooldown;
              const progressPercent = Math.min(100, (task.progress / task.target) * 100);
              const canClaim = task.isReady && !isClaimed;

              return (
                <div key={task.id} className="bg-[#0B1120] border border-gray-800 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      {task.icon}
                      <h3 className="text-white font-bold text-lg">{task.title}</h3>
                      <Clock size={16} className="text-gray-600 ml-2" />
                    </div>
                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border flex items-center ${
                      isClaimed 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : canClaim 
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {isClaimed ? <><Check size={12} className="mr-1" /> Claimed</> : canClaim ? 'Ready to Claim' : 'In Progress'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-5">{task.description}</p>
                  
                  <div className="mb-6">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                      <span className="text-gray-500">Progress</span>
                      <span className="text-white">{Math.min(task.progress, task.target)} / {task.target}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                      <div 
                        className="bg-purple-500 h-2.5 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.4)]" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-800/50">
                    <div className="flex items-center">
                      <Coins size={18} className="text-yellow-400 mr-2" />
                      <span className="text-white font-bold text-base">{task.reward} Coins Reward</span>
                    </div>
                    
                    {isCooldown ? (
                      <button disabled className="bg-gray-800 text-gray-500 font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center cursor-not-allowed border border-gray-700">
                        <Clock size={14} className="mr-2 flex-shrink-0" /> <span className="truncate">Refresh new task in {timeLeft}</span>
                      </button>
                    ) : canClaim ? (
                      <button
                        onClick={() => handleClaim(task.id, task.reward, true)}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                      >
                        Claim Reward
                      </button>
                    ) : isClaimed ? (
                      <span className="text-green-500 text-sm font-bold uppercase tracking-widest flex items-center">
                        <CheckCircle2 size={16} className="mr-2" /> Claimed
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs font-medium">Keep playing to unlock</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Information */}
        <div className="bg-[#0B1120] border border-gray-800 rounded-2xl p-6">
          <h3 className="text-yellow-400 font-bold text-xl mb-6">Task Information</h3>
          
          <div className="space-y-8">
            <div>
              <h4 className="text-white font-bold text-lg mb-3">Daily Tasks:</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Reset every day at midnight</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Quick and easy to complete</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Earn coins for immediate use</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-3">Weekly Tasks:</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Reset every Sunday at midnight</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Higher rewards and special prizes</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Weekly leaderboard reward is Top 1 only</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Win streak challenge requires 3 consecutive wins</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
