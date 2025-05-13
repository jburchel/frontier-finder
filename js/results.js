import { searchService } from './search.js';
import { firebaseService } from './firebase.js';
import { collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { formatDistance } from './utils.js';
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
                types: params.get('types') ? JSON.parse(decodeURIComponent(params.get('types'))) : ['fpg'] // Get search types with default to FPG
            };

            console.log('Initializing results with params:', searchParams);
            
            // Validate required parameters
            if (!searchParams.upg || !searchParams.radius || !searchParams.units) {
                throw new Error('Missing required search parameters');
            }

            // Initialize search service if needed
            await searchService.initialize();

            // Update loading message
            this.showLoading(i18nService.translate('searchingGroups'));

            // Perform search with multiple types
            const results = await searchService.searchNearby(
                searchParams.upg,
                searchParams.radius,
                searchParams.units,
                searchParams.types
            );

            console.log('RESULTS DEBUG: Search results received:', results);

            // Hide loading before displaying results
            this.hideLoading();

            if (!results || results.length === 0) {
                console.log('RESULTS DEBUG: No results found, displaying no results message');
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

            console.log('RESULTS DEBUG: Displaying search parameters and results');
            
            // Display search parameters first
            this.displaySearchParams(searchParams);
            
            // Display results
            await this.displayResults(results);
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing results:', error);
            this.displayError(error.message);
        }
    }

    displaySearchParams(params) {
        document.getElementById('baseUpg').textContent = params.upg.name;
        document.getElementById('country').textContent = params.upg.country;
        document.getElementById('searchRadius').textContent = `${params.radius} ${params.units === 'M' ? 'Miles' : 'Kilometers'}`;
    }

    setupEventListeners() {
        const addToListButton = document.getElementById('addToListButton');
        if (addToListButton) {
            addToListButton.addEventListener('click', () => this.addSelectedToList());
        }

        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }

        // Add sort listeners to table headers
        const headers = document.querySelectorAll('.results-table th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => this.sortResultsBy(header.dataset.sort));
        });
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.result-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            this.toggleResultSelection(checkbox.value, checked);
        });
    }

    toggleResultSelection(resultId, selected) {
        if (selected) {
            this.selectedResults.add(resultId);
        } else {
            this.selectedResults.delete(resultId);
        }

        // Update the add to list button state
        this.updateAddToListButton();
    }

    updateAddToListButton() {
        const addToListButton = document.getElementById('addToListButton');
        if (addToListButton) {
            addToListButton.disabled = this.selectedResults.size === 0;
        }
    }

    async addSelectedToList() {
        if (this.selectedResults.size === 0) return;

        try {
            // Show loading
            this.showLoading(i18nService.translate('addingToList'));

            // Get the selected results
            const selectedItems = this.currentResults.filter(result => 
                this.selectedResults.has(result.id || result.name)
            );

            console.log('Adding to list:', selectedItems);

            // Add to Firebase
            const db = firebaseService.getFirestore();
            const top100Collection = collection(db, 'top100');

            // Add each selected item
            for (const item of selectedItems) {
                await addDoc(top100Collection, {
                    ...item,
                    addedAt: new Date().toISOString()
                });
            }

            // Redirect to top 100 page
            window.location.href = 'top100.html';

        } catch (error) {
            console.error('Error adding to list:', error);
            this.displayError(error.message);
        }
    }

    displayError(message) {
        if (!this.resultsContainer) return;

        this.hideLoading();
        
        this.resultsContainer.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
                <button onclick="window.location.href='index.html'" class="button" data-i18n="tryAgain">
                    ${i18nService.translate('tryAgain')}
                </button>
            </div>
        `;
    }

    createFilterControls() {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-container';
        
        filterContainer.innerHTML = `
            <div class="filter-input-container">
                <input type="text" id="filterInput" placeholder="${i18nService.translate('filterPlaceholder')}" class="filter-input" />
                <button id="clearFilterButton" class="clear-filter-button">×</button>
            </div>
        `;
        
        // Add event listeners after the DOM is updated
        setTimeout(() => {
            const filterInput = document.getElementById('filterInput');
            const clearFilterButton = document.getElementById('clearFilterButton');
            
            if (filterInput) {
                filterInput.addEventListener('input', (e) => this.filterResults(e.target.value));
            }
            
            if (clearFilterButton) {
                clearFilterButton.addEventListener('click', () => {
                    if (filterInput) {
                        filterInput.value = '';
                        this.filterResults('');
                    }
                });
            }
        }, 0);
        
        return filterContainer;
    }

    filterResults(filterValue) {
        if (!filterValue) {
            this.displayResults(this.allResults, false);
            return;
        }
        
        const filtered = this.allResults.filter(result => 
            result.name.toLowerCase().includes(filterValue.toLowerCase()) ||
            result.country.toLowerCase().includes(filterValue.toLowerCase()) ||
            result.language.toLowerCase().includes(filterValue.toLowerCase()) ||
            result.religion.toLowerCase().includes(filterValue.toLowerCase())
        );
        
        this.displayResults(filtered, false);
    }

    async displayResults(results, storeResults = true) {
        console.log('RESULTS DEBUG: displayResults called with', results.length, 'results');
        
        // Get the units parameter from the URL
        const params = new URLSearchParams(window.location.search);
        const units = params.get('units') || 'M';
        this.units = units; // Store units for later use
        
        if (storeResults) {
            this.allResults = [...results];
            this.currentResults = [...results];
        }
        
        if (!this.resultsContainer) return;
        
        // Create table structure
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        
        // Add filter controls
        const filterControls = this.createFilterControls();
        tableContainer.appendChild(filterControls);
        
        // Create table
        const table = document.createElement('table');
        table.className = 'results-table';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Select</th>
                <th>People Group</th>
                <th>Type</th>
                <th>Pronunciation</th>
                <th></th> <!-- Empty header for play buttons -->
                <th>Population</th>
                <th>Country</th>
                <th>Distance</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Add pronunciation to results if not already present
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (!result.pronunciation) {
                try {
                    result.pronunciation = await pronunciationService.generatePronunciation(result.name);
                } catch (error) {
                    console.warn(`Failed to generate pronunciation for ${result.name}:`, error);
                    result.pronunciation = '';
                }
            }
            
            const row = document.createElement('tr');
            
            // Determine the type label and apply styling
            let typeLabel = result.type || 'UPG';
            let typeClass = '';
            
            if (typeLabel === 'FPG') {
                typeClass = 'fpg-type';
            } else if (typeLabel === 'UUPG') {
                typeClass = 'uupg-type';
            } else if (typeLabel === 'Zero Scale') {
                typeClass = 'zero-scale-type';
            }
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="result-checkbox" value="${result.id || result.name}" 
                           ${this.selectedResults.has(result.id || result.name) ? 'checked' : ''} />
                </td>
                <td>${result.name}</td>
                <td><span class="type-badge ${typeClass}">${typeLabel}</span></td>
                <td>${result.pronunciation || ''}</td>
                <td>
                    ${result.pronunciation ? `
                        <button class="play-button" data-pronunciation="${result.pronunciation}">
                            <i class="fas fa-volume-up"></i> Play
                        </button>
                    ` : ''}
                </td>
                <td>${result.population.toLocaleString()}</td>
                <td>${result.country}</td>
                <td>${formatDistance(result.distance, this.units)}</td>
            `;
            
            // Add event listener for the checkbox
            const checkbox = row.querySelector('.result-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.toggleResultSelection(e.target.value, e.target.checked);
                });
            }
            
            // Add event listener for the play button
            const playButton = row.querySelector('.play-button');
            if (playButton) {
                playButton.addEventListener('click', () => {
                    pronunciationService.speak(playButton.dataset.pronunciation);
                });
            }
            
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // Add the "Add to Top 100" button
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        buttonContainer.innerHTML = `
            <button id="addToListButton" class="button" disabled data-i18n="addToList">
                ${i18nService.translate('addToList')}
            </button>
        `;
        
        // Clear the container and add the new elements
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(tableContainer);
        this.resultsContainer.appendChild(buttonContainer);
        
        // Setup event listeners for the newly added elements
        this.setupEventListeners();
    }

    sortResultsBy(column) {
        // If same column, toggle direction
        if (this.sortConfig.column === column) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New column, set default direction
            this.sortConfig.column = column;
            this.sortConfig.direction = column === 'distance' ? 'asc' : 'desc';
        }
        
        this.sortResults();
    }

    sortResults() {
        const { column, direction } = this.sortConfig;
        
        // Sort the results
        this.currentResults.sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];
            
            // Handle special cases
            if (column === 'name' || column === 'country') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }
            
            // Compare
            if (valueA < valueB) {
                return direction === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        // Re-display the sorted results
        this.displayResults(this.currentResults, false);
    }
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ResultsUI();
});
