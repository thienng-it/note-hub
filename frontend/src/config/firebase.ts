import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyBAjhsrar8O8D5a0wlXyN4OqLRZr2kdaCU',
  authDomain: 'note-hub-80f76.firebaseapp.com',
  projectId: 'note-hub-80f76',
  storageBucket: 'note-hub-80f76.firebasestorage.app',
  messagingSenderId: '990819462432',
  appId: '1:990819462432:web:92e7864aca939a1a82fb45',
  measurementId: 'G-EDSV8Y84BY',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only if supported (not available in all environments)
let analytics = null;
isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  })
  .catch((error) => {
    console.warn('Firebase Analytics not supported:', error);
  });

export { app, analytics };
