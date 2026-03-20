import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Calendar, Target, Clock, CheckCircle2, Award, Star, Check, User } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, query, orderBy, limit } from 'firebase/firestore';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('overall');
  const [users, setUsers] = useState<any[]>([]);
  const [leaderboardConfig, setLeaderboardConfig] = useState({
    dailyRewards: 'Top 3 get 50 coins!',
    weeklyChampion: 'Winner gets 500 Diamonds',
    allTimeChampion: 'Hall of Fame'
  });

  useEffect(() => {
    // 1. Listen to top 100 users for real-time leaderboard
    const q = query(collection(db, 'users'), orderBy('totalWins', 'desc'), limit(100));
    const unsubUsers = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });

    // 2. Listen to leaderboard config
    const unsubConfig = onSnapshot(doc(db, 'settings', 'leaderboard'), (docSnap) => {
      if (docSnap.exists()) {
        setLeaderboardConfig(docSnap.data() as any);
      }
    });

    return () => {
      unsubUsers();
      unsubConfig();
    };
  }, []);

  // Sort users by totalWins for overall
  const overallPlayers = [...users]
    .sort((a, b) => (b.totalWins || 0) - (a.totalWins || 0))
    .map((u, index) => ({
      rank: index + 1,
      username: u.username || 'Anonymous',
      email: u.email,
      score: u.totalWins || 0,
      confirmed: true,
      photoURL: u.photoURL
    }));

  return (
    <div className="min-h-screen bg-[#050B14] text-white p-4 font-sans">
      <div className="max-w-md mx-auto">
        <Link to="/" className="inline-flex items-center text-gray-400 mb-6 hover:text-white transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center mb-2">
            <Trophy size={32} className="text-yellow-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Compete with other players for all-time glory!
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          
          {/* Overall Content */}
          <>
            <div className="flex items-center mb-2">
              <Trophy size={24} className="text-yellow-400 mr-3" />
              <h2 className="text-xl font-bold text-white">All-Time Champions</h2>
            </div>

            {/* Lifetime Achievements Card */}
            <div className="bg-gradient-to-br from-[#1e1b2e] to-[#0F0A16] border border-purple-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden mb-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <h3 className="text-purple-400 font-bold text-lg mb-4">Lifetime Achievements</h3>
              <div className="space-y-4">
                {leaderboardConfig.allTimeChampion.split('\n').map((line, idx) => {
                  const parts = line.split(':');
                  return (
                    <div key={idx} className="flex items-start">
                      {idx === 0 ? <Trophy size={18} className="text-yellow-400 mr-3 mt-0.5 flex-shrink-0" /> : 
                       idx === 1 ? <Medal size={18} className="text-gray-300 mr-3 mt-0.5 flex-shrink-0" /> :
                       <Medal size={18} className="text-orange-400 mr-3 mt-0.5 flex-shrink-0" />}
                      <span className="text-purple-200 text-sm">
                        {parts.length > 1 ? (
                          <>
                            <span className="font-bold text-white">{parts[0]}:</span>
                            {parts.slice(1).join(':')}
                          </>
                        ) : (
                          line
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Confirmation System Card */}
            <div className="bg-gradient-to-br from-[#05101A] to-[#050B14] border border-emerald-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden mb-6">
              <div className="flex items-start mb-3">
                <Award size={20} className="text-emerald-400 mr-3 mt-1" />
                <h3 className="text-emerald-400 font-bold text-md">Tournament Confirmation System</h3>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Top players are confirmed by administrators after tournament completion. Confirmed winners receive guaranteed rewards and special recognition.
              </p>
            </div>

            {/* Player List */}
            <div className="space-y-3">
              {overallPlayers.map((player) => (
                <div 
                  key={player.rank} 
                  className={`rounded-2xl p-4 flex items-center justify-between border transition-all ${
                    player.rank === 1 ? 'bg-[#1A1500] border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' :
                    player.rank === 2 ? 'bg-[#0F1521] border-gray-400/30' :
                    player.rank === 3 ? 'bg-[#1A0F0A] border-orange-500/30' :
                    'bg-[#0B101A] border-gray-800/50'
                  }`}
                >
                  <div className="flex items-center overflow-hidden">
                    <div className="w-8 flex justify-center mr-4 flex-shrink-0">
                      {player.rank === 1 ? (
                        <div className="relative">
                          <Trophy size={24} className="text-yellow-400" />
                          <Check size={12} className="text-green-500 absolute -bottom-1 -right-2" strokeWidth={4} />
                        </div>
                      ) : player.rank === 2 ? (
                        <div className="relative">
                          <Medal size={24} className="text-gray-300" />
                          <Check size={12} className="text-green-500 absolute -bottom-1 -right-2" strokeWidth={4} />
                        </div>
                      ) : player.rank === 3 ? (
                        <div className="relative">
                          <Medal size={24} className="text-orange-400" />
                          <Check size={12} className="text-green-500 absolute -bottom-1 -right-2" strokeWidth={4} />
                        </div>
                      ) : (
                        <span className="text-gray-500 font-bold text-sm">#{player.rank}</span>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center mb-0.5">
                        <span className={`font-black text-sm truncate mr-2 ${
                          player.rank === 1 ? 'text-yellow-400' : 
                          player.rank === 2 ? 'text-gray-300' : 
                          player.rank === 3 ? 'text-orange-400' : 'text-white'
                        }`}>
                          {player.username}
                        </span>
                        {[1, 2, 3].includes(player.rank) && (
                          <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0 mr-2 animate-pulse" />
                        )}
                        {player.confirmed && player.rank <= 5 && (
                          <div className="flex items-center bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} className="text-green-500 mr-1" />
                            <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Pro</span>
                          </div>
                        )}
                      </div>
                      <div className="text-gray-500 text-[10px] font-mono truncate">{player.email}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-xl font-black text-white leading-none">{player.score}</div>
                    <div className="text-gray-500 text-[9px] font-black uppercase tracking-widest mt-1">
                      Wins
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        </div>
      </div>
    </div>
  );
}
