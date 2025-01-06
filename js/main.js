import { config } from './config.js';
import { jpApi } from './api.js';
import { searchService } from './search.js';
import { ui } from './ui.js';
import { firebaseService } from './firebase.js';

// Debug loading of modules
console.group('Module Loading Check');
console.log('Config loaded:', config);
console.log('JP API loaded:', jpApi);
console.log('Search Service loaded:', searchService);
console.log('UI loaded:', ui);
console.log('Firebase loaded:', firebaseService);
console.groupEnd();

/**
 * Main application initialization and coordination
 */
class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('Initializing Frontier Finder...');

            console.group('Initialization Steps');
            // Validate configuration
            if (!config.joshuaProjectApiKey) {
                throw new Error('Joshua Project API key is missing');
            }
            console.log('✓ Config validated');

            // Initialize services in sequence
            await this.initializeServices();
            console.log('✓ Services initialized');

            this.initialized = true;
            console.log('Frontier Finder initialization complete');
            console.groupEnd();

        } catch (error) {
            console.error('Failed to initialize application:', error);
            console.groupEnd();
            this.showError('Application initialization failed: ' + error.message);
            throw error;
        }
    }

    /**
     * Initialize all services
     */
    async initializeServices() {
        // Test Joshua Project API connection
        try {
            const testResponse = await jpApi.makeRequest('/people_groups', { limit: 1 });
            console.log('Joshua Project API connection successful');
        } catch (error) {
            console.warn('Joshua Project API test failed:', error);
            this.showWarning('Unable to connect to Joshua Project API. Some features may be limited.');
        }

        // Initialize search service (loads CSV data)
        try {
            await searchService.initialize();
            console.log('Search service initialized');
        } catch (error) {
            console.error('Search service initialization failed:', error);
            throw new Error('Failed to load required data');
        }

        // Initialize UI components
        try {
            await ui.initialize();
            console.log('UI initialized');
        } catch (error) {
            console.error('UI initialization failed:', error);
            throw new Error('Failed to initialize user interface');
        }

        // Test Firebase connection
        try {
            await firebaseService.getTop100Count();
            console.log('Firebase connection successful');
        } catch (error) {
            console.warn('Firebase connection failed:', error);
            this.showWarning('Unable to connect to database. Top 100 list features may be unavailable.');
        }
    }

    /**
     * Show warning message to user
     */
    showWarning(message) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.innerHTML = `
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">${message}</span>
            <button class="close-button" onclick="this.parentElement.remove()">×</button>
        `;
        document.querySelector('.container')?.insertAdjacentElement('afterbegin', warningDiv);
    }

    /**
     * Show error message to user
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <span class="error-icon">❌</span>
            <span class="error-text">${message}</span>
            <button class="close-button" onclick="this.parentElement.remove()">×</button>
        `;
        document.querySelector('.container')?.insertAdjacentElement('afterbegin', errorDiv);
    }
}

// Create app instance
const app = new App();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.initialize().catch(error => {
        console.error('Application failed to start:', error);
    });
});

// Make app available for debugging in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.app = app;
}

export default app; 