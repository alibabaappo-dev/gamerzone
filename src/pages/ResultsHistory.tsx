import { useState, useEffect } from 'react';
import { ArrowLeft, Award, History, Trophy, Calendar, Clock, Target, Coins, User2, Hash, Wallet, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

export default function ResultsHistory() {
  const [user] = useAuthState(auth);
  const [resultsHistory, setResultsHistory] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch all tournaments to get entry fee and prize pool
    const fetchTournaments = async () => {
      const querySnapshot = await getDocs(collection(db, 'tournaments'));
      const tournamentMap: Record<string, any> = {};
      querySnapshot.forEach((doc) => {
        tournamentMap[doc.id] = doc.data();
      });
      setTournaments(tournamentMap);
    };

    fetchTournaments();

    // Fetch results history
    const qResults = query(
      collection(db, 'resultsHistory'),
      where('userId', '==', user.uid)
    );

    const unsubResults = onSnapshot(qResults, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by createdAt descending locally
      results.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeB - timeA;
      });

      setResultsHistory(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching results history:", error);
      setLoading(false);
    });

    return () => {
      unsubResults();
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-[#050B14] text-white p-4 font-sans pb-20">
      <div className="max-w-md mx-auto">
        <Link to="/" className="flex items-center text-gray-400 mb-6 hover:text-white transition-colors group w-fit">
          <div className="w-8 h-8 rounded-full bg-gray-800/50 flex items-center justify-center mr-3 group-hover:bg-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">Back</span>
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 p-0.5 shadow-lg shadow-yellow-500/20">
            <div className="w-full h-full rounded-[14px] bg-[#050B14] flex items-center justify-center">
              <Award className="text-yellow-400" size={24} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Results History</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Your Match Performance</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center mb-6 w-16 h-16">
              <div className="absolute inset-0 border-[2px] border-yellow-500/10 rounded-full"></div>
              <div className="absolute inset-0 border-[4px] border-transparent border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
              <div className="absolute inset-3 border-[2px] border-transparent border-b-yellow-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
              <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
            </div>
            <p className="text-yellow-400 font-black animate-pulse uppercase tracking-[0.3em] text-xs drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">Loading Data</p>
          </div>
        ) : resultsHistory.length === 0 ? (
          <div className="bg-[#0B1120] rounded-[2rem] p-10 border border-gray-800/50 text-center shadow-2xl">
            <div className="w-16 h-16 bg-gray-800/30 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-gray-700/30">
              <Award className="text-gray-700" size={32} />
            </div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No History</p>
            <p className="text-gray-600 text-[10px] mt-2 font-medium">Join a tournament to see your results here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {resultsHistory.map((res) => (
              <div key={res.id} className="bg-[#0F172A] border border-gray-800 rounded-[2rem] overflow-hidden hover:border-yellow-500/30 transition-all group shadow-xl">
                {/* Header with status */}
                <div className="bg-[#1E293B]/40 px-6 py-4 border-b border-gray-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      Match ID: {res.tournamentId?.slice(-8) || 'N/A'}
                    </span>
                  </div>
                  <div className={`text-[10px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest border shadow-lg ${
                    res.type === 'Winning' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/5' 
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5'
                  }`}>
                    {res.type || 'Match'}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-800/50 flex items-center justify-center border border-gray-700/50 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <Trophy className="text-yellow-400" size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white group-hover:text-yellow-400 transition-colors tracking-tight">
                        {res.tournamentName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <History size={12} className="text-gray-600" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Completed</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-[#1E293B]/20 p-5 rounded-2xl border border-gray-800/50 shadow-inner">
                    {/* Tournament Info */}
                    <div className="space-y-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Wallet size={10} className="text-gray-600" />
                          <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Match entry</span>
                        </div>
                        <span className="text-sm font-bold text-white truncate pl-4 border-l-2 border-gray-800">
                          {tournaments[res.tournamentId]?.entryFee || 0} Coins
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Target size={10} className="text-gray-600" />
                          <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">IGN Name</span>
                        </div>
                        <span className="text-sm font-bold text-yellow-500 truncate pl-4 border-l-2 border-yellow-500/20">{res.ign || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Match Stats */}
                    <div className="space-y-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Gift size={10} className="text-red-500/50" />
                          <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Match prize pool</span>
                        </div>
                        <span className="text-sm font-black text-red-400 pl-4 border-l-2 border-red-500/20">
                          {tournaments[res.tournamentId]?.prizePool || 0} Coins
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Hash size={10} className="text-gray-600" />
                          <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">FF UID</span>
                        </div>
                        <span className="text-sm font-bold text-gray-300 truncate pl-4 border-l-2 border-gray-800">{res.uid || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="mt-6 pt-6 border-t border-gray-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2.5 bg-gray-800/30 px-3 py-1.5 rounded-xl border border-gray-700/30">
                        <Award className="text-blue-400" size={14} />
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                          {res.type || 'Match'} 
                          {res.type === 'Winning' && (
                            <span className="text-green-400 ml-2 flex items-center gap-1 inline-flex">
                              <Coins size={10} />
                              ({res.amount || 0} Coins)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        <Calendar size={10} className="text-gray-600" />
                        {res.createdAt?.toDate ? res.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-mono font-bold">
                        <Clock size={10} className="text-gray-700" />
                        {res.createdAt?.toDate ? res.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
