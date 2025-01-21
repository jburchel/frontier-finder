import { config } from './config.js';
import { searchService } from './search.js';
import { ui } from './ui.js';
import { i18nService } from './i18n.js';

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

    populateCountryDropdown(countries) {
        const countrySelect = document.getElementById('country');
        if (!countrySelect) return;
        
        countrySelect.innerHTML = `<option value="" data-i18n="selectCountryDefault">${i18nService.translate('selectCountryDefault')}</option>`;
        
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
    }

    populateUPGDropdown(upgs) {
        const upgSelect = document.getElementById('upg');
        if (!upgSelect) return;
        
        upgSelect.innerHTML = `<option value="" data-i18n="selectUPGDefault">${i18nService.translate('selectUPGDefault')}</option>`;
        
        upgs.forEach(upg => {
            const option = document.createElement('option');
            option.value = JSON.stringify(upg);
            option.textContent = upg.name;
            upgSelect.appendChild(option);
        });
    }
}

// Create app instance
const app = new App();

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.initialize().catch(error => {
        console.error('Application failed to start:', error);
    });
    // Initialize i18n after app is initialized
    setTimeout(() => {
        i18nService.initialize();
    }, 100);
});

// Make app available for debugging in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.app = app;
}

export default app; 