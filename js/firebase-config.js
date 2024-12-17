// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyBtzaibXTCspENsEVaN8XF5DkuizsjxVX4",
    authDomain: "crossover-people-finder.firebaseapp.com",
    databaseURL: "https://crossover-people-finder-default-rtdb.firebaseio.com",
    projectId: "crossover-people-finder",
    storageBucket: "crossover-people-finder.appspot.com",
    messagingSenderId: "35563852058",
    appId: "1:35563852058:web:a4b89c5f0fedd06432dca3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export Firebase instances and functions
export { db, collection, addDoc, getDocs };
