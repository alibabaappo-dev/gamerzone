import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Award, Coins, Calendar, Users, User, Info, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Tournament({ user }: { user?: any }) {
  const { id } = useParams();
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Fetch tournament details
    const tournamentRef = doc(db, 'tournaments', id);
    const unsubTournament = onSnapshot(tournamentRef, (docSnap) => {
      if (docSnap.exists()) {
        setTournament({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    });

    // Fetch users (needed for account names)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });

    // Fetch participants (registrations)
    const registrationsQuery = query(
      collection(db, 'registrations'),
      where('tournamentId', '==', id)
    );
    const unsubParticipants = onSnapshot(registrationsQuery, (snapshot) => {
      const participantsData = snapshot.docs.map((regDoc) => {
        const data = regDoc.data();
        
        // Resolve account name from users state
        const userData = users.find(u => u.id === data.userId);
        let accountName = 'Unknown User';
        let hideEmail = false;
        let userEmail = '';

        if (userData) {
          hideEmail = userData.hideEmail === true;
          userEmail = userData.email || '';
          accountName = userData.username || userEmail.split('@')[0] || 'Unknown User';
        }

        // Mask email if hidden and not admin
        if (hideEmail && !user?.isAdmin && accountName.includes('@') === false) {
           if (userEmail && accountName === userEmail.split('@')[0]) {
              const [name] = userEmail.split('@');
              if (name.length > 2) {
                 accountName = `${name.slice(0, 2)}****${name.slice(-1)}`;
              } else {
                 accountName = `${name}****`;
              }
           }
        }
        
        return {
          id: regDoc.id,
          accountName,
          ...data
        };
      });
      setParticipants(participantsData);
    });

    return () => {
      unsubTournament();
      unsubParticipants();
      unsubUsers();
    };
  }, [id, users, user?.isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex flex-col items-center justify-center text-white">
        <div className="relative flex items-center justify-center mb-4 w-16 h-16">
          <div className="absolute inset-0 border-[2px] border-yellow-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-[4px] border-transparent border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.4)]"></div>
          <div className="absolute inset-3 border-[2px] border-transparent border-b-yellow-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
          <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
        </div>
        <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-widest text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">Loading Tournament Details...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#050B14] flex flex-col items-center justify-center text-white p-6 text-center">
        <Trophy className="text-gray-700 mb-4" size={64} />
        <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
        <p className="text-gray-500 mb-6">The tournament you are looking for does not exist or has been removed.</p>
        <Link to="/tournaments" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-colors">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  const prizes = tournament.distribution || [
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
  ];

  return (
    <div className="min-h-screen bg-[#050B14] text-white p-4 pb-24 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* Notice Box */}
        <div className="border border-yellow-600/50 bg-[#0F172A] rounded-xl p-4 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
          <p className="text-xs text-gray-300 leading-relaxed">
            <span className="text-yellow-400 font-bold">Notice:</span> All entry fees are under complete admin control. Admin determines prize allocation and distribution. This ensures halal and transparent operations.
          </p>
        </div>

        {/* Back Link */}
        <Link to="/tournaments" className="flex items-center text-blue-400 text-sm mb-6 hover:text-blue-300 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back to Tournaments
        </Link>

        {/* Header Section */}
        <div className="mb-8">
          <Trophy className="text-yellow-400 mb-2" size={32} />
          <h1 className="text-3xl font-bold text-yellow-400 mb-4 leading-tight uppercase tracking-tight">
            {tournament.name}
          </h1>
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
            <div className="flex items-center"><Trophy size={14} className="text-blue-400 mr-1.5" /> {tournament.gameType || 'BR'}</div>
            <div className="flex items-center"><Users size={14} className="text-purple-400 mr-1.5" /> {tournament.mode || 'Solo'}</div>
            <div className="flex items-center"><Coins size={14} className="text-yellow-400 mr-1.5" /> Entry: {tournament.entryFee} coins</div>
            <div className="flex items-center"><Trophy size={14} className="text-green-400 mr-1.5" /> Prize: {tournament.prizePool} coins</div>
            <div className="flex items-center"><Award size={14} className="text-yellow-400 mr-1.5" /> {tournament.prizeType || 'Top 10'}</div>
            <div className="flex items-center"><Users size={14} className="text-blue-400 mr-1.5" /> Slots: {tournament.participants || 0}/{tournament.totalSlots || 48}</div>
            <div className="flex items-center w-full mt-1"><Calendar size={14} className="text-orange-400 mr-1.5" /> {tournament.time || tournament.startTime}</div>
          </div>
        </div>

        {/* Prize Distribution */}
        {tournament.showPrizeDistribution !== false && (
          <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-5 mb-6">
            <h2 className="text-yellow-400 font-bold text-sm mb-1">Prize Distribution - {tournament.prizeType || 'Top 10'} (Admin Controlled)</h2>
            <p className="text-gray-500 text-xs mb-6">Admin has complete authority to adjust amounts as deemed appropriate</p>

            <div className="grid grid-cols-5 gap-3">
              {prizes.map((p: any, i: number) => (
                <div key={i} className={`border border-gray-800 rounded-xl p-2 flex flex-col items-center justify-center bg-[#0D0D0D] h-24`}>
                  <div className="text-[10px] text-gray-400 mb-1 text-center leading-tight">{p.rank.replace(' ', '\n')}</div>
                  <div className={`text-xl font-bold ${p.color || 'text-cyan-400'} mb-1`}>{p.points}</div>
                  <div className="text-[10px] text-gray-600">({p.percent})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 bg-[#1E293B] p-3 text-xs font-bold text-gray-400 border-b border-gray-700">
            <div className="col-span-4 pl-2">User Name</div>
            <div className="col-span-4 text-center">Player Name</div>
            <div className="col-span-4 text-right pr-2">Joined At</div>
          </div>
          
          <div className="divide-y divide-gray-800">
            {participants.length > 0 ? (
              participants.map((player, index) => (
                <div key={index} className="grid grid-cols-12 p-4 items-center hover:bg-gray-800/30 transition-colors">
                  <div className="col-span-4 font-bold text-sm text-white pl-2 truncate">{player.accountName}</div>
                  <div className="col-span-4 text-center text-sm text-gray-300 font-mono truncate">{player.freeFireName}</div>
                  <div className="col-span-4 text-right text-[10px] text-gray-500 pr-2 leading-tight">
                    {player.joinedAt?.toDate ? player.joinedAt.toDate().toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }) : 'Just now'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Users className="mx-auto mb-2 opacity-20" size={48} />
                <p className="text-sm font-bold">No participants yet</p>
                <p className="text-xs">Be the first one to join!</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
