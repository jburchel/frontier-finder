import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBtzaibXTCspENsEVaN8XF5DkuizsjxVX4",
    authDomain: "crossover-people-finder.firebaseapp.com",
    projectId: "crossover-people-finder",
    storageBucket: "crossover-people-finder.appspot.com",
    messagingSenderId: "35563852058",
    appId: "1:35563852058:web:a4b89c5f0fedd06432dca3"
};

let db;

try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.error('Error initializing Firebase:', error);
    // Provide a mock db object if Firebase fails to initialize
    db = {
        collection: () => ({
            add: async () => ({ id: 'mock-id' })
        })
    };
}

export { db }; 