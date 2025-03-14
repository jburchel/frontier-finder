import { config } from './config.js';
import { searchService } from './search.js';
import { ui } from './ui.js';
import { i18nService } from './i18n.js';
import { translations } from './translations.js';

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
            
            // Initialize i18n first
            await i18nService.initialize();
            console.log('✓ i18n service initialized');
            
            // Register language change handler
            i18nService.onLanguageChanged(async () => {
                const countries = await searchService.getAvailableCountries();
                this.populateCountryDropdown(countries);
            });
            
            // Initialize search service
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
        console.log('populateCountryDropdown called with:', countries);
        
        const dropdown = document.getElementById('country');
        if (!dropdown) {
            console.warn('Country dropdown element not found');
            return;
        }
        
        const currentLanguage = i18nService.getCurrentLanguage();
        console.log('i18n state:', {
            currentLanguage,
            hasTranslations: !!translations[currentLanguage],
            availableLanguages: Object.keys(translations)
        });
        
        // Fix the default option translation
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.setAttribute('data-i18n', 'selectCountryDefault');
        defaultOption.textContent = i18nService.translate('selectCountryDefault');
        
        // Clear and add default option
        dropdown.innerHTML = '';
        dropdown.appendChild(defaultOption);
        
        if (!countries || !Array.isArray(countries)) {
            console.warn('No countries provided to populate dropdown:', countries);
            return;
        }

        console.log(`Adding ${countries.length} countries to dropdown`);
        
        // Add country options with translations
        countries.forEach(country => {
            if (!country) {
                console.warn('Skipping empty country value');
                return;
            }
            
            const option = document.createElement('option');
            option.value = country;
            
            // Try to get translation, fall back to original country name
            const translatedCountry = translations[currentLanguage]?.countries?.[country];
            
            console.log(`Country: ${country}, Translation lookup:`, {
                currentLanguage,
                hasTranslations: !!translations[currentLanguage],
                hasCountries: !!translations[currentLanguage]?.countries,
                translatedValue: translatedCountry
            });
            
            option.textContent = translatedCountry || country;
            dropdown.appendChild(option);
        });
        
        console.log(`Country dropdown populated with ${dropdown.options.length - 1} countries`);
    }

    populateUPGDropdown(upgs) {
        const upgSelect = document.getElementById('upg');
        if (!upgSelect) return;
        
        // Fix the default option translation
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.setAttribute('data-i18n', 'selectUPGDefault');
        defaultOption.textContent = i18nService.translate('selectUPGDefault');
        
        // Clear and add default option
        upgSelect.innerHTML = '';
        upgSelect.appendChild(defaultOption);
        
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

// Export before event listener setup
export default app;

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.initialize();
    } catch (error) {
        console.error('Application failed to start:', error);
    }
});

// Make app available for debugging in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.app = app;
} 