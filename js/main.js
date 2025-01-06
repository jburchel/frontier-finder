import { config } from './config.js';
import { searchService } from './search.js';
import { ui } from './ui.js';

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
            
            // Initialize search service first
            await searchService.initialize();
            console.log('✓ Search service initialized');

            // Initialize UI
            await ui.initializeAsync();
            console.log('✓ UI initialized');

            this.initialized = true;
            console.log('Application initialization complete');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Application initialization failed: ' + error.message);
            throw error;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <span class="error-icon">⚠️</span>
            <span class="error-text">${message}</span>
            <button onclick="this.parentElement.remove()" class="error-close">×</button>
        `;
        document.querySelector('.container')?.insertAdjacentElement('afterbegin', errorDiv);
    }
}

// Create app instance
const app = new App();

// Start initialization when DOM is ready
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