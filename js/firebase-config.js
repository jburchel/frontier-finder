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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
