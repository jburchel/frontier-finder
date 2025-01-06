import { searchService } from './search.js';

class ResultsUI {
    constructor() {
        this.resultsContainer = document.getElementById('searchResults');
        this.searchParamsContainer = document.getElementById('searchParams');
        this.currentResults = []; // Store results for sorting
        this.allResults = [];     // Store all results for filtering
        this.sortConfig = {
            column: 'population',
            direction: 'desc'
        };
        this.initialize();
    }

    async initialize() {
        try {
            const params = new URLSearchParams(window.location.search);
            
            // Get and parse parameters
            const searchParams = {
                upg: JSON.parse(decodeURIComponent(params.get('upg'))),
                radius: params.get('radius'),
                units: params.get('units'),
                type: params.get('type')
            };

            console.log('Initializing results with params:', searchParams);
            
            // Validate required parameters
            if (!searchParams.upg || !searchParams.radius || !searchParams.units || !searchParams.type) {
                throw new Error('Missing required search parameters');
            }

            // Initialize search service if needed
            await searchService.initialize();

            const results = await searchService.searchNearby(
                searchParams.upg,
                searchParams.radius,
                searchParams.units,
                searchParams.type
            );

            // Display search parameters first
            this.displaySearchParams(searchParams);
            
            // Then display results
            this.displayResults(results);
        } catch (error) {
            console.error('Results initialization failed:', error);
            this.displayError(error.message);
        }
    }

    displaySearchParams(params) {
        if (!this.searchParamsContainer) return;

        try {
            const upg = params.upg;
            if (!upg) {
                console.warn('No UPG data available for search parameters display');
                return;
            }

            this.searchParamsContainer.innerHTML = `
                <h3>Search Parameters</h3>
                <p><strong>Base UPG:</strong> ${upg.name || 'Unknown'}</p>
                <p><strong>Country:</strong> ${upg.country || 'Unknown'}</p>
                <p><strong>Location:</strong> ${upg.latitude?.toFixed(2) || 0}, ${upg.longitude?.toFixed(2) || 0}</p>
                <p><strong>Search Radius:</strong> ${params.radius} ${params.units === 'M' ? 'miles' : 'kilometers'}</p>
                <p><strong>Search Type:</strong> ${params.type.toUpperCase()}</p>
            `;
        } catch (error) {
            console.error('Error displaying search parameters:', error);
            this.searchParamsContainer.innerHTML = '<p>Error displaying search parameters</p>';
        }
    }

    // Add sorting functionality
    setupSorting(table) {
        const headers = table.querySelectorAll('thead th');
        headers.forEach(header => {
            // Skip the 'Select' column
            if (header.textContent === 'Select') return;

            // Add sort indicator and pointer cursor
            header.style.cursor = 'pointer';
            header.classList.add('sortable');
            
            // Add click handler
            header.addEventListener('click', () => {
                // Remove sort indicators from all headers
                headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));

                // Get the column name from header text
                const column = header.textContent.toLowerCase();

                // Toggle sort direction if clicking the same column
                if (this.sortConfig.column === column) {
                    this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortConfig.column = column;
                    this.sortConfig.direction = 'desc'; // Default to descending for new column
                }

                // Add sort indicator to clicked header
                header.classList.add(`sort-${this.sortConfig.direction}`);

                // Sort and redisplay results
                this.sortResults();
                this.displayResults(this.currentResults);
            });
        });
    }

    sortResults() {
        const { column, direction } = this.sortConfig;
        
        this.currentResults.sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];

            // Handle special cases
            if (column === 'population') {
                valueA = parseInt(valueA) || 0;
                valueB = parseInt(valueB) || 0;
            } else if (column === 'distance') {
                valueA = parseFloat(valueA) || 0;
                valueB = parseFloat(valueB) || 0;
            } else {
                valueA = String(valueA).toLowerCase();
                valueB = String(valueB).toLowerCase();
            }

            if (valueA === valueB) return 0;
            
            const comparison = valueA > valueB ? 1 : -1;
            return direction === 'asc' ? comparison : -comparison;
        });
    }

    // Add this method to create the filter UI
    createFilterControls() {
        const filterDiv = document.createElement('div');
        filterDiv.className = 'filter-controls';
        filterDiv.innerHTML = `
            <label>Filter by type:</label>
            <select id="typeFilter">
                <option value="all">All Types</option>
                <option value="FPG">FPGs Only</option>
                <option value="UUPG">UUPGs Only</option>
            </select>
        `;

        // Add event listener for filter changes
        filterDiv.querySelector('#typeFilter').addEventListener('change', (e) => {
            const filterValue = e.target.value;
            this.filterResults(filterValue);
        });

        return filterDiv;
    }

    // Add this method to handle filtering
    filterResults(filterValue) {
        if (filterValue === 'all') {
            this.currentResults = [...this.allResults];
        } else {
            this.currentResults = this.allResults.filter(result => result.type === filterValue);
        }
        this.sortResults(); // Maintain current sort
        this.displayResults(this.currentResults, false); // Don't reset stored results
    }

    // Update displayResults to handle the filter UI
    displayResults(results, storeResults = true) {
        if (!this.resultsContainer) {
            console.error('Results container not found');
            return;
        }

        // Store results if this is initial display
        if (storeResults) {
            this.currentResults = results;
            this.allResults = [...results];
        }

        if (!results || results.length === 0) {
            this.resultsContainer.innerHTML = '<p class="no-results">No results found</p>';
            return;
        }

        // Clear existing content first
        this.resultsContainer.innerHTML = '';

        // Add filter controls if this is a 'both' type search
        const searchParams = new URLSearchParams(window.location.search);
        const searchType = searchParams.get('type');
        
        if (searchType === 'both') {
            const filterControls = this.createFilterControls();
            this.resultsContainer.appendChild(filterControls);
            
            // Add results summary
            const summary = document.createElement('div');
            summary.className = 'results-summary';
            const fpgCount = results.filter(r => r.type === 'FPG').length;
            const uupgCount = results.filter(r => r.type === 'UUPG').length;
            summary.innerHTML = `
                <p>Found ${results.length} total results:</p>
                <ul>
                    <li>${fpgCount} Frontier People Groups (FPGs)</li>
                    <li>${uupgCount} Unengaged Unreached People Groups (UUPGs)</li>
                </ul>
            `;
            this.resultsContainer.appendChild(summary);
        }

        // Create and add the table
        const table = document.createElement('table');
        table.className = 'results-table';
        
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
                    <th>Distance</th>
                </tr>
            </thead>
            <tbody>
                ${results.map((result, index) => `
                    <tr>
                        <td><input type="checkbox" id="select-${index}" data-result-index="${index}"></td>
                        <td>${result.type}</td>
                        <td>${result.name}</td>
                        <td>${result.population.toLocaleString()}</td>
                        <td>${result.country}</td>
                        <td>${result.religion}</td>
                        <td>${result.language}</td>
                        <td>${result.distance}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        this.resultsContainer.appendChild(table);

        // Setup sorting after table is added to DOM
        this.setupSorting(table);

        // Add debug info in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const debugInfo = document.createElement('div');
            debugInfo.className = 'debug-info';
            debugInfo.innerHTML = `
                <details>
                    <summary>Debug Information</summary>
                    <pre>${JSON.stringify(results, null, 2)}</pre>
                </details>
            `;
            this.resultsContainer.appendChild(debugInfo);
        }
    }

    displayError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="window.location.href='index.html'" class="button">Return to Search</button>
        `;
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(errorDiv);
    }
}

// Initialize results page
const resultsUI = new ResultsUI(); 