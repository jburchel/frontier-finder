import { searchService } from './search.js';
import { firebaseService } from './firebase.js';
import { collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { formatGroupType, formatDistance } from './utils.js';
import { pronunciationService } from './services/pronunciationService.js';
import { i18nService } from './i18n.js';

class ResultsUI {
    constructor() {
        this.resultsContainer = document.getElementById('searchResults');
        this.currentResults = []; // Store results for sorting
        this.allResults = [];     // Store all results for filtering
        this.sortConfig = {
            column: 'population',
            direction: 'desc'
        };
        this.selectedResults = new Set(); // Track selected items
        this.initialize();
    }

    showLoading(message = 'Loading results...') {
        if (!this.resultsContainer) return;
        
        const translatedMessage = message === 'Loading results...' ? 
            i18nService.translate('loadingResults') :
            message === 'Searching for people groups...' ?
            i18nService.translate('searchingGroups') :
            i18nService.translate('loadingProcessing');
        
        this.resultsContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">${translatedMessage}</div>
            </div>
        `;
    }

    hideLoading() {
        if (!this.resultsContainer) return;
        // Clear only if it contains the loading indicator
        if (this.resultsContainer.querySelector('.loading-container')) {
            this.resultsContainer.innerHTML = '';
        }
    }

    async initialize() {
        try {
            const params = new URLSearchParams(window.location.search);
            
            // Show loading immediately
            this.showLoading(i18nService.translate('loadingProcessing'));
            
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

            // Update loading message
            this.showLoading(i18nService.translate('searchingGroups'));

            const results = await searchService.searchNearby(
                searchParams.upg,
                searchParams.radius,
                searchParams.units,
                searchParams.type
            );

            console.log('Search results:', results);

            // Hide loading before displaying results
            this.hideLoading();

            if (!results || results.length === 0) {
                this.resultsContainer.innerHTML = `
                    <div class="no-results">
                        <p>${i18nService.translate('noResults')}</p>
                        <button onclick="window.location.href='index.html'" class="button" data-i18n="newSearch">
                            ${i18nService.translate('newSearch')}
                        </button>
                    </div>
                `;
                return;
            }

            // Display search parameters first
            this.displaySearchParams(searchParams);
            
            // Then display results
            this.displayResults(results);
        } catch (error) {
            console.error('Results initialization failed:', error);
            this.hideLoading();
            this.resultsContainer.innerHTML = `
                <div class="error-message">
                    <p>${error.message}</p>
                    <button onclick="window.location.href='index.html'" class="button" data-i18n="newSearch">
                        ${i18nService.translate('newSearch')}
                    </button>
                </div>
            `;
        }
    }

    displaySearchParams(params) {
        try {
            const upg = params.upg;
            if (!upg) {
                console.warn('No UPG data available for search parameters display');
                return;
            }

            // Update the search parameters in the DL
            document.getElementById('baseUpg').textContent = upg.name || 'Unknown';
            document.getElementById('country').textContent = upg.country || 'Unknown';
            document.getElementById('location').textContent = `${upg.latitude?.toFixed(2) || 0}, ${upg.longitude?.toFixed(2) || 0}`;
            const units = params.units === 'M' ? i18nService.translate('unitsMiles') : i18nService.translate('unitsKm');
            document.getElementById('searchRadius').textContent = `${params.radius} ${units}`;
            document.getElementById('searchType').textContent = params.type.toUpperCase();
        } catch (error) {
            console.error('Error displaying search parameters:', error);
            console.warn('Failed to update search parameters display');
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
        console.log('Displaying results:', results);
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

        // Only clear the results table area, not the entire container
        const existingTable = this.resultsContainer.querySelector('table');
        if (existingTable) {
            existingTable.remove();
        }

        // Create and add the table
        const table = document.createElement('table');
        table.className = 'results-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th data-i18n="headerSelect">${i18nService.translate('headerSelect')}</th>
                    <th data-i18n="headerType">${i18nService.translate('headerType')}</th>
                    <th data-i18n="headerName">${i18nService.translate('headerName')}</th>
                    <th data-i18n="headerPronunciation">${i18nService.translate('headerPronunciation')}</th>
                    <th>Play</th>
                    <th data-i18n="headerPopulation">${i18nService.translate('headerPopulation')}</th>
                    <th data-i18n="headerCountry">${i18nService.translate('headerCountry')}</th>
                    <th data-i18n="headerReligion">${i18nService.translate('headerReligion')}</th>
                    <th data-i18n="headerDistance">${i18nService.translate('headerDistance')}</th>
                </tr>
            </thead>
            <tbody id="resultsTableBody">
                ${results.map((result, index) => `
                    <tr>
                        <td><input type="checkbox" id="select-${index}" data-result-index="${index}"></td>
                        <td>${formatGroupType(result.type)}</td>
                        <td>${result.name}</td>
                        <td class="pronunciation-text">[${result.pronunciation || 'pronunciation pending'}]</td>
                        <td class="play-button-cell">
                            <button class="play-button" 
                                    title="Play pronunciation"
                                    aria-label="Play pronunciation of ${result.name}"
                                    data-text="${result.name}"
                                    ${!result.pronunciation ? 'disabled' : ''}>
                            </button>
                        </td>
                        <td>${result.population.toLocaleString()}</td>
                        <td>${result.country}</td>
                        <td>${result.religion || i18nService.translate('unknown')}</td>
                        <td>${formatDistance(result.distance)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        this.resultsContainer.appendChild(table);

        // Setup sorting after table is added to DOM
        this.setupSorting(table);

        // Add event listeners for play buttons
        table.querySelectorAll('.play-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const text = button.getAttribute('data-text');
                await pronunciationService.speakPronunciation(text);
            });
        });

        // Add change handlers for checkboxes
        const checkboxes = table.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = e.target.getAttribute('data-result-index');
                this.handleSelectionChange(e.target, index);
            });
        });

        // Add click handler for the add to list button
        const addButton = document.getElementById('addToListButton');
        if (addButton) {
            addButton.addEventListener('click', () => this.addToTop100List());
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

    // Add this method to handle selection changes
    handleSelectionChange(checkbox, resultIndex) {
        if (checkbox.checked) {
            this.selectedResults.add(this.currentResults[resultIndex]);
        } else {
            this.selectedResults.delete(this.currentResults[resultIndex]);
        }
        // Update the add to list button state
        this.updateAddToListButton();
    }

    // Add this method to update button state
    updateAddToListButton() {
        const button = document.getElementById('addToListButton');
        if (button) {
            button.disabled = this.selectedResults.size === 0;
        }
    }

    // Temporarily simplify the add to list functionality
    async addToTop100List() {
        try {
            const button = document.getElementById('addToListButton');
            button.disabled = true;
            button.textContent = 'Adding to list...';

            // Get the selected items
            const selectedItems = Array.from(this.selectedResults);
            
            // Add each item to Firebase using the firebaseService
            const promises = selectedItems.map(item => {
                // Clean up the item data before saving
                const cleanItem = {
                    type: item.type,
                    name: item.name,
                    pronunciation: item.pronunciation,  // Include pronunciation
                    population: parseInt(item.population) || 0,
                    country: item.country,
                    religion: item.religion,
                    distance: item.distance,
                    addedAt: new Date().toISOString()
                };

                return firebaseService.addToTop100(cleanItem);
            });

            await Promise.all(promises);
            console.log(`Successfully added ${selectedItems.length} items to Top 100`);

            // Show success message
            alert('Selected items have been added to the Top 100 list');
            
            // Reset selections
            this.selectedResults.clear();
            this.updateAddToListButton();
            
            // Redirect to top100 page
            window.location.href = 'top100.html';

        } catch (error) {
            console.error('Failed to add items to Top 100:', error);
            alert('Failed to add items to the Top 100 list: ' + error.message);
        } finally {
            // Reset button
            const button = document.getElementById('addToListButton');
            button.disabled = false;
            button.textContent = 'Add to Top 100 List';
        }
    }

    // Add this method to the ResultsUI class
    updateTableHeaders() {
        const headers = document.querySelectorAll('th[data-i18n]');
        headers.forEach(header => {
            const key = header.getAttribute('data-i18n');
            header.textContent = i18nService.translate(key);
        });
    }
}

// Initialize results page
const resultsUI = new ResultsUI(); 

function createResultsTable(results) {
    const table = document.createElement('table');
    table.className = 'table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Define headers with translation keys
    const headers = [
        { key: 'headerSelect', defaultText: 'Select' },
        { key: 'headerName', defaultText: 'People Group' },
        { key: 'headerPronunciation', defaultText: 'Pronunciation' },
        { key: 'headerPopulation', defaultText: 'Population' },
        { key: 'headerCountry', defaultText: 'Country' },
        { key: 'headerType', defaultText: 'Type' }
    ];
    
    // Create header cells with translations
    headers.forEach(header => {
        const th = document.createElement('th');
        th.setAttribute('data-i18n', header.key);
        th.textContent = i18nService.translate(header.key) || header.defaultText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body...
    // ... rest of the function
} 

// Add this to window so i18n service can call it
window.updateResultsTable = () => {
    if (resultsUI) {
        resultsUI.updateTableHeaders();
    }
}; 