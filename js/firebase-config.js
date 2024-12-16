// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBtzaibXTCspENsEVaN8XF5DkuizsjxVX4",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "crossover-people-finder.firebaseapp.com",
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://crossover-people-finder-default-rtdb.firebaseio.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "crossover-people-finder",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "crossover-people-finder.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "35563852058",
    appId: process.env.FIREBASE_APP_ID || "1:35563852058:web:a4b89c5f0fedd06432dca3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
