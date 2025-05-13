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
        
        // Loading indicator
        this.loadingIndicator = document.querySelector('.loading-indicator');
    }
    
    /**
     * Set loading state
     * @param {boolean} isLoading - Whether the UI is in a loading state
     */
    setLoading(isLoading) {
        console.log('SEARCH DEBUG: Setting loading state:', isLoading);
        
        // Create loading indicator if it doesn't exist
        if (!this.loadingIndicator) {
            this.loadingIndicator = document.createElement('div');
            this.loadingIndicator.className = 'loading-indicator';
            this.loadingIndicator.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Loading...</div>';
            document.body.appendChild(this.loadingIndicator);
        }
        
        // Show or hide loading indicator
        if (isLoading) {
            this.loadingIndicator.style.display = 'flex';
            if (this.searchButton) {
                this.searchButton.disabled = true;
            }
        } else {
            this.loadingIndicator.style.display = 'none';
            if (this.searchButton) {
                this.searchButton.disabled = false;
            }
        }
    }
    
    /**
     * Show an error message to the user
     * @param {string} message - Error message to display
     */
    showError(message) {
        console.log('SEARCH DEBUG: Showing error message:', message);
        
        // Create error container if it doesn't exist
        let errorContainer = document.querySelector('.error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'error-container';
            document.body.appendChild(errorContainer);
        }
        
        // Create error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">${message}</div>
            <button class="error-close">×</button>
        `;
        
        // Add close button functionality
        const closeButton = errorMessage.querySelector('.error-close');
        closeButton.addEventListener('click', () => {
            errorMessage.remove();
            if (errorContainer.children.length === 0) {
                errorContainer.style.display = 'none';
            }
        });
        
        // Add error message to container and show it
        errorContainer.appendChild(errorMessage);
        errorContainer.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorMessage && errorMessage.parentNode) {
                errorMessage.remove();
                if (errorContainer.children.length === 0) {
                    errorContainer.style.display = 'none';
                }
            }
        }, 5000);
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
            console.log('SEARCH DEBUG: Search button clicked');
            e.preventDefault();
            try {
                console.log('SEARCH DEBUG: Calling handleSearch method');
                await this.handleSearch();
            } catch (error) {
                console.error('SEARCH DEBUG: Error in search button click handler:', error);
            }
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
        console.log(`handleCountryChange called with country: ${country}`);
        
        if (!this.upgSelect) {
            console.error('UPG select element not found in handleCountryChange');
            return;
        }

        // Clear current options
        this.upgSelect.innerHTML = '<option value="">Select a UPG</option>';
        this.upgSelect.disabled = !country;

        // Disable search button until a UPG is selected
        if (this.searchButton) {
            this.searchButton.disabled = true;
        }

        if (country) {
            console.log(`Filtering UPGs for country: ${country}`);
            console.log(`searchService.currentUPGs available: ${!!searchService.currentUPGs}`);
            
            if (!searchService.currentUPGs) {
                console.error('searchService.currentUPGs is null or undefined');
                return;
            }
            
            // Filter UPGs for selected country
            const upgs = searchService.currentUPGs
                .filter(upg => upg.country === country)
                .sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`Found ${upgs.length} UPGs for country ${country}`);

            // Add options
            upgs.forEach(upg => {
                const option = document.createElement('option');
                option.value = upg.name;
                option.textContent = upg.name;
                this.upgSelect.appendChild(option);
                console.log(`Added UPG option: ${upg.name}`);
            });

            // Add change event listener to UPG dropdown
            this.upgSelect.addEventListener('change', () => {
                console.log('UPG dropdown changed');
                if (this.searchButton) {
                    this.searchButton.disabled = !this.upgSelect.value;
                }
            });
            
            console.log(`UPG dropdown now has ${this.upgSelect.options.length} options`);
        }
    }

    /**
     * Handle search form submission
     */
    async handleSearch() {
        console.log('SEARCH DEBUG: handleSearch method called');
        try {
            console.log('SEARCH DEBUG: Setting loading state');
            this.setLoading(true);

            // Get form values
            const country = this.countrySelect?.value;
            const upgName = this.upgSelect?.value;
            const radius = this.radiusInput?.value;
            const unitsEl = document.querySelector('input[name="units"]:checked');
            const searchTypeEls = document.querySelectorAll('input[name="searchType"]:checked');
            
            // Get all selected search types
            const searchTypes = [];
            searchTypeEls.forEach(el => searchTypes.push(el.value));
            
            // If nothing is selected, default to FPG
            if (searchTypes.length === 0) {
                searchTypes.push('fpg');
            }
            
            // Debug logging
            console.log('Form values:', {
                country,
                upgName,
                radius,
                units: unitsEl?.value,
                searchTypes: searchTypes
            });

            // Validate inputs with more specific error messages
            if (!country) throw new Error('Please select a country');
            if (!upgName) throw new Error('Please select a UPG');
            if (!radius || radius < 1) throw new Error('Please enter a valid search radius');
            if (!unitsEl) throw new Error('Please select a distance unit (Miles or Kilometers)');

            // Find the selected UPG
            console.log('Looking for UPG:', { country, upgName });
            
            // Try to parse the UPG value as JSON first (in case it's a JSON string)
            let selectedUPG;
            try {
                selectedUPG = JSON.parse(upgName);
                console.log('Found UPG from JSON:', selectedUPG);
            } catch (e) {
                // If it's not JSON, look for the UPG in the searchService
                console.log('Looking for UPG in searchService');
                selectedUPG = searchService.currentUPGs.find(
                    upg => upg.country === country && upg.name === upgName
                );
                
                if (!selectedUPG) {
                    console.log('UPG not found in searchService, creating a basic UPG object');
                    // If we still can't find it, create a basic UPG object from the map data
                    // This is needed when clicking on markers and then searching
                    selectedUPG = {
                        name: upgName,
                        country: country
                    };
                    
                    // Try to find coordinates from the map data
                    const mapData = window.upgData;
                    if (mapData && Array.isArray(mapData)) {
                        const mapUPG = mapData.find(u => u.name === upgName && u.country === country);
                        if (mapUPG && mapUPG.lat && mapUPG.lng) {
                            selectedUPG.latitude = mapUPG.lat;
                            selectedUPG.longitude = mapUPG.lng;
                        }
                    }
                }
            }
            
            if (!selectedUPG) {
                throw new Error('Selected UPG not found');
            }
            
            // Make sure we have coordinates
            if (!selectedUPG.latitude || !selectedUPG.longitude) {
                throw new Error('Selected UPG is missing coordinates');
            }

            // Encode parameters for URL
            const params = new URLSearchParams({
                upg: encodeURIComponent(JSON.stringify(selectedUPG)),
                radius: radius,
                units: unitsEl.value,
                types: encodeURIComponent(JSON.stringify(searchTypes)) // Pass all selected search types
            });

            // Navigate to results page with parameters
            window.location.href = `results.html?${params.toString()}`;

        } catch (error) {
            console.error('SEARCH DEBUG: Search failed:', error);
            // Add showError method if it doesn't exist
            if (typeof this.showError === 'function') {
                this.showError(error.message);
            } else {
                alert('Search error: ' + error.message);
            }
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
