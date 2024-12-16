import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// For production, we'll use the environment variables directly
// For development, we'll use the .env file
const envValues = {
  VITE_JOSHUA_PROJECT_API_KEY: process.env.VITE_JOSHUA_PROJECT_API_KEY || '',
  VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || '',
  VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  VITE_FIREBASE_DATABASE_URL: process.env.VITE_FIREBASE_DATABASE_URL || '',
  VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || '',
  VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || ''
};

export default defineConfig({
  // Base public path - use /frontier-finder/ for GitHub Pages
  base: isProduction ? '/frontier-finder/' : '/',
  
  // Development server configuration
  server: {
    port: 3000,
    open: true
  },

  // Define environment variables to expose to the client
  define: {
    'process.env': envValues
  },

  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },

  // Copy data files to dist/data during build
  publicDir: 'public'
});
