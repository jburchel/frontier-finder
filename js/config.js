import dotenv from 'dotenv';
dotenv.config();

/**
 * Configuration for Frontier Finder application
 */
export const config = {
    firebase: {
        apiKey: "AIzaSyBtzaibXTCspENsEVaN8XF5DkuizsjxVX4",
        authDomain: "crossover-people-finder.firebaseapp.com",
        projectId: "crossover-people-finder",
        storageBucket: "crossover-people-finder.firebasestorage.app",
        messagingSenderId: "35563852058",
        appId: "1:35563852058:web:a4b89c5f0fedd06432dca3"
    },
    // Joshua Project API configuration
    joshuaProject: {
        apiKey: process.env.JOSHUA_PROJECT_API_KEY,
        apiUrl: 'https://api.joshuaproject.net'
    },
    
    // Data file paths
    dataFiles: {
        currentUPGs: 'data/current_upgs.csv',
        uupgs: 'data/uupgs.csv'
    }
};

export default config;
