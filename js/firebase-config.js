// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBrECDgxvQDqtcKXwRQJOmvJbEFCVxHJZA",
    authDomain: "frontier-finder-c7c0f.firebaseapp.com",
    projectId: "frontier-finder-c7c0f",
    storageBucket: "frontier-finder-c7c0f.appspot.com",
    messagingSenderId: "1012474326796",
    appId: "1:1012474326796:web:e2a3c9b8f9e0d9f7d5c3a8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export for use in other modules
export { db, auth };
