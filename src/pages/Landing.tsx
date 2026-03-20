import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, ArrowRight, Trophy, Zap, Star, Users, 
  DollarSign, Medal, Target, Clock, Globe, 
  BarChart3, CheckCircle2, CreditCard, Download, X, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';

const Landing: React.FC = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check for install prompt dismissal (1 hour cooldown)
    const dismissedAt = localStorage.getItem('installPromptDismissedAt');
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (!dismissedAt || now - parseInt(dismissedAt) > oneHour) {
      setShowInstallPrompt(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans relative overflow-x-hidden">

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-[#0D0D0F]/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center justify-center">
              <Logo className="h-10 w-auto" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-gray-300 hover:text-white font-medium transition-colors">
              Login
            </Link>
            <Link to="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 text-center overflow-hidden">
        {/* Background image/overlay */}
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
            alt="Gaming Background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0D] via-transparent to-[#0D0D0D]"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center space-x-2 bg-yellow-400/10 border border-yellow-400/20 px-4 py-1.5 rounded-full mb-8">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Premier FF Tournament Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-yellow-400 mb-4 leading-tight">
              Compete. Win.<br />Dominate.
            </h1>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-8">
              Gamer Zone Championship
            </h2>
            
            <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-6 leading-relaxed">
              Join Pakistan's most trusted Free Fire tournament platform. Compete in professional tournaments, win real cash prizes, and climb to the top of the leaderboard.
            </p>
            
            <p className="text-gray-400 text-sm mb-10">
              Transparent prize distribution • Fair gameplay • Instant withdrawals
            </p>
            
            <div className="flex flex-col space-y-4 max-w-xs mx-auto">
              <Link to="/register" className="bg-yellow-500 text-black font-bold py-4 px-8 rounded-xl flex items-center justify-center hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-900/20">
                Start Playing Now <ArrowRight size={20} className="ml-2" />
              </Link>
              <Link to="/login" className="bg-white/5 border border-white/10 text-white font-bold py-4 px-8 rounded-xl hover:bg-white/10 transition-all">
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto"
        >
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl text-center">
            <Users className="text-blue-400 mx-auto mb-3" size={32} />
            <div className="text-2xl font-black text-blue-400">1,500+</div>
            <div className="text-gray-400 text-sm">Active Players</div>
          </div>
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl text-center">
            <Trophy className="text-yellow-400 mx-auto mb-3" size={32} />
            <div className="text-2xl font-black text-yellow-400">100+</div>
            <div className="text-gray-400 text-sm">Tournaments</div>
          </div>
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl text-center">
            <DollarSign className="text-green-400 mx-auto mb-3" size={32} />
            <div className="text-2xl font-black text-green-400">Rs.100K+</div>
            <div className="text-gray-400 text-sm">Prize Money</div>
          </div>
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl text-center">
            <Medal className="text-purple-400 mx-auto mb-3" size={32} />
            <div className="text-2xl font-black text-purple-400">500+</div>
            <div className="text-gray-400 text-sm">Winners</div>
          </div>
        </motion.div>
      </section>

      {/* What is Gamer Zone? */}
      <section className="px-4 py-20 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-black text-yellow-400 mb-8">What is Gamer Zone?</h2>
          <p className="text-gray-400 mb-16 leading-relaxed">
            Gamer Zone is Pakistan's leading esports platform dedicated to Free Fire tournaments. We provide a professional, transparent, and secure environment for players to showcase their skills, compete in organized tournaments, and win real cash prizes.
          </p>
          
          <div className="space-y-12 text-left">
          <div className="flex items-start space-x-6">
            <div className="bg-yellow-400/10 p-3 rounded-xl">
              <Shield className="text-yellow-400" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">100% Secure & Transparent</h3>
              <p className="text-gray-500">Every transaction is tracked and verified. Your coins and winnings are completely safe with us.</p>
            </div>
          </div>
          <div className="flex items-start space-x-6">
            <div className="bg-blue-400/10 p-3 rounded-xl">
              <Zap className="text-blue-400" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Withdrawals</h3>
              <p className="text-gray-500">Win and withdraw your earnings instantly via NayaPay, Sadapay or Bank transfer.</p>
            </div>
          </div>
          <div className="flex items-start space-x-6">
            <div className="bg-green-400/10 p-3 rounded-xl">
              <Trophy className="text-green-400" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Professional Tournaments</h3>
              <p className="text-gray-500">Organized matches with clear rules, fair gameplay monitoring, and professional management.</p>
            </div>
          </div>
          <div className="flex items-start space-x-6">
            <div className="bg-purple-400/10 p-3 rounded-xl">
              <Users className="text-purple-400" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Growing Community</h3>
              <p className="text-gray-500">Join 1500+ active players and compete against the best Free Fire talents in Pakistan.</p>
            </div>
          </div>
          </div>
        </motion.div>
      </section>

      {/* Mission Statement */}
      <section className="px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-[#111827] border border-gray-800 p-10 rounded-[2.5rem] max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-black text-yellow-400 mb-6">Mission Statement</h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            To create a fair, transparent, and professional gaming ecosystem where Pakistani Free Fire players can compete, earn, and grow their esports careers without any barriers.
          </p>
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-800">
            <div className="text-center">
              <div className="text-3xl font-black text-yellow-400">24/7</div>
              <div className="text-gray-500 text-sm">Support Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-green-400">100%</div>
              <div className="text-gray-500 text-sm">Prize Payout</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Why Join Gamer Zone? */}
      <section className="px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-black text-yellow-400 mb-4">Why Join Gamer Zone?</h2>
          <p className="text-gray-400 mb-12">We offer the most competitive and rewarding Free Fire tournament experience in Pakistan</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            { icon: <DollarSign className="text-green-400" />, title: "Massive Prize Pools", desc: "Win up to Rs. 10,000+ in prizes per tournament. Top players earn 3500+ coins in Squad tournaments." },
            { icon: <Target className="text-blue-400" />, title: "Multiple Game Modes", desc: "Compete in Solo, Duo, or Squad matches. Choose your preferred battle style and dominate." },
            { icon: <Clock className="text-purple-400" />, title: "Daily Tournaments", desc: "New tournaments every day. Never miss a chance to compete and win real money." },
            { icon: <Shield className="text-red-400" />, title: "Fair Play Guaranteed", desc: "Anti-cheat measures, match monitoring, and strict rules ensure fair competition for everyone." },
            { icon: <BarChart3 className="text-yellow-400" />, title: "Skill-Based Ranking", desc: "Climb the leaderboard, showcase your stats, and earn recognition as a top player." },
            { icon: <Globe className="text-indigo-400" />, title: "Easy Access", desc: "Simple registration, easy coin purchase, and instant access to tournaments. Start playing in minutes." }
          ].map((item, i) => (
            <div key={i} className="bg-[#111827] border border-gray-800 p-8 rounded-3xl text-left">
              <div className="bg-gray-900 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-20 text-center bg-[#0D0D0D]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-black text-yellow-400 mb-4">How It Works</h2>
          <p className="text-gray-400 mb-16">Get started in 4 simple steps</p>
          
          <div className="max-w-md mx-auto space-y-12">
          {[
            { step: "1", icon: <Users className="text-yellow-400" />, title: "Create Account", desc: "Sign up with your email and create your player profile in seconds" },
            { step: "2", icon: <CreditCard className="text-yellow-400" />, title: "Buy Coins", desc: "Purchase coins via NayaPay, Sadapay, or Bank transfer. 1 coin = Rs. 4" },
            { step: "3", icon: <Trophy className="text-yellow-400" />, title: "Join Tournament", desc: "Browse available tournaments and register your team to compete" },
            { step: "4", icon: <Medal className="text-yellow-400" />, title: "Win & Withdraw", desc: "Play, win prizes, and withdraw your earnings instantly to your account" }
          ].map((item, i) => (
            <div key={i} className="bg-[#111827] border border-gray-800 p-8 rounded-3xl relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-black font-black text-xl border-4 border-[#0D0D0D]">
                {item.step}
              </div>
              <div className="flex flex-col items-center mt-4">
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
          </div>
        </motion.div>
      </section>

      {/* Tournament Prize Pools */}
      <section className="px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-black text-yellow-400 mb-4">Tournament Prize Pools</h2>
          <p className="text-gray-400 mb-12">Massive rewards for every game mode. Win big and grow your esports career!</p>
          
          <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 p-10 rounded-[2.5rem] max-w-2xl mx-auto">
            <CheckCircle2 className="text-green-400 mx-auto mb-6" size={64} />
            <h3 className="text-2xl font-black text-white mb-4">100% Prize Payout Guarantee</h3>
            <p className="text-gray-400 leading-relaxed">
              All prizes are fully guaranteed and paid out within 24 hours of tournament completion. We maintain complete transparency with our prize pools and distributions.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Easy & Secure Payments */}
      <section className="px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-black text-yellow-400 mb-4">Easy & Secure Payments</h2>
          <p className="text-gray-400 mb-12">Multiple payment methods supported for your convenience. Instant verification and secure transactions.</p>
          
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-16">
          {['NayaPay', 'Sadapay', 'JazzCash', 'EasyPaisa'].map((method) => (
            <div key={method} className="bg-[#111827] border border-gray-800 p-6 rounded-2xl flex flex-col items-center">
              <div className="bg-yellow-400/10 p-3 rounded-lg mb-4">
                <CreditCard className="text-yellow-400" size={24} />
              </div>
              <div className="text-white font-bold mb-1">{method}</div>
              <div className="text-gray-500 text-xs text-center">Instant Transfer</div>
            </div>
          ))}
        </div>
        
        <div className="bg-[#111827] border border-gray-800 p-10 rounded-[2.5rem] max-w-md mx-auto">
          <h3 className="text-2xl font-bold text-white mb-8">Payment Process</h3>
          <div className="space-y-10">
            {[
              { step: "1", title: "Send Payment", desc: "Transfer coins amount to our provided account using any supported payment method" },
              { step: "2", title: "Upload Screenshot", desc: "Submit payment proof screenshot through your dashboard for verification" },
              { step: "3", title: "Get Coins Instantly", desc: "Admin verifies and credits coins to your wallet within 24 hours" }
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center">
                <div className="w-10 h-10 bg-yellow-400/10 border border-yellow-400/20 rounded-full flex items-center justify-center text-yellow-400 font-bold mb-4">
                  {item.step}
                </div>
                <h4 className="text-white font-bold mb-2">{item.title}</h4>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-12 pt-8 border-t border-gray-800">
            <div>
              <div className="text-xl font-black text-green-400">Rs. 4</div>
              <div className="text-gray-500 text-[10px] uppercase">Per Coin</div>
            </div>
            <div>
              <div className="text-xl font-black text-yellow-400">&lt; 24hrs</div>
              <div className="text-gray-500 text-[10px] uppercase">Verification Time</div>
            </div>
          </div>
          <div className="mt-6 text-blue-400 font-bold text-sm">100% Secure & Safe</div>
        </div>
        </motion.div>
      </section>

      {/* Trusted by Thousands */}
      <section className="px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-black text-yellow-400 mb-4">Trusted by Thousands</h2>
          <p className="text-gray-400 mb-12">Join Pakistan's most active Free Fire community</p>
          
          <div className="max-w-md mx-auto space-y-6">
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-3xl">
            <Users className="text-blue-400 mx-auto mb-4" size={40} />
            <div className="text-4xl font-black text-blue-400 mb-2">1,500+</div>
            <div className="text-white font-bold mb-2">Active Players</div>
            <p className="text-gray-500 text-sm">Growing community of passionate Free Fire players competing daily</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-3xl">
            <DollarSign className="text-green-400 mx-auto mb-4" size={40} />
            <div className="text-4xl font-black text-green-400 mb-2">Rs. 100K+</div>
            <div className="text-white font-bold mb-2">Prizes Distributed</div>
            <p className="text-gray-500 text-sm">Total prize money won by players since our launch</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-3xl">
            <Medal className="text-yellow-400 mx-auto mb-4" size={40} />
            <div className="text-4xl font-black text-yellow-400 mb-2">500+</div>
            <div className="text-white font-bold mb-2">Tournament Winners</div>
            <p className="text-gray-500 text-sm">Players who have won prizes and withdrawn their earnings</p>
          </div>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-yellow-400/5 to-blue-400/5 border border-white/5 p-12 rounded-[3rem] max-w-4xl mx-auto relative overflow-hidden"
        >
          <Star className="text-yellow-400 mx-auto mb-8 animate-pulse" size={64} />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Ready to Start Your Winning Journey?
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of players competing for real cash prizes. Sign up now and get instant access to upcoming tournaments!
          </p>
          
          <div className="flex flex-col space-y-4 max-w-xs mx-auto mb-10">
            <Link to="/register" className="bg-yellow-500 text-black font-bold py-4 px-8 rounded-xl flex items-center justify-center hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-900/20">
              Create Free Account <ArrowRight size={20} className="ml-2" />
            </Link>
            <Link to="/login" className="bg-white/5 border border-white/10 text-white font-bold py-4 px-8 rounded-xl hover:bg-white/10 transition-all">
              Sign In
            </Link>
          </div>
          
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center text-green-400 text-sm">
              <CheckCircle2 size={16} className="mr-2" /> Free Registration
            </div>
            <div className="flex items-center text-green-400 text-sm">
              <CheckCircle2 size={16} className="mr-2" /> Instant Access
            </div>
            <div className="flex items-center text-green-400 text-sm">
              <CheckCircle2 size={16} className="mr-2" /> No Hidden Fees
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 text-center border-t border-gray-900">
        <div className="text-2xl font-black text-yellow-400 mb-2">Gamer Zone</div>
        <p className="text-gray-500 text-sm mb-8">The Ultimate Free Fire Tournament Platform</p>
        <p className="text-gray-600 text-[10px] mb-2">
          © {new Date().getFullYear()} Gamer Zone • All Rights Reserved
        </p>
        <p className="text-gray-700 text-[10px]">
          Powered by Next.js & Prisma
        </p>
      </footer>

      {/* Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-[100] lg:left-auto lg:right-6 lg:w-96"
          >
            <div className="bg-gradient-to-r from-[#F27D26] to-[#F7B733] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="bg-black/10 p-2 rounded-xl">
                  <Download size={24} className="text-black" />
                </div>
                <div className="flex-1">
                  <h3 className="text-black font-extrabold text-lg leading-tight mb-1">Install Gamer Zone</h3>
                  <p className="text-black/80 text-sm font-medium leading-tight mb-4">
                    Add to your home screen for quick access!
                  </p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowInstructions(true)}
                      className="flex-1 bg-black text-yellow-400 font-bold py-3 rounded-xl text-sm hover:bg-black/90 transition-colors"
                    >
                      Show Instructions
                    </button>
                    <button 
                      onClick={() => {
                        setShowInstallPrompt(false);
                        localStorage.setItem('installPromptDismissedAt', Date.now().toString());
                      }}
                      className="bg-[#E67E22] text-black p-3 rounded-xl hover:bg-[#D35400] transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1C1C1E] w-full max-w-sm rounded-3xl border border-gray-800 shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Install Gamer Zone</h2>
                  <button onClick={() => setShowInstructions(false)} className="text-gray-400 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                <div className="bg-[#0D0D0F] rounded-2xl p-5 border border-gray-800/50 mb-6">
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    To install this app on your Android device:
                  </p>
                  <ol className="space-y-4">
                    <li className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                      <span className="text-yellow-400 font-bold">1.</span>
                      <span>Tap the <span className="text-white font-bold">menu icon</span> (three dots) in your browser</span>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                      <span className="text-yellow-400 font-bold">2.</span>
                      <span>Select <span className="text-white font-bold">"Install app"</span> or <span className="text-white font-bold">"Add to Home screen"</span></span>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                      <span className="text-yellow-400 font-bold">3.</span>
                      <span>Confirm the installation</span>
                    </li>
                  </ol>
                </div>

                <div className="flex items-center gap-3 mb-8 px-2">
                  <div className="bg-yellow-400/10 p-1.5 rounded-lg border border-yellow-400/20">
                    <Plus size={16} className="text-yellow-400" />
                  </div>
                  <p className="text-yellow-400 text-sm font-bold">
                    Works best on Google Chrome
                  </p>
                </div>

                <button 
                  onClick={() => setShowInstructions(false)}
                  className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-500 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Landing;
