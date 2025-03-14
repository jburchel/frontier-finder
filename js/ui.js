import { searchService } from './search.js';
import app from './main.js';
import { i18nService } from './i18n.js';

/**
 * UI handling for Frontier Finder
 */
class UI {
    constructor() {
        // Form elements
        this.form = document.getElementById('searchForm');
        this.countrySelect = document.getElementById('countrySelect');
        this.upgSelect = document.getElementById('upgSelect');
        this.radiusInput = document.getElementById('radius');
        this.searchButton = document.getElementById('searchButton');
        
        // Results elements
        this.resultsSection = document.querySelector('.results-section');
        this.uupgList = document.getElementById('uupgList');
        this.fpgList = document.getElementById('fpgList');
    }

    /**
     * Initialize UI components and event listeners
     */
    async initializeAsync() {
        try {
            console.log('Initializing UI...');
            
            // Get available countries from search service
            const countries = await searchService.getAvailableCountries();
            console.log('Retrieved countries:', countries);
            
            if (!countries || countries.length === 0) {
                throw new Error('No countries available');
            }
            
            // Populate country dropdown
            app.populateCountryDropdown(countries);
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('UI initialization complete');
        } catch (error) {
            console.error('UI initialization failed:', error);
            throw error;
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

        // Search button click
        this.searchButton?.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.handleSearch();
        });

