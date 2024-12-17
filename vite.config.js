import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

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
        main: resolve(__dirname, 'index.html'),
        results: resolve(__dirname, 'results.html')
      }
    }
  },

  // Copy data files to dist/data during build
  publicDir: 'public',

  // Define global constants
  define: {
    'window.env': {
      VITE_JOSHUA_PROJECT_API_KEY: process.env.VITE_JOSHUA_PROJECT_API_KEY || ''
    }
  }
});
