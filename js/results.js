import { searchService } from './search.js';
import { firebaseService } from './firebase.js';
import { collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { formatDistance } from './utils.js';
import { pronunciationService } from './services/pronunciationService.js';
import { speechService } from './services/speechService.js';
import { i18nService } from './i18n.js';

class ResultsUI {
    constructor() {
        this.resultsContainer = document.getElementById('searchResults');
        this.currentResults = []; // Store results for sorting
        this.allResults = [];     // Store all results for filtering
        this.selectedResults = new Set(); // Track selected items
        this.resultsData = [];
        this.sortConfig = {
            column: 'population',
            direction: 'desc'
        };
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
            
            // Get search parameters
            const upgParam = params.get('upg');
            const radius = parseFloat(params.get('radius') || '100');
            const units = params.get('units') || 'M';
            const typesParam = params.get('types');
            
            if (!upgParam) {
                throw new Error(i18nService.translate('missingParameters'));
            }
            
            // Parse the UPG JSON
            let upg;
            try {
                upg = JSON.parse(decodeURIComponent(upgParam));
            } catch (e) {
                console.error('Failed to parse UPG JSON:', e);
                throw new Error(i18nService.translate('invalidUPGFormat'));
            }
            
            // Parse search types
            let searchTypes = ['fpg'];
            if (typesParam) {
                try {
                    searchTypes = JSON.parse(decodeURIComponent(typesParam));
                } catch (e) {
                    console.error('Failed to parse search types:', e);
                    // Use default if parsing fails
                    searchTypes = ['fpg'];
                }
            }
            
            if (!upg) {
                throw new Error(i18nService.translate('upgNotFound'));
            }
            
            // Search for nearby UPGs
            this.showLoading(i18nService.translate('searchingGroups'));
            
            const searchParams = {
                upg,
                radius,
                units,
                searchTypes
            };
            
            console.log('Searching with params:', searchParams);
            const results = await searchService.searchNearby(upg, radius, units, searchTypes);
            
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
    }

    toggleResultSelection(resultId, selected) {
        if (selected) {
            this.selectedResults.add(resultId);
        } else {
            this.selectedResults.delete(resultId);
        }
        
        // Update the Add to List button state
        const addToListButton = document.getElementById('addToListButton');
        if (addToListButton) {
            addToListButton.disabled = this.selectedResults.size === 0;
        }
        
        // Update the Add Selected button state
        const addSelectedButton = document.getElementById('addSelectedButton');
        if (addSelectedButton) {
            addSelectedButton.disabled = this.selectedResults.size === 0;
        }
    }

    async addSelectedToList() {
        if (this.selectedResults.size === 0) return;
        
        try {
            const selectedItems = this.currentResults.filter(result => 
                this.selectedResults.has(result.id || result.name)
            );
            
            if (selectedItems.length === 0) return;
            
            // Show loading state
            this.showLoading(i18nService.translate('savingToList'));
            
            // Initialize Firebase if needed
            await firebaseService.initialize();
            
            // Save to Firestore
            const db = firebaseService.db;
            const top100Collection = collection(db, 'top100');
            
            // Get existing items
            const existingSnapshot = await getDocs(top100Collection);
            const existingItems = existingSnapshot.docs.map(doc => doc.data().name);
            
            // Add each selected item if not already in the list
            for (const item of selectedItems) {
                if (!existingItems.includes(item.name)) {
                    await addDoc(top100Collection, {
                        name: item.name,
                        country: item.country,
                        population: item.population,
                        type: item.type || 'UPG',
                        added: new Date().toISOString()
                    });
                }
            }
            
            // Navigate to the Top 100 page
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

    async displayResults(results, storeResults = true) {
        if (!this.resultsContainer) return;
        
        this.hideLoading();
        
        if (storeResults) {
            this.currentResults = results;
            this.allResults = [...results];
        }
        
        if (!results || results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <div class="no-results-text">${i18nService.translate('noResultsFound')}</div>
                    <button onclick="window.location.href='index.html'" class="button">
                        ${i18nService.translate('newSearch')}
                    </button>
                </div>
            `;
            return;
        }
        
        // Create table structure
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        tableContainer.style.width = '100%'; // Make table wider
        
        // Create table
        const table = document.createElement('table');
        table.className = 'results-table';
        table.style.width = '100%'; // Make table wider
        tableContainer.style.maxWidth = '100%'; // Ensure container is full width too
        
        // Create table header with sorting functionality
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th style="width: 50px;">Select</th>
                <th class="sortable" data-sort="name" style="width: 20%;">People Group <span class="sort-icon"></span></th>
                <th class="sortable" data-sort="type" style="width: 15%;">Type <span class="sort-icon"></span></th>
                <th style="width: 40px;"></th> <!-- Header for play buttons -->
                <th class="sortable" data-sort="population" style="width: 15%;">Population <span class="sort-icon"></span></th>
                <th class="sortable" data-sort="country" style="width: 15%;">Country <span class="sort-icon"></span></th>
                <th class="sortable" data-sort="distance" style="width: 10%;">Distance <span class="sort-icon"></span></th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Add click event listeners to sortable headers
        thead.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                this.sortResultsBy(column);
                
                // Update sort icons
                thead.querySelectorAll('.sort-icon').forEach(icon => {
                    icon.textContent = '';
                });
                
                const sortIcon = header.querySelector('.sort-icon');
                if (this.sortConfig.column === column) {
                    sortIcon.textContent = this.sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
                }
            });
        });
        
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
                <td>
                    <button class="play-button" data-name="${result.name}">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </td>
                <td>${parseInt(result.population).toLocaleString()}</td>
                <td>${result.country}</td>
                <td>${formatDistance(result.distance, this.units)}</td>
            `;
            
            // Add event listener to checkbox
            setTimeout(() => {
                const checkbox = row.querySelector('.result-checkbox');
                if (checkbox) {
                    checkbox.addEventListener('change', (e) => {
                        this.toggleResultSelection(e.target.value, e.target.checked);
                    });
                }
                
                // Add event listener to play button
                const playButton = row.querySelector('.play-button');
                if (playButton) {
                    // Add a data attribute to track if we've already added an event listener
                    if (!playButton.dataset.hasListener) {
                        playButton.dataset.hasListener = 'true';
                        playButton.addEventListener('click', (e) => {
                            const name = e.currentTarget.dataset.name;
                            if (name) {
                                // Use the speechService directly for better pronunciation
                                speechService.speak(name, {
                                    rate: 0.8,
                                    pitch: 1,
                                    volume: 1
                                });
                            }
                        });
                    }
                }
            }, 0);
            
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // We'll no longer add the button here, as it will be in the actions container
        
        // Clear the container and add the table
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(tableContainer);
        
        // Find or create the actions container
        let actionsContainer = document.querySelector('.actions-container');
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'actions-container';
            this.resultsContainer.parentNode.appendChild(actionsContainer);
        } else {
            // Clear existing buttons
            actionsContainer.innerHTML = '';
        }
        
        // Add New Search button
        const newSearchButton = document.createElement('button');
        newSearchButton.className = 'button secondary';
        newSearchButton.innerHTML = 'New Search';
        newSearchButton.onclick = () => window.location.href = 'index.html';
        actionsContainer.appendChild(newSearchButton);
        
        // Add the 'Add to Top 100 List' button
        const addToListButton = document.createElement('button');
        addToListButton.id = 'addToListButton';
        addToListButton.className = 'button primary';
        addToListButton.disabled = this.selectedResults.size === 0;
        addToListButton.innerHTML = '<i class="fas fa-plus"></i> Add to Top 100 List';
        addToListButton.addEventListener('click', () => this.addSelectedToList());
        actionsContainer.appendChild(addToListButton);
        
        // Add View Top 100 List button
        const viewTop100Button = document.createElement('button');
        viewTop100Button.className = 'button secondary';
        viewTop100Button.innerHTML = 'View Top 100 List';
        viewTop100Button.onclick = () => window.location.href = 'top100.html';
        actionsContainer.appendChild(viewTop100Button);
        
        // Setup event listeners for the newly added elements
        this.setupEventListeners();
    }

    sortResultsBy(column) {
        console.log(`Sorting by ${column}`);
        
        // If same column, toggle direction
        if (this.sortConfig.column === column) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New column, set default direction
            this.sortConfig.column = column;
            // For distance, default to ascending (closest first)
            // For population, default to descending (largest first)
            this.sortConfig.direction = column === 'distance' ? 'asc' : 'desc';
        }
        
        // Update sort icons in the UI
        const headers = document.querySelectorAll('.sortable');
        headers.forEach(header => {
            const sortIcon = header.querySelector('.sort-icon');
            if (sortIcon) {
                if (header.dataset.sort === column) {
                    sortIcon.textContent = this.sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
                } else {
                    sortIcon.textContent = '';
                }
            }
        });
        
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
                valueA = (valueA || '').toLowerCase();
                valueB = (valueB || '').toLowerCase();
            } else if (column === 'population') {
                valueA = parseInt(valueA) || 0;
                valueB = parseInt(valueB) || 0;
            } else if (column === 'distance') {
                valueA = parseFloat(valueA) || 0;
                valueB = parseFloat(valueB) || 0;
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
