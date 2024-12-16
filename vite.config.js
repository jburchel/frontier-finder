import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// For production, we'll use the environment variables directly
// For development, we'll use the .env file
const envValues = {
  VITE_JOSHUA_PROJECT_API_KEY: process.env.JOSHUA_PROJECT_API_KEY || '',
  VITE_FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
  VITE_FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
  VITE_FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL || '',
  VITE_FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  VITE_FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
  VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  VITE_FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || ''
};

export default defineConfig({
  // Base public path - use /frontier-finder/ for GitHub Pages
  base: isProduction ? '/frontier-finder/' : '/',
  
  // Development server configuration
  server: {
    port: 3000,
    open: true
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: '/index.html',
        results: '/results.html',
        top100: '/top100.html'
      }
    }
  },

  // Define environment variables to expose to the client
  define: {
    'import.meta.env.VITE_JOSHUA_PROJECT_API_KEY': JSON.stringify(envValues.VITE_JOSHUA_PROJECT_API_KEY),
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(envValues.VITE_FIREBASE_API_KEY),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(envValues.VITE_FIREBASE_AUTH_DOMAIN),
    'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(envValues.VITE_FIREBASE_DATABASE_URL),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(envValues.VITE_FIREBASE_PROJECT_ID),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(envValues.VITE_FIREBASE_STORAGE_BUCKET),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(envValues.VITE_FIREBASE_MESSAGING_SENDER_ID),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(envValues.VITE_FIREBASE_APP_ID)
  }
});
