import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Copy, Share2, Users, Gift, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Referral({ user }: { user: any }) {
  const [referralCode, setReferralCode] = useState(user.referralCode || '');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!user.referralCode);

  useEffect(() => {
    if (user.referralCode) {
      setReferralCode(user.referralCode);
    }
    setLoading(false);
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Gamer Zone!',
          text: `Use my referral code ${referralCode} to get a bonus!`,
          url: window.location.origin,
        });
      } catch (error) {
        // Silent fail for share error
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-[#050B14] text-white p-4 font-sans">
      <div className="max-w-md mx-auto">
        <Link to="/" className="inline-flex items-center text-gray-400 mb-6 hover:text-white transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
            <Gift size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Refer & Earn</h1>
          <p className="text-gray-400 text-sm">
            Invite your friends and earn rewards when they join and play!
          </p>
        </div>

        {/* Referral Code Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0F172A] border border-gray-800/50 rounded-3xl p-6 mb-8 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <h2 className="text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Your Referral Code</h2>
          
          <div className="bg-[#050B14] border border-white/5 rounded-2xl p-5 flex items-center justify-center gap-4 mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {loading ? (
              <div className="animate-pulse h-8 w-32 bg-gray-800/50 rounded-lg"></div>
            ) : (
              <span className="text-3xl font-black text-white tracking-[0.15em] font-mono">{referralCode}</span>
            )}
            
            <button 
              onClick={handleCopy}
              className="p-2.5 bg-[#1E293B]/80 hover:bg-gray-700 border border-white/10 rounded-xl transition-all text-white active:scale-90 shadow-lg"
            >
              {copied ? <CheckCircle2 size={20} className="text-green-400" /> : <Copy size={20} />}
            </button>
          </div>

          <button 
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center transition-all active:scale-95"
          >
            <Share2 size={20} className="mr-2" />
            Share with Friends
          </button>
        </motion.div>

        {/* How it Works */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white mb-4">How it works</h3>
          
          <div className="flex items-start bg-[#0F172A] p-4 rounded-2xl border border-gray-800/50">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mr-4">
              <Share2 size={20} className="text-blue-400" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Share your code</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Send your unique referral code to your friends via WhatsApp, Telegram, or social media.
              </p>
            </div>
          </div>

          <div className="flex items-start bg-[#0F172A] p-4 rounded-2xl border border-gray-800/50">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mr-4">
              <Users size={20} className="text-purple-400" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Friends join</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your friends sign up using your code and play their first tournament.
              </p>
            </div>
          </div>

          <div className="flex items-start bg-[#0F172A] p-4 rounded-2xl border border-gray-800/50">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mr-4">
              <Gift size={20} className="text-yellow-400" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Earn Rewards</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                You get 10 coins for every friend who joins and plays!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
