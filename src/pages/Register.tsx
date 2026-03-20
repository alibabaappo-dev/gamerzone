import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider, db, getDeviceId } from '../lib/firebase';
import { setDoc, doc, getDoc, query, where, getDocs, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Eye, EyeOff, Shield, ArrowRight, User, Mail, Lock } from 'lucide-react';
import Logo from '../components/Logo';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReferralEnabled, setIsReferralEnabled] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReferralSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'admin', 'referral_settings'));
        if (settingsDoc.exists()) {
          setIsReferralEnabled(settingsDoc.data().enabled !== false);
        }
      } catch (err) {
        console.error("Error fetching referral settings:", err);
      }
    };
    fetchReferralSettings();
  }, []);

  const handleGoogleSignUp = async () => {
    setError('');
    setIsLoading(true);
    try {
      const deviceId = getDeviceId();
      const appSettingsDoc = await getDoc(doc(db, 'settings', 'app'));
      const appSettings = appSettingsDoc.exists() ? appSettingsDoc.data() : {};

      if (appSettings.oneDeviceOneAccount) {
        const q = query(collection(db, 'users'), where('deviceId', '==', deviceId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError('You already have an account on this device.');
          setIsLoading(false);
          return;
        }
      }

      let referredBy = null;
      if (referralCodeInput) {
        const q = query(collection(db, 'users'), where('referralCode', '==', referralCodeInput));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setError('Invalid Referral Code');
          setReferralCodeInput('');
          setIsLoading(false);
          return;
        }
        referredBy = querySnapshot.docs[0].id;
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user already exists in Firestore
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
          referredBy: referredBy,
          createdAt: serverTimestamp(),
          deviceId: deviceId,
        });

        // Create referral request immediately if referred
        if (referredBy) {
          try {
            await addDoc(collection(db, 'referral_requests'), {
              referrerId: referredBy,
              refereeId: user.uid,
              refereeName: user.displayName || 'User',
              status: 'pending',
              type: 'registration',
              createdAt: serverTimestamp()
            });
          } catch (err) {
            console.error("Error creating referral request:", err);
          }
        }
      } else {
        // Update deviceId on login
        await setDoc(userRef, { deviceId: deviceId }, { merge: true });
      }
      navigate('/');
    } catch (err: any) {
      console.error('Google Sign-Up Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('The sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in your Firebase project. Please enable it in the Firebase Console.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`This domain (${window.location.hostname}) is not authorized. Please add it to your Firebase Authorized Domains.`);
      } else {
        setError(err.message || 'An error occurred during Google Sign-Up.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      if (phone.length !== 10) {
        setError('Phone number must be exactly 10 digits');
        setIsLoading(false);
        return;
      }

      const deviceId = getDeviceId();
      const appSettingsDoc = await getDoc(doc(db, 'settings', 'app'));
      const appSettings = appSettingsDoc.exists() ? appSettingsDoc.data() : {};

      if (appSettings.oneDeviceOneAccount) {
        const q = query(collection(db, 'users'), where('deviceId', '==', deviceId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError('You already have an account on this device.');
          setIsLoading(false);
          return;
        }
      }

      let referredBy = null;
      if (referralCodeInput) {
        const q = query(collection(db, 'users'), where('referralCode', '==', referralCodeInput));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setError('Invalid Referral Code');
          setReferralCodeInput('');
          setIsLoading(false);
          return;
        }
        referredBy = querySnapshot.docs[0].id;
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      const referralCode = (username || 'USER').substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        username: username,
        phoneNumber: `+92${phone}`,
        password: password, // Storing password as requested
        walletBalance: 0,
        totalKills: 0,
        totalWins: 0,
        winStreak: 0,
        referralCode: referralCode,
        referredBy: referredBy,
        createdAt: serverTimestamp(),
        deviceId: deviceId,
      });

      // Create referral request immediately if referred
      if (referredBy) {
        try {
          await addDoc(collection(db, 'referral_requests'), {
            referrerId: referredBy,
            refereeId: user.uid,
            refereeName: username,
            status: 'pending',
            type: 'registration',
            createdAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Error creating referral request:", err);
        }
      }
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
          src="https://wallpapercave.com/wp/wp7511674.jpg" 
          alt="Background" 
          className="w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#0D0D0D]/80 to-[#0D0D0D]"></div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-[380px] bg-[#151B28]/90 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="flex flex-col items-center justify-center">
              <Logo className="h-24 w-auto mb-2" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-1">Create Account</h1>
            <p className="text-gray-400 text-xs">Sign up to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-500 text-[10px] font-medium text-center break-words">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300 ml-1" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="w-full bg-[#1F2937]/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="johndoe"
              />
            </div>

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
              <label className="block text-xs font-medium text-gray-300 ml-1" htmlFor="phone">
                Phone Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-white/10 bg-[#1F2937]/50 text-gray-400 text-sm">
                  +92
                </span>
                <input
                  id="phone"
                  type="tel"
                  className="flex-1 bg-[#1F2937]/50 border border-white/10 rounded-r-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) {
                      setPhone(val);
                    }
                  }}
                  required
                  placeholder="3001234567"
                />
              </div>
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

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300 ml-1" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={confirmPasswordVisible ? 'text' : 'password'}
                  className="w-full bg-[#1F2937]/50 border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {confirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isReferralEnabled && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-300 ml-1" htmlFor="referralCode">
                  Referral Code (Optional)
                </label>
                <input
                  id="referralCode"
                  type="text"
                  className="w-full bg-[#1F2937]/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500 uppercase"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                  placeholder="OWS378"
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-gray-500 text-[10px] font-medium">Or continue with</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleSignUp} 
            disabled={isLoading}
            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center text-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.021 35.591 44 30.023 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Sign up with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-xs">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
