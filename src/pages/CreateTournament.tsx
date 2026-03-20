import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Trophy, Calendar, Clock, Target, DollarSign, Users, Tag, List, X, ChevronLeft, Coins } from 'lucide-react';
import { motion } from 'motion/react';

export default function CreateTournament() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Solo');
  const [time, setTime] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [perKill, setPerKill] = useState('');
  const [prizePool, setPrizePool] = useState('');
  const [matchTag, setMatchTag] = useState('Survival');
  const [prizeDistribution, setPrizeDistribution] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCreated, setIsCreated] = useState(false);
  const [isSendingPush, setIsSendingPush] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'tournaments'), {
        name,
        category,
        time,
        entryFee: Number(entryFee),
        perKill: Number(perKill),
        prizePool: Number(prizePool),
        matchTag,
        prizeDistribution,
        description,
        participants: 0,
        status: 'Upcoming',
        createdAt: serverTimestamp(),
        gameType: 'Free Fire',
        mode: category // Using category as mode
      });
      
      setIsCreated(true);
      setIsSubmitting(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create tournament');
      setIsSubmitting(false);
    }
  };

  const handleSendPush = async () => {
    setIsSendingPush(true);
    try {
      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Tournament Added! 🏆',
          body: `New ${name} has been added. Join Now!`,
          target: 'all'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send push notification');
      }

      // Also create in-app notification
      await addDoc(collection(db, 'admin', 'global', 'notifications'), {
        title: 'New Tournament Added! 🏆',
        message: `New ${name} has been added. Join Now!`,
        type: 'tournament',
        createdAt: serverTimestamp()
      });

      alert('Notification sent successfully!');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to send push notification');
      setIsSendingPush(false);
    }
  };

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        {/* Header with Close Option */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/tournaments')}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Trophy size={32} className="text-yellow-500" /> Create Tournament
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#131B2F] border border-gray-800 rounded-[2.5rem] p-6 lg:p-10 space-y-8 shadow-2xl relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm font-bold flex items-center gap-3"
            >
              <X size={18} className="flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tournament Title */}
            <div className="md:col-span-2">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-yellow-500" /> Tournament Title
              </label>
              <input
                type="text"
                className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 transition-all font-bold text-lg placeholder:text-gray-700"
                placeholder="PRO LEAGUE SEASON 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isCreated}
              />
            </div>

            {/* Category */}
            <div className="space-y-3">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Users size={14} className="text-blue-400" /> Category
              </label>
              <select
                className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-all font-bold appearance-none cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isCreated}
              >
                <option value="Solo">Solo</option>
                <option value="Duo">Duo</option>
                <option value="Squad">Squad</option>
              </select>
            </div>

            {/* Time */}
            <div className="space-y-3">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock size={14} className="text-purple-400" /> Match Time
              </label>
              <input
                type="text"
                className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-all font-bold placeholder:text-gray-700"
                placeholder="05:00 PM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                disabled={isCreated}
              />
            </div>

            {/* Entry Fee */}
            <div className="space-y-3">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <DollarSign size={14} className="text-yellow-400" /> Entry Fee
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-all font-bold pl-12"
                  placeholder="0"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  required
                  disabled={isCreated}
                />
                <Coins size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500/50" />
              </div>
            </div>

            {/* Per Kill */}
            <div className="space-y-3">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Target size={14} className="text-red-400" /> Per Kill
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-all font-bold pl-12"
                  placeholder="0"
                  value={perKill}
                  onChange={(e) => setPerKill(e.target.value)}
                  required
                  disabled={isCreated}
                />
                <Target size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500/50" />
              </div>
            </div>

            {/* Prize Pool */}
            <div className="space-y-3">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Trophy size={14} className="text-green-400" /> Total Prize Pool
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-all font-bold pl-12"
                  placeholder="0"
                  value={prizePool}
                  onChange={(e) => setPrizePool(e.target.value)}
                  required
                  disabled={isCreated}
                />
                <Trophy size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500/50" />
              </div>
            </div>

            {/* Match Tag */}
            <div className="space-y-3">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Tag size={14} className="text-orange-400" /> Match Tag
              </label>
              <select
                className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-all font-bold appearance-none cursor-pointer"
                value={matchTag}
                onChange={(e) => setMatchTag(e.target.value)}
                disabled={isCreated}
              >
                <option value="Survival">Survival</option>
                <option value="Per Kill">Per Kill</option>
                <option value="Classic">Classic</option>
              </select>
            </div>

            {/* Prize Distribution */}
            <div className="md:col-span-2 space-y-3">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <List size={14} className="text-cyan-400" /> Prize Distribution Details
              </label>
              <textarea
                className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-all font-bold min-h-[120px] resize-none placeholder:text-gray-700"
                placeholder="1st: 500 Coins&#10;2nd: 300 Coins&#10;3rd: 200 Coins"
                value={prizeDistribution}
                onChange={(e) => setPrizeDistribution(e.target.value)}
                required
                disabled={isCreated}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-3">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <List size={14} className="text-gray-400" /> Tournament Description
              </label>
              <textarea
                className="w-full bg-[#0B1121] border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-all font-bold min-h-[120px] resize-none placeholder:text-gray-700"
                placeholder="Rules, map details, and other information..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreated}
              />
            </div>
          </div>

          {!isCreated ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] transition-all shadow-[0_20px_40px_rgba(234,179,8,0.15)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? 'Creating Tournament...' : 'Create Tournament'}
            </button>
          ) : (
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-2xl text-center font-bold">
              Tournament Created Successfully!
            </div>
          )}

          {/* Push Notification Section */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target size={20} className="text-yellow-500" /> Push Notification
            </h3>
            
            <div className="bg-[#0B1121] p-6 rounded-2xl border border-gray-800 mb-6">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Preview</p>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trophy size={20} className="text-yellow-500" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">New Tournament Added! 🏆</h4>
                  <p className="text-gray-400 text-sm mt-1">
                    New <span className="text-yellow-400">{name || '(Match Name)'}</span> has been added. Join Now!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleSendPush}
                disabled={!isCreated || isSendingPush}
                className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isCreated 
                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_10px_20px_rgba(234,179,8,0.15)]' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSendingPush ? 'Sending...' : 'Send Notification'}
              </button>
              
              {isCreated && (
                <button
                  type="button"
                  onClick={() => navigate('/tournaments')}
                  className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all"
                >
                  Done
                </button>
              )}
            </div>
            {!isCreated && (
              <p className="text-center text-xs text-gray-500 mt-3">
                Create the tournament first to send notifications.
              </p>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
