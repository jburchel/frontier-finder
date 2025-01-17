import { translations } from './translations.js';

class I18nService {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = translations;
    }

    initialize() {
        // Only setup language selector if it exists (main page)
        const selector = document.getElementById('languageSelect');
        if (selector) {
            selector.value = this.currentLanguage;
            selector.addEventListener('change', (e) => {
                this.updateLanguage(e.target.value);
            });
        }
        // Always update content based on stored language
        this.updateContent();
    }

    updateLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        this.updateContent();
    }

    updateContent() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.translate(key);
            if (text.includes('{count}')) {
                // Handle dynamic content
                const count = element.getAttribute('data-count') || '0';
                element.textContent = text.replace('{count}', count);
            } else {
                element.textContent = text;
            }
        });
    }

    translate(key) {
        return this.translations[this.currentLanguage][key] || key;
    }
}

export const i18nService = new I18nService(); 