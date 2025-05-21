import { translations } from './translations.js';

class I18nService {
    constructor() {
        this.currentLanguage = localStorage.getItem('selectedLanguage') || 'en';
        this.initialized = false;
        this.onLanguageChange = null; // Callback for language changes
    }

    async initialize() {
        try {
            // Get stored language or use browser default
            const storedLang = localStorage.getItem('selectedLanguage');
            const browserLang = navigator.language.split('-')[0];
            this.currentLanguage = storedLang || 
                (['en', 'es', 'pt'].includes(browserLang) ? browserLang : 'en');
            
            // Setup language selector
            const selector = document.getElementById('languageSelect');
            if (selector) {
                selector.value = this.currentLanguage;
                selector.addEventListener('change', (e) => this.setLanguage(e.target.value));
            }
            
            console.log('I18n Service initialized with language:', this.currentLanguage);
            this.initialized = true;
            
            // Initial translation of the page
            this.translatePage();
            
        } catch (error) {
            console.error('Failed to initialize i18n service:', error);
            throw error;
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    setLanguage(lang) {
        if (this.currentLanguage === lang) return;
        
        this.currentLanguage = lang;
        localStorage.setItem('selectedLanguage', lang);
        this.translatePage();
        
        // Notify listeners of language change
        if (this.onLanguageChange) {
            this.onLanguageChange(lang);
        }
    }

    translate(key) {
        if (!this.initialized) {
            console.warn('I18n Service not initialized');
            return key;
        }

        const translation = translations[this.currentLanguage]?.[key];
        if (!translation) {
            console.warn(`No translation found for key: ${key} in language: ${this.currentLanguage}`);
            return key;
        }

        return translation;
    }

    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            if (translation) {
                element.textContent = translation;
            } else {
                console.warn(`No translation found for key: ${key}`);
            }
        });
        
        // Force update of dynamic content
        if (window.updateResultsTable) {
            window.updateResultsTable();
        }
    }

    // Method to register language change callback
    onLanguageChanged(callback) {
        this.onLanguageChange = callback;
    }
}

export const i18nService = new I18nService(); 