import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalLoader } from '../App';
import { 
  Book, ArrowLeft, Home, Trophy, Wallet, User, 
  BarChart2, CheckSquare, Calendar, HelpCircle, History, 
  Bell, MessageCircle, Shield, ChevronRight, AlertCircle, ChevronDown
} from 'lucide-react';

export default function Guidelines() {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const handleSectionChange = (id: string) => {
    setActiveSection(id);
    setIsMenuOpen(false);
  };

  const menuItems = [
    { id: 'Dashboard', icon: Home, label: 'Dashboard' },
    { id: 'Tournaments', icon: Trophy, label: 'Tournaments' },
    { id: 'My Wallet', icon: Wallet, label: 'My Wallet' },
    { id: 'Profile', icon: User, label: 'Profile' },
    { id: 'Leaderboard', icon: BarChart2, label: 'Leaderboard' },
    { id: 'Daily Tasks', icon: CheckSquare, label: 'Daily Tasks' },
    { id: 'Weekly Tasks', icon: Calendar, label: 'Weekly Tasks' },
    { id: 'Support', icon: HelpCircle, label: 'Support' },
    { id: 'Tournament History', icon: History, label: 'Tournament History' },
    { id: 'Notifications', icon: Bell, label: 'Notifications' },
    { id: 'FAQ', icon: MessageCircle, label: 'FAQ' },
    { id: 'Rules & Guidelines', icon: Shield, label: 'Rules & Guidelines' },
  ];

  return (
    <div className="min-h-screen bg-[#050B14] text-white font-sans pb-12">
      <div className="max-w-2xl mx-auto px-4 py-6">
        
        {/* Header Container */}
        <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl overflow-hidden shadow-xl mb-6">
          
          {/* Header Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <div className="bg-yellow-400 p-2.5 rounded-xl shadow-lg shadow-yellow-400/10">
                        <Book className="text-black" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">User Guidelines</h1>
                </div>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="bg-[#1E293B] p-2.5 rounded-xl border border-gray-700/50 text-gray-400 hover:text-white transition-colors"
                >
                    {isMenuOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>
            <p className="text-gray-400 text-sm mb-6">Complete guide for Gamer Zone</p>
            
            <Link 
                to="/" 
                className="inline-flex items-center px-5 py-2.5 bg-[#1A1500] hover:bg-[#2A2210] text-yellow-400 border border-yellow-500/20 rounded-xl text-sm font-medium transition-all"
            >
                <ArrowLeft size={18} className="mr-2" />
                Back to Dashboard
            </Link>
          </div>

          {isMenuOpen && (
            <>
              {/* Divider */}
              <div className="h-px bg-gray-800/50 mx-6"></div>

              {/* Scrollable Menu List */}
              <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className={`w-full flex items-center px-4 py-3.5 rounded-xl text-left transition-all duration-200 ${
                        isActive 
                          ? 'bg-[#2A2210] text-yellow-400 border border-yellow-500/20' 
                          : 'text-gray-400 hover:bg-[#1E293B]/50 hover:text-gray-200'
                      }`}
                    >
                      <Icon size={20} className={`mr-3 ${isActive ? 'text-yellow-400' : 'text-gray-500'}`} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeSection === 'Dashboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Hero Card */}
              <div className="bg-gradient-to-br from-[#2A1C05] to-[#0F0A00] border border-yellow-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-yellow-400/10 p-2 rounded-xl border border-yellow-500/20">
                    <Home size={24} className="text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white leading-tight">Dashboard Guide</h2>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  The Dashboard is your main control center where you can access all important features and information.
                </p>
              </div>

              {/* What You See Section */}
              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-5">What You See on Dashboard</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Wallet size={18} className="text-green-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="text-white font-bold">Wallet Balance:</span>
                      <span className="text-gray-400 ml-2">Shows your current coins</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Trophy size={18} className="text-yellow-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="text-white font-bold">Total Wins:</span>
                      <span className="text-gray-400 ml-2">Number of tournaments won</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <BarChart2 size={18} className="text-blue-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="text-white font-bold">Tournaments Played:</span>
                      <span className="text-gray-400 ml-2">Total participation count</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckSquare size={18} className="text-purple-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="text-white font-bold">Active Tournaments:</span>
                      <span className="text-gray-400 ml-2">Currently participating</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Access Options */}
              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-5">Quick Access Options</h3>
                <div className="space-y-3">
                  {['Browse Tournaments', 'Daily Tasks', 'My Wallet', 'Support'].map((item, i) => (
                    <div key={i} className="flex items-center text-gray-300 hover:text-yellow-400 transition-colors cursor-default group">
                      <ChevronRight size={16} className="text-yellow-500 mr-3 group-hover:translate-x-1 transition-transform" />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Note */}
              <div className="bg-[#1A1500] border border-yellow-500/20 rounded-2xl p-5 shadow-lg">
                <h3 className="text-yellow-400 font-bold text-base mb-2">Important Note</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Users should regularly check the Dashboard for updates. All information shown here is considered official.
                </p>
              </div>

            </div>
          )}

          {activeSection === 'Tournaments' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#2A1C05] to-[#0F0A00] border border-yellow-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-yellow-400/10 p-2 rounded-xl border border-yellow-500/20">
                    <Trophy size={24} className="text-yellow-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Tournaments Guide</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  The Tournaments section allows you to view and join active tournaments.
                </p>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Tournament Interface</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-2"><span>•</span> Wallet Balance (shown at the top)</li>
                  <li className="flex items-start gap-2"><span>•</span> Game Tabs: BR / CS / All</li>
                  <li className="flex items-start gap-2"><span>•</span> Modes: Solo / Squad</li>
                  <li className="flex items-start gap-2"><span>•</span> Active Tournaments (Upcoming & Running only)</li>
                  <li className="flex items-start gap-2"><span>•</span> Old or completed tournaments are not shown</li>
                </ul>
              </div>

              <div className="bg-[#1A0505] border border-red-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-red-400 mb-4">Important Tournament Rules</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="text-red-400 font-bold mb-1">Team-Up Rule</h4>
                    <p className="text-gray-400">Team-up is NOT allowed in Solo matches. If caught teaming up, the player may be penalized or eliminated.</p>
                  </div>
                  <div>
                    <h4 className="text-red-400 font-bold mb-1">Tournament Timing</h4>
                    <p className="text-gray-400">Tournaments do not run on a fixed daily time. The exact start time is mentioned on the tournament page.</p>
                  </div>
                  <div>
                    <h4 className="text-red-400 font-bold mb-1">Prize Distribution</h4>
                    <p className="text-gray-400">Prize distribution is fully controlled by the Admin and will be done at the Admin's decided time.</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Additional Rules</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-2"><span>•</span> Users must enter correct and final information while joining</li>
                  <li className="flex items-start gap-2"><span>•</span> After joining, refunds are not allowed (except for technical errors)</li>
                  <li className="flex items-start gap-2"><span>•</span> Using cheats, panels, or unfair communication is strictly prohibited</li>
                  <li className="flex items-start gap-2"><span>•</span> Admin can eliminate players without providing proof if rules are broken</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'My Wallet' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#052A1C] to-[#000F0A] border border-green-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-green-400/10 p-2 rounded-xl border border-green-500/20">
                    <Wallet size={24} className="text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Wallet Guide</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  Manage all your coins, deposits, and withdrawals.
                </p>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">How to Purchase Coins</h3>
                <ol className="space-y-3 text-sm text-gray-400">
                  <li>1. Click on "Purchase Coins" or "Deposit"</li>
                  <li>2. Enter the amount you want to add</li>
                  <li>3. Select payment method</li>
                  <li>4. Complete the payment</li>
                  <li>5. Coins will be added within 24 hours</li>
                </ol>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">How to Withdraw Money</h3>
                <ol className="space-y-3 text-sm text-gray-400">
                  <li>1. Click on "Withdraw"</li>
                  <li>2. Enter withdrawal amount</li>
                  <li>3. Select payment method</li>
                  <li>4. Submit withdrawal request</li>
                  <li>5. Money will be transferred within 24 hours</li>
                </ol>
              </div>

              <div className="bg-[#050B1A] border border-blue-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-blue-400 mb-4">Wallet Rules</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-800/50 pb-2">
                    <span className="text-white font-bold">Purchase Limits</span>
                    <span className="text-gray-400">Minimum: 50 PKR</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-800/50 pb-2">
                    <span className="text-white font-bold">Withdrawal Limits</span>
                    <span className="text-gray-400">Min: 100 coins | Max: 1200 coins</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-800/50 pb-2">
                    <span className="text-white font-bold">Processing Time</span>
                    <span className="text-gray-400">Within 24 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white font-bold">Cooldown Period</span>
                    <span className="text-gray-400">24 hours after withdrawal</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1500] border border-yellow-500/20 rounded-2xl p-5 shadow-lg">
                <h3 className="text-yellow-400 font-bold text-base mb-2">If Deposit Gets Rejected</h3>
                <p className="text-gray-400 text-sm mb-3">Contact Support with the following information:</p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Payment details, date and time</li>
                  <li>• Sender and receiver names</li>
                  <li>• Your name and payment method</li>
                  <li>• Date payment was sent</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'Profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#1C052A] to-[#0A000F] border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-purple-400/10 p-2 rounded-xl border border-purple-500/20">
                    <User size={24} className="text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Profile Guide</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  Your Profile contains all your personal and gaming information.
                </p>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <User size={18} className="text-blue-400" />
                    <span>Profile Picture</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <User size={18} className="text-blue-400" />
                    <span>Username</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <MessageCircle size={18} className="text-blue-400" />
                    <span>Email Address</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Bell size={18} className="text-blue-400" />
                    <span>Phone Number</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1A0505] border border-red-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-red-400 mb-4">Important Profile Rules</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-2"><span>•</span> Profile cannot be edited once created</li>
                  <li className="flex items-start gap-2"><span>•</span> One account per user only</li>
                  <li className="flex items-start gap-2"><span>•</span> Admin may verify profile before prize distribution</li>
                  <li className="flex items-start gap-2"><span>•</span> Wrong information may lead to account suspension</li>
                  <li className="flex items-start gap-2"><span>•</span> Profile picture must be appropriate</li>
                </ul>
              </div>

              <div className="bg-[#1A1500] border border-yellow-500/20 rounded-2xl p-5 shadow-lg">
                <h3 className="text-yellow-400 font-bold text-base mb-2">Remember</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Enter correct information during registration as it cannot be changed later. Make sure all details are accurate!
                </p>
              </div>
            </div>
          )}

          {activeSection === 'Leaderboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#2A1C05] to-[#0F0A00] border border-yellow-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-yellow-400/10 p-2 rounded-xl border border-yellow-500/20">
                    <BarChart2 size={24} className="text-yellow-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Leaderboard Guide</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  The Leaderboard shows top players based on their performance.
                </p>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Leaderboard Types</h3>
                <div className="space-y-3">
                  <div className="bg-[#050B1A] border border-blue-500/20 p-3 rounded-xl">
                    <h4 className="text-blue-400 font-bold text-sm">Daily Leaderboard</h4>
                    <p className="text-gray-400 text-xs">Based on Daily Tasks completion</p>
                  </div>
                  <div className="bg-[#1C052A] border border-purple-500/20 p-3 rounded-xl">
                    <h4 className="text-purple-400 font-bold text-sm">Weekly Leaderboard</h4>
                    <p className="text-gray-400 text-xs">Based on Weekly Tasks completion</p>
                  </div>
                  <div className="bg-[#052A1C] border border-green-500/20 p-3 rounded-xl">
                    <h4 className="text-green-400 font-bold text-sm">Overall Leaderboard</h4>
                    <p className="text-gray-400 text-xs">Based on tournament winnings</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">How Overall Rankings Work</h3>
                <p className="text-gray-400 text-sm mb-4">Rankings are based on:</p>
                <ul className="list-disc list-inside text-sm text-gray-300 mb-4">
                  <li>Total Tournament Winnings</li>
                </ul>
                <div className="bg-[#1E293B]/50 p-4 rounded-xl border border-gray-700/50">
                  <h4 className="text-white font-bold text-sm mb-2">Tie-Breaker Rule</h4>
                  <p className="text-gray-400 text-xs mb-4">If multiple players have the same winnings, the number of entered tournaments will be counted. The player with fewer entered tournaments will be ranked higher.</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-white font-bold">Example:</p>
                    <p className="text-gray-400">Player A: 500 winnings, 10 tournaments entered</p>
                    <p className="text-gray-400">Player B: 500 winnings, 8 tournaments entered</p>
                    <p className="text-green-400 font-bold mt-1">Result: Player B ranks higher</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#050B1A] border border-blue-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-blue-400 font-bold text-base mb-3">Important Notes</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Leaderboard is updated regularly</li>
                  <li>• Only verified accounts are shown</li>
                  <li>• Cheaters will be removed from rankings</li>
                  <li>• Rewards may change every 4-5 months</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'Daily Tasks' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#050B1A] to-[#00050F] border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-blue-400/10 p-2 rounded-xl border border-blue-500/20">
                    <CheckSquare size={24} className="text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Daily Tasks Guide</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  Daily Tasks allow users to earn free coins by completing simple activities.
                </p>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">What You See</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckSquare size={18} className="text-green-400" />
                    <span>Available Tasks</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Bell size={18} className="text-blue-400" />
                    <span>Task Status (Pending/Completed/Claimed)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Wallet size={18} className="text-yellow-400" />
                    <span>Reward Amount</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">How to Complete Tasks</h3>
                <ol className="space-y-3 text-sm text-gray-400">
                  <li>1. Go to Daily Tasks section</li>
                  <li>2. Select a task</li>
                  <li>3. Complete the required action</li>
                  <li>4. Click "Claim Reward"</li>
                  <li>5. Coins will be added to your wallet</li>
                </ol>
              </div>

              <div className="bg-[#052A1C] border border-green-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-green-400 mb-4">Task Rules</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="text-green-400 font-bold mb-1">Daily Reset</h4>
                    <p className="text-gray-400">Tasks reset every 24 hours at midnight</p>
                  </div>
                  <div>
                    <h4 className="text-green-400 font-bold mb-1">One-Time Claims</h4>
                    <p className="text-gray-400">Each task can be claimed only once per day</p>
                  </div>
                  <div>
                    <h4 className="text-green-400 font-bold mb-1">Verification</h4>
                    <p className="text-gray-400">Some tasks may require Admin verification</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1500] border border-yellow-500/20 rounded-2xl p-5 shadow-lg">
                <h3 className="text-yellow-400 font-bold text-base mb-2">Important Notes</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Complete tasks daily to maximize earnings</li>
                  <li>• Daily task performance affects Daily Leaderboard ranking</li>
                  <li>• Fake completion may lead to account ban</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'Weekly Tasks' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#052A1C] to-[#000F0A] border border-green-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-green-400/10 p-2 rounded-xl border border-green-500/20">
                    <Calendar size={24} className="text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Weekly Tasks Guide</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  Weekly Tasks allow users to earn rewards by completing activities throughout the week.
                </p>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">What You See</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Calendar size={18} className="text-green-400" />
                    <span>Available Weekly Tasks</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Bell size={18} className="text-blue-400" />
                    <span>Task Status</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Wallet size={18} className="text-yellow-400" />
                    <span>Reward Amount</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">How to Complete Weekly Tasks</h3>
                <ol className="space-y-3 text-sm text-gray-400">
                  <li>1. Go to Weekly Tasks section</li>
                  <li>2. Select a task</li>
                  <li>3. Complete required action within the week</li>
                  <li>4. Click "Claim Reward"</li>
                  <li>5. Rewards will be added to your wallet</li>
                </ol>
              </div>

              <div className="bg-[#052A1C] border border-green-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-green-400 mb-4">Task Rules</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="text-green-400 font-bold mb-1">Weekly Reset</h4>
                    <p className="text-gray-400">Tasks reset every week</p>
                  </div>
                  <div>
                    <h4 className="text-green-400 font-bold mb-1">One-Time Claims</h4>
                    <p className="text-gray-400">Each task can be claimed only once per week</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1500] border border-yellow-500/20 rounded-2xl p-5 shadow-lg">
                <h3 className="text-yellow-400 font-bold text-base mb-2">Important Notes</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Weekly task performance affects Weekly Leaderboard ranking</li>
                  <li>• Complete tasks before the week ends</li>
                  <li>• Fake completion may lead to account ban</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'Tournament History' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#050B1A] to-[#1C052A] border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-blue-400/10 p-2 rounded-xl border border-blue-500/20">
                    <History size={24} className="text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Tournament History Guide</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  View all your past tournament performances and results.
                </p>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">What You Can See</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Trophy size={18} className="text-yellow-400" />
                    <span>Tournament Name</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Calendar size={18} className="text-blue-400" />
                    <span>Date & Time</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <BarChart2 size={18} className="text-green-400" />
                    <span>Your Rank</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Wallet size={18} className="text-purple-400" />
                    <span>Prize Won</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <User size={18} className="text-blue-400" />
                    <span>Entered Players List</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">How to View History</h3>
                <ol className="space-y-3 text-sm text-gray-400">
                  <li>1. Go to "My Tournaments" or "History"</li>
                  <li>2. Select the tournament you want to view</li>
                  <li>3. View your results and other details</li>
                </ol>
              </div>

              <div className="bg-[#050B1A] border border-blue-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-blue-400 font-bold text-base mb-2">Important Notes</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  History is kept for transparency. Contact support if you find any error in results.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'Support' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#050B1A] to-[#00050F] border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-blue-400/10 p-2 rounded-xl border border-blue-500/20">
                    <HelpCircle size={24} className="text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Support Guide</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  The Support section helps you resolve issues and get answers.
                </p>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">How to Contact Support</h3>
                <ol className="space-y-3 text-sm text-gray-400 mb-4">
                  <li>1. Go to Support section</li>
                  <li>2. Choose contact method or submit a query</li>
                  <li>3. Describe your issue clearly</li>
                  <li>4. Submit and wait for response</li>
                </ol>
                <div className="bg-[#050B1A] border border-blue-500/20 p-3 rounded-xl">
                  <h4 className="text-blue-400 font-bold text-sm">Response Time:</h4>
                  <p className="text-gray-400 text-xs">Up to 42 hours</p>
                </div>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">What to Include in Query</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Your Username</li>
                  <li>• Tournament Name (if tournament-related)</li>
                  <li>• Detailed description of the problem</li>
                  <li>• Transaction details (for payment issues)</li>
                </ul>
              </div>

              <div className="bg-[#2A1C05] border border-orange-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-orange-400 mb-4">For Payment Issues Include</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Payment details</li>
                  <li>• Date and time of payment</li>
                  <li>• Sender and receiver names</li>
                  <li>• Your name</li>
                  <li>• Payment method used</li>
                  <li>• Date payment was sent</li>
                </ul>
              </div>

              <div className="bg-[#1A0505] border border-red-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-red-400 mb-4">Support Rules</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><span className="text-white font-bold">• Be Respectful:</span> Abusive language will result in query rejection</li>
                  <li><span className="text-white font-bold">• Complete Information:</span> Always provide all relevant details</li>
                  <li><span className="text-white font-bold">• One Issue Per Query:</span> Don't mix multiple problems</li>
                  <li><span className="text-white font-bold">• No Spam:</span> Don't send multiple queries for the same issue</li>
                </ul>
              </div>

              <div className="bg-[#050B1A] border border-blue-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-blue-400 font-bold text-base mb-3">Important Notes</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Support decisions are final</li>
                  <li>• False complaints may lead to account suspension</li>
                  <li>• Check FAQ before contacting support</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'FAQ' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#1C052A] to-[#0A000F] border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-purple-400/10 p-2 rounded-xl border border-purple-500/20">
                    <MessageCircle size={24} className="text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Frequently Asked Questions</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  Common questions and their answers to help you get started.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { q: "How do I join a tournament?", a: "Go to the Tournaments section → Select tournament → Click Join → Pay entry fee → join the tournament at the scheduled time." },
                  { q: "When will I get room ID and password?", a: "Room details are usually shared 10-15 minutes before the tournament starts on the tournament page." },
                  { q: "What if I don't receive room details?", a: "If you don't see room details 5 minutes before the start, contact support immediately." },
                  { q: "How are prizes distributed?", a: "Prizes are added to your wallet within 24 hours after the tournament results are verified." },
                  { q: "Can I cancel my tournament registration?", a: "No, once joined, registrations cannot be cancelled or refunded." },
                  { q: "What happens if I get disconnected during a match?", a: "Gamer Zone is not responsible for player disconnections or internet issues." },
                  { q: "How to report a cheater?", a: "Use the report option in the tournament history or contact support with proof." },
                  { q: "Why is my withdrawal pending?", a: "Withdrawals can take up to 24 hours to process. Please wait for the timeframe." },
                  { q: "What is the minimum purchase amount?", a: "The minimum coin purchase amount is 50 PKR." },
                  { q: "What is the minimum and maximum withdrawal amount?", a: "Minimum: 100 coins | Maximum: 1200 coins per transaction." },
                  { q: "Can I have multiple accounts?", a: "No, only one account per user is allowed. Multiple accounts will be banned." },
                  { q: "Can I edit my profile?", a: "Profile details like username and phone number cannot be edited once registered." },
                  { q: "My deposit was rejected. What should I do?", a: "Contact support with your payment proof and transaction ID." },
                  { q: "How does the Overall Leaderboard work?", a: "It ranks players based on their total tournament winnings." },
                  { q: "How long does support take to respond?", a: "Support usually responds within 24-42 hours." }
                ].map((faq, i) => (
                  <div key={i} className="bg-[#0F1521] border border-gray-800/50 rounded-xl overflow-hidden">
                    <button className="w-full flex items-center justify-between p-4 text-left group">
                      <span className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{faq.q}</span>
                      <ChevronRight size={16} className="text-gray-500" />
                    </button>
                    {i === 0 && (
                      <div className="px-4 pb-4 text-xs text-gray-400 leading-relaxed border-t border-gray-800/50 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'Rules & Guidelines' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-[#2A0505] to-[#0F0000] border border-red-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-red-400/10 p-2 rounded-xl border border-red-500/20">
                    <Shield size={24} className="text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-tight">Rules & Guidelines</h2>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 relative z-10">
                  Important rules and guidelines for all Gamer Zone users.
                </p>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Fair Play Policy</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• No cheats and hacks allowed</li>
                  <li>• No teaming in solo matches</li>
                  <li>• No abusive language or behavior</li>
                  <li>• Respect all players and admins</li>
                </ul>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Account Policy</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• One account per user only</li>
                  <li>• Provide correct information during registration</li>
                  <li>• Profile cannot be edited after creation</li>
                  <li>• Don't share login details</li>
                </ul>
              </div>

              <div className="bg-[#0F1521] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Payment Policy</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Minimum coin purchase: 50 PKR</li>
                  <li>• Minimum withdrawal: 100 coins</li>
                  <li>• Maximum withdrawal: 1200 coins</li>
                  <li>• Withdrawal response time: 24 hours</li>
                  <li>• Withdrawal cooldown: 24 hours after response</li>
                  <li>• Keep all transaction details for support</li>
                </ul>
              </div>

              <div className="bg-[#1A0505] border border-red-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-red-400 mb-4">Admin Rights</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Admin decisions are final</li>
                  <li>• Admin can ban accounts without prior notice for rule violations</li>
                  <li>• Admin controls prize distribution timing</li>
                  <li>• Admin can modify rules anytime</li>
                </ul>
              </div>

              <div className="bg-[#050B1A] border border-blue-500/20 rounded-2xl p-5 shadow-xl">
                <h3 className="text-lg font-bold text-blue-400 mb-4">User Responsibilities</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Read all rules before joining tournaments</li>
                  <li>• Check dashboard and notifications regularly</li>
                  <li>• Join tournament rooms on time</li>
                  <li>• Report issues with complete information</li>
                </ul>
              </div>

              <div className="bg-[#1A1500] border border-yellow-500/20 rounded-2xl p-5 shadow-lg">
                <h3 className="text-yellow-400 font-bold text-base mb-2">Contact Information</h3>
                <p className="text-sm text-white mb-1"><span className="font-bold">Support:</span> Available through in-app Support section</p>
                <p className="text-sm text-white"><span className="font-bold">Response Time:</span> Up to 42 hours</p>
              </div>

              <div className="bg-[#052A1C] border border-green-500/20 rounded-2xl p-5 shadow-lg">
                <h3 className="text-green-400 font-bold text-lg mb-3">Final Note</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  Gamer Zone is committed to providing a fair and transparent gaming experience. All users must follow the rules and guidelines mentioned above. Any violation may result in account suspension or permanent ban.
                </p>
                <p className="text-yellow-400 font-bold text-center text-lg">
                  Good Luck & Happy Gaming! 🎮🏆
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
