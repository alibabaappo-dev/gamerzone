importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// This will be replaced with actual config by the user or can be left as is if not using background notifications
// For full functionality, the user should put their firebaseConfig here.
firebase.initializeApp({
  apiKey: "AIzaSyCadL0HXZ4Dgvzisnqy3WoYgfu3WRg6t6Q",
  authDomain: "zahidffweb.firebaseapp.com",
  projectId: "zahidffweb",
  storageBucket: "zahidffweb.firebasestorage.app",
  messagingSenderId: "376801429633",
  appId: "1:376801429633:web:6bce7191f85c991e28e580"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    // Removed broken icon link to prevent "img" error
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
