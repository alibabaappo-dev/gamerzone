import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider, db, getDeviceId } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Eye, EyeOff, Shield, ArrowRight, Mail, Lock } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const [forgotPasswordStep, setForgotPasswordStep] = useState(0); // 0: none, 1: email, 2: code, 3: reset
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send reset code');
      
      setForgotPasswordStep(2); // Move to code entry
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode.length !== 4) {
      setError('Please enter the 4-digit code sent to your email.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid code');

      setForgotPasswordStep(3); // Move to password reset
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');

      setResetSent(true);
      setForgotPasswordStep(0);
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Ensure user document exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const referralCode = (user.displayName || 'USER').substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          username: user.displayName || 'User',
          walletBalance: 0,
          totalKills: 0,
          totalWins: 0,
          winStreak: 0,
          isAdmin: false,
          referralCode: referralCode,
          createdAt: new Date(),
          deviceId: getDeviceId(),
        });
      } else {
        // Update deviceId on login
        await setDoc(userRef, { deviceId: getDeviceId() }, { merge: true });
      }
      
      navigate('/');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('The sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in your Firebase project. Please enable it in the Firebase Console.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`This domain (${window.location.hostname}) is not authorized. Please add it to your Firebase Authorized Domains.`);
      } else {
        setError(err.message || 'An error occurred during Google Sign-In.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Update deviceId on login
      await setDoc(doc(db, 'users', user.uid), { deviceId: getDeviceId() }, { merge: true });
      
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col font-sans relative overflow-hidden">
      {/* Background Image with Blur */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://picsum.photos/seed/gaming/1920/1080?blur=10" 
          alt="Background" 
          className="w-full h-full object-cover opacity-30"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-[380px] bg-[#151B28]/90 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="flex flex-col items-center justify-center">
              <Logo className="h-24 w-auto mb-2" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-1">
              {forgotPasswordStep === 2 ? 'Verify Code' : 
               forgotPasswordStep === 3 ? 'New Password' : 
               'Welcome Back'}
            </h1>
            <p className="text-gray-400 text-xs">
              {forgotPasswordStep === 2 ? `Enter the 4-digit code sent to ${email}` : 
               forgotPasswordStep === 3 ? 'Create a strong new password' : 
               'Sign in to your account'}
            </p>
          </div>

          {forgotPasswordStep === 0 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-500 text-[10px] font-medium text-center break-words">
                  {error}
                </div>
              )}
              {resetSent && (
                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-green-500 text-[10px] font-medium text-center break-words">
                  Password updated successfully! You can now sign in.
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-300 ml-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full bg-[#1F2937]/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-300 ml-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={passwordVisible ? 'text' : 'password'}
                    className="w-full bg-[#1F2937]/50 border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                  >
                    {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : forgotPasswordStep === 2 ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-500 text-[10px] font-medium text-center break-words">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-300 ml-1" htmlFor="resetCode">
                  Verification Code
                </label>
                <input
                  id="resetCode"
                  type="text"
                  maxLength={4}
                  className="w-full bg-[#1F2937]/50 border border-white/10 rounded-xl py-4 px-4 text-2xl font-bold text-center tracking-[1rem] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="0000"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
              
              <button 
                type="button"
                onClick={() => setForgotPasswordStep(0)}
                className="w-full text-gray-400 hover:text-white text-xs font-medium transition-colors"
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-500 text-[10px] font-medium text-center break-words">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-300 ml-1" htmlFor="newPassword">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className="w-full bg-[#1F2937]/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-300 ml-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="w-full bg-[#1F2937]/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          )}

          {forgotPasswordStep === 0 && (
            <>
              <div className="my-6 flex items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-gray-500 text-[10px] font-medium">Or continue with</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button 
                type="button" 
                onClick={handleGoogleSignIn} 
                disabled={isLoading}
                className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center text-xs disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.021 35.591 44 30.023 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
                Sign in with Google
              </button>

              <div className="mt-6 text-center space-y-3">
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="text-blue-500 hover:text-blue-400 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Forgot your password?
                </button>
                <p className="text-gray-400 text-xs">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">Sign up</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
