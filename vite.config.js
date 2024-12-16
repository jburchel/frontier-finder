import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// For production, we'll use the environment variables directly
// For development, we'll use the .env file
const envValues = {
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
  FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || ''
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
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },

  // Define environment variables to expose to the client
  define: {
    // In production, these values will be replaced at build time
    'process.env.FIREBASE_API_KEY': JSON.stringify(envValues.FIREBASE_API_KEY),
    'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(envValues.FIREBASE_AUTH_DOMAIN),
    'process.env.FIREBASE_DATABASE_URL': JSON.stringify(envValues.FIREBASE_DATABASE_URL),
    'process.env.FIREBASE_PROJECT_ID': JSON.stringify(envValues.FIREBASE_PROJECT_ID),
    'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(envValues.FIREBASE_STORAGE_BUCKET),
    'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(envValues.FIREBASE_MESSAGING_SENDER_ID),
    'process.env.FIREBASE_APP_ID': JSON.stringify(envValues.FIREBASE_APP_ID)
  }
});
