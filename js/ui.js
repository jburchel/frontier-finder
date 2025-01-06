import { searchService } from './search.js';

/**
 * UI handling for Frontier Finder
 */
class UI {
    constructor() {
        // Form elements
        this.form = document.getElementById('searchForm');
        this.countrySelect = document.getElementById('country');
        this.upgSelect = document.getElementById('upg');
        this.radiusInput = document.getElementById('radius');
        this.searchButton = this.form?.querySelector('button[type="submit"]');
        
        // Results elements
        this.resultsSection = document.querySelector('.results-section');
        this.uupgList = document.getElementById('uupgList');
        this.fpgList = document.getElementById('fpgList');
        
        // Initialize UI
        this.initialize();
    }

    /**
     * Initialize UI components and event listeners
     */
    async initialize() {
        try {
            // Initialize search service
            await searchService.initialize();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Populate initial country dropdown
            this.populateCountries();
            
        } catch (error) {
            console.error('UI initialization failed:', error);
            this.showError('Failed to initialize application');
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Country selection changes
        this.countrySelect?.addEventListener('change', (e) => {
            this.handleCountryChange(e.target.value);
        });

        // Form submission
        this.form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSearch();
        });
    }

    /**
     * Populate country dropdown from current UPGs
     */
    populateCountries() {
        if (!this.countrySelect) return;

        // Get unique countries
        const countries = [...new Set(searchService.currentUPGs
            .map(upg => upg.country))]
            .sort();

        // Add options
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            this.countrySelect.appendChild(option);
        });
    }

    /**
     * Handle country selection change
     */
    handleCountryChange(country) {
        if (!this.upgSelect) return;

        // Clear current options
        this.upgSelect.innerHTML = '<option value="">Select a UPG</option>';
        this.upgSelect.disabled = !country;

        if (country) {
            // Filter UPGs for selected country
            const upgs = searchService.currentUPGs
                .filter(upg => upg.country === country)
                .sort((a, b) => a.name.localeCompare(b.name));

            // Add options
            upgs.forEach(upg => {
                const option = document.createElement('option');
                option.value = upg.name;
                option.textContent = upg.name;
                this.upgSelect.appendChild(option);
            });
        }
    }

    /**
     * Handle search form submission
     */
    async handleSearch() {
        try {
            this.setLoading(true);
            
            // Get form values
            const formData = new FormData(this.form);
            const searchParams = {
                country: formData.get('country'),
                upgName: formData.get('upg'),
                radius: formData.get('radius'),
                units: formData.get('units'),
                type: formData.get('type')
            };

            // Perform search
            const results = await searchService.searchNearby(searchParams);
            
            // Display results
            this.displayResults(results);
            
        } catch (error) {
            console.error('Search failed:', error);
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Display search results
     */
    displayResults(results) {
        if (!this.resultsSection) return;
        
        // Show results section
        this.resultsSection.style.display = 'block';
        
        // Clear previous results
        if (this.uupgList) this.uupgList.innerHTML = '';
        if (this.fpgList) this.fpgList.innerHTML = '';
        
        // Display results
        results.results.forEach(group => {
            const element = this.createResultCard(group);
            if (group.IsUUPG && this.uupgList) {
                this.uupgList.appendChild(element);
            } else if (this.fpgList) {
                this.fpgList.appendChild(element);
            }
        });
    }

    /**
     * Create a result card element
     */
    createResultCard(group) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
            <h3>${group.PeopNameInCountry}</h3>
            <p>Population: ${group.Population.toLocaleString()}</p>
            <p>Evangelical: ${group.PercentEvangelical}%</p>
            <p>Primary Religion: ${group.PrimaryReligion}</p>
            <p>Primary Language: ${group.PrimaryLanguageName}</p>
        `;
        return card;
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Remove any existing error
        const existing = document.querySelector('.error-message');
        if (existing) existing.remove();
        
        // Add new error before the form
        this.form?.parentNode.insertBefore(errorDiv, this.form);
    }

    /**
     * Set loading state
     */
    setLoading(isLoading) {
        if (this.searchButton) {
            this.searchButton.disabled = isLoading;
            this.searchButton.textContent = isLoading ? 'Searching...' : 'Search';
        }
    }
}

// Create and export UI instance
export const ui = new UI();
export default ui;
