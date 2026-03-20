import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCadL0HXZ4Dgvzisnqy3WoYgfu3WRg6t6Q",
  authDomain: "zahidffweb.firebaseapp.com",
  databaseURL: "https://zahidffweb-default-rtdb.firebaseio.com",
  projectId: "zahidffweb",
  storageBucket: "zahidffweb.firebasestorage.app",
  messagingSenderId: "376801429633",
  appId: "1:376801429633:web:6bce7191f85c991e28e580"
};

export const isFirebaseConfigured = true;

// Initialize Firebase
const app = isFirebaseConfigured 
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) 
  : null;

// Initialize Firebase Authentication and get a reference to the service
export const auth = app ? getAuth(app) : {} as any;
export const googleProvider = app ? new GoogleAuthProvider() : {} as any;

if (app) {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
}
export const db = app ? getFirestore(app) : {} as any;
export const storage = app ? getStorage(app) : {} as any;

export const messaging = async () => {
  if (app && typeof window !== 'undefined' && await isSupported()) {
    const messagingInstance = getMessaging(app);
    return messagingInstance;
  }
  return null;
};

// VAPID Key for web push notifications
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BC4gwoU_67Pas8vPEz3AhS873XPRHmHo0vt9eJCFkUYVc8LRPJejoWica-rcr0feBPPkCzMMld4SVM8eW9qSyA0';

export const getDeviceId = () => {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};
