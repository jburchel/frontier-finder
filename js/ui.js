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
        this.searchButton = document.querySelector('button[type="submit"]');
        
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
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Populate initial data
            await this.populateCountries();
            
            console.log('UI initialization complete');
        } catch (error) {
            console.error('UI initialization failed:', error);
            this.showError('Failed to initialize application: ' + error.message);
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

        // Form submission
        this.form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSearch();
        });
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
            const country = this.countrySelect.value;
            const upgName = this.upgSelect.value;
            const radius = this.radiusInput.value;
            const unitsEl = document.querySelector('input[name="units"]:checked');
            const typeEl = document.querySelector('input[name="searchType"]:checked');

            // Debug logging
            console.log('Form values:', {
                country,
                upgName,
                radius,
                units: unitsEl?.value,
                type: typeEl?.value,
                unitsElement: unitsEl,
                typeElement: typeEl
            });

            // Validate inputs with more specific error messages
            if (!country) throw new Error('Please select a country');
            if (!upgName) throw new Error('Please select a UPG');
            if (!radius || radius < 1) throw new Error('Please enter a valid search radius');
            if (!unitsEl) throw new Error('Please select a distance unit (Miles or Kilometers)');
            if (!typeEl) throw new Error('Please select a search type (FPG, UUPG, or Both)');

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
                type: typeEl.value
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
        const table = document.createElement('table');
        table.className = 'results-table';
        
        // Add table header
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Select</th>
                    <th>Type</th>
                    <th>People Group</th>
                    <th>Population</th>
                    <th>Country</th>
                    <th>Religion</th>
                    <th>Language</th>
                    <th>Distance (${this.getDistanceUnit()})</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        // Add results to table
        const tbody = table.querySelector('tbody');
        searchResults.results.forEach((result, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" id="select-${index}" data-result-index="${index}">
                </td>
                <td>${result.type || 'Unknown'}</td>
                <td>${result.name || 'Unknown'}</td>
                <td>${result.population?.toLocaleString() || 'Unknown'}</td>
                <td>${result.country || 'Unknown'}</td>
                <td>${result.religion || 'Unknown'}</td>
                <td>${result.language || 'Unknown'}</td>
                <td>${result.distance !== undefined ? result.distance : 'Unknown'}</td>
            `;
            tbody.appendChild(row);
        });

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

        searchParams.innerHTML = `
            <p><strong>Base UPG:</strong> ${baseUPG.name}</p>
            <p><strong>Country:</strong> ${baseUPG.country}</p>
            <p><strong>Location:</strong> ${baseUPG.latitude.toFixed(2)}, ${baseUPG.longitude.toFixed(2)}</p>
        `;
    }
}

// Create and export UI instance
export const ui = new UI();
export default ui;