        // Form submission (if form exists)
        if (this.form) {
            this.form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSearch();
            });
        }
    }

    /**
     * Populate country dropdown from current UPGs
     */
    async populateCountries() {
        try {
            // Get unique countries from searchService
            const countries = await searchService.getCountries();
            
            if (!countries || countries.length === 0) {
                console.error('No UPG data available');
                return;
            }

            // Clear existing options
            this.countrySelect.innerHTML = '<option value="">Select a Country</option>';
            
            // Add new options
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                this.countrySelect.appendChild(option);
            });
            
            // Enable the dropdown
            this.countrySelect.disabled = false;
        } catch (error) {
            console.error('Failed to populate countries:', error);
            throw error;
        }
    }

    /**
     * Handle country selection change
     */
    handleCountryChange(country) {
        if (!this.upgSelect) return;

        // Clear current options
        this.upgSelect.innerHTML = '<option value="">Select a UPG</option>';
        this.upgSelect.disabled = !country;

        // Disable search button until a UPG is selected
        if (this.searchButton) {
            this.searchButton.disabled = true;
        }

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

            // Add change event listener to UPG dropdown
            this.upgSelect.addEventListener('change', () => {
                if (this.searchButton) {
                    this.searchButton.disabled = !this.upgSelect.value;
                }
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
            const country = this.countrySelect?.value;
            const upgName = this.upgSelect?.value;
            const radius = this.radiusInput?.value;
            const unitsEl = document.querySelector('input[name="units"]:checked');
            
            // Debug logging
            console.log('Form values:', {
                country,
                upgName,
                radius,
                units: unitsEl?.value,
                type: 'both' // Always search for both FPGs and UUPGs
            });

            // Validate inputs with more specific error messages
            if (!country) throw new Error('Please select a country');
            if (!upgName) throw new Error('Please select a UPG');
            if (!radius || radius < 1) throw new Error('Please enter a valid search radius');
            if (!unitsEl) throw new Error('Please select a distance unit (Miles or Kilometers)');

            // Find the selected UPG
            const selectedUPG = searchService.currentUPGs.find(
                upg => upg.country === country && upg.name === upgName
            );

            if (!selectedUPG) {
                throw new Error('Selected UPG not found');
            }

            // Encode parameters for URL
            const params = new URLSearchParams({
                upg: encodeURIComponent(JSON.stringify(selectedUPG)),
                radius: radius,
                units: unitsEl.value,
                type: 'both' // Always search for both FPGs and UUPGs
            });

            // Navigate to results page with parameters
            window.location.href = `results.html?${params.toString()}`;

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
    displayResults(searchResults) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) {
            console.error('Results container not found');
            return;
        }

        // Clear previous results
        resultsContainer.innerHTML = '';

        // Show results section
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        // Handle no results
        if (!searchResults?.results || searchResults.results.length === 0) {
            resultsContainer.innerHTML = '<p class="no-results">No results found</p>';
            return;
        }

        // Create results table
        const table = this.createResultsTable(searchResults);

        // Add table to container
        resultsContainer.appendChild(table);

        // Show sort options if there are results
        const sortOptions = document.getElementById('sortOptions');
        if (sortOptions) {
            sortOptions.style.display = 'block';
        }

        // Update search parameters display
        this.updateSearchParams(searchResults.baseUPG);
    }

    /**
     * Create results table
     */
    createResultsTable(searchResults) {
        const table = document.createElement('table');
        table.className = 'results-table';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Define headers with translation keys
        const headers = [
            { key: 'headerSelect', text: 'Select' },
            { key: 'headerType', text: 'Type' },
            { key: 'headerName', text: 'Name' },
            { key: 'headerPopulation', text: 'Population' },
            { key: 'headerCountry', text: 'Country' },
            { key: 'headerReligion', text: 'Religion' },
            { key: 'headerLanguage', text: 'Language' },
            { key: 'headerDistance', text: 'Distance' }
        ];
        
        // Create header cells with translations
        headers.forEach(header => {
            const th = document.createElement('th');
            th.setAttribute('data-i18n', header.key);
            th.textContent = i18nService.translate(header.key);
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Add results rows
        searchResults.results.forEach((result, index) => {
            const row = document.createElement('tr');
            
            // Create cells with translations where needed
            const cells = [
                `<td><input type="checkbox" id="select-${index}" data-result-index="${index}"></td>`,
                `<td>${result.type || i18nService.translate('unknown')}</td>`,
                `<td>${result.name || i18nService.translate('unknown')}</td>`,
                `<td>${result.population?.toLocaleString() || i18nService.translate('unknown')}</td>`,
                `<td>${this.translateCountry(result.country) || i18nService.translate('unknown')}</td>`,
                `<td>${result.religion || i18nService.translate('unknown')}</td>`,
                `<td>${result.language || i18nService.translate('unknown')}</td>`,
                `<td>${this.formatDistance(result.distance)}</td>`
            ];
            
            row.innerHTML = cells.join('');
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        return table;
    }

    /**
     * Helper method to translate country names
     */
    translateCountry(country) {
        if (!country) return '';
        return i18nService.translate(`countries.${country}`) || country;
    }

    /**
     * Helper method to format distance with translation
     */
    formatDistance(distance) {
        if (!distance) return i18nService.translate('unknown');
        const [value, unit] = distance.split(' ');
        const translatedUnit = i18nService.translate(`units${unit.charAt(0).toUpperCase() + unit.slice(1)}`);
        return `${value} ${translatedUnit}`;
    }

    /**
     * Helper function to get current distance unit
     */
    getDistanceUnit() {
        const unitRadio = document.querySelector('input[name="units"]:checked');
        if (!unitRadio) {
            console.warn('No distance unit selected, defaulting to Kilometers');
            return 'km';
        }
        return unitRadio.value === 'Miles' ? 'miles' : 'km';
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

    /**
     * Add method to update search parameters display
     */
    updateSearchParams(baseUPG) {
        const searchParams = document.getElementById('searchParams');
        if (!searchParams) return;

        const params = [
            {
                label: i18nService.translate('baseUPGLabel'),
                value: baseUPG.name
            },
            {
                label: i18nService.translate('country'),
                value: this.translateCountry(baseUPG.country)
            },
            {
                label: i18nService.translate('location'),
                value: `${baseUPG.latitude.toFixed(2)}, ${baseUPG.longitude.toFixed(2)}`
            }
        ];

        searchParams.innerHTML = params.map(param => 
            `<p><strong>${param.label}</strong> ${param.value}</p>`
        ).join('');
    }
}

// Create and export UI instance
export const ui = new UI();
export default ui;
