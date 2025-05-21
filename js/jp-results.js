/**
 * Joshua Project Results Handler
 * Processes and displays search results from the Joshua Project API
 */

import { firebaseService } from './firebase.js';
import { collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { pronunciationService } from './services/pronunciationService.js';
import { speechService } from './services/speechService.js';
import { i18nService } from './i18n.js';

class JPResultsUI {
    constructor() {
        this.resultsContainer = document.getElementById('searchResults');
        this.currentResults = []; // Store results for sorting
        this.allResults = [];     // Store all results for filtering
        this.selectedResults = new Set(); // Track selected items
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
            message === 'Processing Joshua Project data...' ?
            i18nService.translate('processingJPData') :
            message === 'Saving to list...' ?
            i18nService.translate('savingToList') :
            i18nService.translate('loadingProcessing');
        
        // If we're saving to the list, add a redirect button
        if (message === 'Saving to list...') {
            this.resultsContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${translatedMessage}</div>
                    <div class="redirect-button-container" style="margin-top: 20px;">
                        <button id="manualRedirectButton" class="button primary" style="display: none;">
                            Go to Top 100 List
                        </button>
                    </div>
                </div>
            `;
            
            // Show the button after a short delay
            setTimeout(() => {
                const redirectButton = document.getElementById('manualRedirectButton');
                if (redirectButton) {
                    redirectButton.style.display = 'block';
                    redirectButton.addEventListener('click', () => {
                        window.location.href = 'top100.html';
                    });
                }
            }, 2000); // Show after 2 seconds if automatic redirect doesn't work
        } else {
            this.resultsContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${translatedMessage}</div>
                </div>
            `;
        }
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
            // Show loading immediately
            this.showLoading('Processing Joshua Project data...');
            
            // Get search results from session storage
            const resultsJson = sessionStorage.getItem('jpSearchResults');
            if (!resultsJson) {
                throw new Error('No search results found. Please try your search again.');
            }
            
            const results = JSON.parse(resultsJson);
            
            // Hide the search parameters section since JP search doesn't use UPG/radius
            const searchParamsSection = document.querySelector('.search-parameters');
            if (searchParamsSection) {
                searchParamsSection.style.display = 'none';
            }
            
            // Display results
            await this.displayResults(results);
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing JP results:', error);
            this.displayError(error.message);
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Add to List button at the bottom of the page
        const addToListButtonBottom = document.getElementById('addToListButtonBottom');
        if (addToListButtonBottom) {
            console.log('Adding click listener to Add to List button');
            addToListButtonBottom.addEventListener('click', () => {
                console.log('Add to List button clicked');
                this.addSelectedToList();
            });
        } else {
            console.warn('Add to List button not found in the DOM');
        }
        
        // Also set up checkbox listeners again to be sure
        this.setupCheckboxListeners();
    }
    
    setupCheckboxListeners() {
        console.log('Setting up checkbox listeners');
        const checkboxes = document.querySelectorAll('.result-checkbox');
        console.log(`Found ${checkboxes.length} checkboxes`);
        
        checkboxes.forEach((checkbox, index) => {
            const id = Number(checkbox.value);
            console.log(`Setting up listener for checkbox ${index + 1}, ID: ${id} (${typeof id})`);
            
            checkbox.addEventListener('change', (e) => {
                const targetId = Number(e.target.value);
                console.log(`Checkbox ${index + 1} changed, checked: ${e.target.checked}, ID: ${targetId} (${typeof targetId})`);
                this.toggleResultSelection(targetId, e.target.checked);
            });
        });
    }

    toggleResultSelection(resultId, selected) {
        // Convert the ID to a number for consistent comparison
        const id = Number(resultId);
        console.log(`Toggling selection for ID: ${id} (original: ${resultId}), selected: ${selected}`);
        
        if (selected) {
            this.selectedResults.add(id);
        } else {
            this.selectedResults.delete(id);
        }
        
        console.log('Current selected IDs:', Array.from(this.selectedResults));
        
        // Update the Add to List button state
        const addToListButtonBottom = document.getElementById('addToListButtonBottom');
        if (addToListButtonBottom) {
            addToListButtonBottom.disabled = this.selectedResults.size === 0;
        }
    }

    async addSelectedToList() {
        console.log('=== START addSelectedToList ===');
        console.log('Selected results size:', this.selectedResults.size);
        console.log('Current results length:', this.currentResults.length);
        
        if (this.selectedResults.size === 0) {
            console.log('No items selected, returning early');
            return;
        }
        
        try {
            // Show loading state
            this.showLoading('Saving to list...');
            
            // Log all selected IDs with types
            const selectedIdsArray = Array.from(this.selectedResults);
            console.log('=== SELECTED ITEMS ===');
            selectedIdsArray.forEach((id, index) => {
                console.log(`[${index}] ID: ${id}, Type: ${typeof id}, Value: ${id}`);
            });
            
            // Log all current results with their IDs
            console.log('=== CURRENT RESULTS ===');
            this.currentResults.forEach((result, index) => {
                const id = result.ID || result.PeopleID3;
                console.log(`[${index}] ID: ${id}, Type: ${typeof id}, Name: ${result.PeopNameInCountry || result.PeopName}`);
            });
            
            // Find selected items by matching with PeopleID3 or ID
            const selectedItems = [];
            
            for (const [index, result] of this.currentResults.entries()) {
                const id = result.ID || result.PeopleID3;
                const name = result.PeopNameInCountry || result.PeopName;
                
                console.log(`\n=== CHECKING ITEM ${index} ===`);
                console.log(`Result ID: ${id} (${typeof id})`);
                console.log(`Result Name: ${name}`);
                
                // Check if this result's ID is in our selected set
                const isSelected = this.selectedResults.has(Number(id));
                
                console.log('Is selected?', isSelected);
                console.log('Selected IDs being checked:', Array.from(this.selectedResults));
                
                if (isSelected) {
                    console.log(`✓ ADDING TO SELECTED: ${name} (ID: ${id})`);
                    selectedItems.push(result);
                }
            }
            
            console.log('Filtered selected items count:', selectedItems.length);
            console.log('Selected items details:', selectedItems.map(item => ({
                id: item.PeopleID3 || item.ID,
                name: item.PeopNameInCountry || item.PeopName
            })));
            
            if (selectedItems.length === 0) {
                // Try one more time with type conversion
                const selectedAsNumbers = new Set(Array.from(this.selectedResults).map(id => Number(id)));
                selectedItems.push(...this.currentResults.filter(result => {
                    const resultId = result.ID || result.PeopleID3;
                    return selectedAsNumbers.has(Number(resultId));
                }));
                
                if (selectedItems.length === 0) {
                    const errorDetails = {
                        selectedIds: Array.from(this.selectedResults),
                        availableIds: this.currentResults.map(r => r.PeopleID3 || r.ID),
                        idTypes: {
                            selected: Array.from(this.selectedResults).map(id => typeof id),
                            available: this.currentResults.map(r => typeof (r.PeopleID3 || r.ID))
                        },
                        selectedAsNumbers: Array.from(selectedAsNumbers)
                    };
                    console.error('No matching items found after type conversion. Debug info:', errorDetails);
                    throw new Error('No matching items found. Check console for details.');
                }
            }
            
            // Initialize Firebase
            await firebaseService.initialize();
            const db = firebaseService.db;
            
            if (!db) {
                throw new Error('Firestore database not available');
            }
            
            // Get collection reference
            const top100Collection = collection(db, 'top100');
            
            // Get existing items to avoid duplicates
            const existingSnapshot = await getDocs(top100Collection);
            const existingItems = existingSnapshot.docs.map(doc => doc.data().name);
            
            // Add each selected item if not already in the list
            for (const item of selectedItems) {
                const name = item.PeopNameInCountry || item.PeopName;
                
                if (!existingItems.includes(name)) {
                    await addDoc(top100Collection, {
                        name: name,
                        country: item.Ctry,
                        population: parseInt(item.Population) || 0,
                        type: this.determineType(item),
                        added: new Date().toISOString()
                    });
                    console.log(`Added item to Firestore: ${name}`);
                }
            }
            
            // Store a flag to show success message on the Top 100 page
            sessionStorage.setItem('justAddedToTop100', 'true');
            
            // Navigate to the Top 100 page
            window.location.href = 'top100.html';
            
        } catch (error) {
            console.error('Error in addSelectedToList:', error);
            this.hideLoading();
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.padding = '15px';
            errorDiv.style.margin = '15px 0';
            errorDiv.style.backgroundColor = '#f8d7da';
            errorDiv.style.color = '#721c24';
            errorDiv.style.borderRadius = '4px';
            
            errorDiv.innerHTML = `
                <div>Error: ${error.message || 'Failed to add items to your list'}</div>
                <div style="margin-top: 10px;">
                    <button onclick="window.location.reload()" class="button primary">
                        Try Again
                    </button>
                </div>
            `;
            
            this.resultsContainer.innerHTML = '';
            this.resultsContainer.appendChild(errorDiv);
        }
    }
    
    determineType(item) {
        // Determine if the people group is an FPG, UUPG, or regular UPG
        // Based on Joshua Project criteria
        const believers = parseFloat(item.PercentEvangelical || 0);
        const engaged = item.ROG3 && item.ROG3 !== '0';
        
        if (believers <= 0.1) {
            return 'FPG';
        } else if (!engaged && believers < 2) {
            return 'UUPG';
        } else {
            return 'UPG';
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
        tableContainer.style.width = '100%';
        
        // Add a controls div but without the 'Add to List' button
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'table-controls';
        // No button here - we'll use the one at the bottom of the page
        tableContainer.appendChild(controlsDiv);
        
        // Create table
        const table = document.createElement('table');
        table.className = 'results-table';
        table.style.width = '100%';
        tableContainer.style.maxWidth = '100%';
        
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
                <th class="sortable" data-sort="jpscale" style="width: 10%;">JP Scale <span class="sort-icon"></span></th>
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
        
        // Process each result
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const row = document.createElement('tr');
            
            // Determine the type label and apply styling
            const type = this.determineType(result);
            let typeClass = '';
            
            if (type === 'FPG') {
                typeClass = 'fpg-type';
            } else if (type === 'UUPG') {
                typeClass = 'uupg-type';
            } else {
                typeClass = 'upg-type';
            }
            
            const name = result.PeopNameInCountry || result.PeopName;
            const country = result.Ctry;
            const population = parseInt(result.Population || 0);
            const jpScale = result.JPScale || 'Unknown';
            // Ensure we have a consistent ID format (always use number for comparison)
            const resultId = Number(result.ID || result.PeopleID3);
            
            // Store the ID in both value and data attribute
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="result-checkbox" value="${resultId}" data-id="${resultId}" />
                </td>
                <td>${name}</td>
                <td><span class="type-badge ${typeClass}">${type}</span></td>
                <td>
                    <button class="play-button" data-name="${name}">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </td>
                <td>${population.toLocaleString()}</td>
                <td>${country}</td>
                <td>${jpScale}</td>
            `;
            
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // Clear the container and add the new elements
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(tableContainer);
        
        // Setup event listeners for the newly added elements
        console.log('Setting up event listeners after rendering results');
        this.setupEventListeners(); // This now includes setupCheckboxListeners()
        
        // Add event listeners to play buttons
        console.log('Setting up play button listeners');
        const playButtons = this.resultsContainer.querySelectorAll('.play-button');
        console.log(`Found ${playButtons.length} play buttons`);
        
        playButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                const name = e.currentTarget.dataset.name;
                console.log(`Play button ${index + 1} clicked for: ${name}`);
                if (name) {
                    speechService.speak(name, {
                        rate: 0.8,
                        pitch: 1,
                        volume: 1
                    });
                }
            });
        });
        
        // Log the current state of selected results
        console.log('Current selected results:', Array.from(this.selectedResults));
    }

    sortResultsBy(column) {
        // If same column, toggle direction
        if (this.sortConfig.column === column) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New column, set default direction
            this.sortConfig.column = column;
            // For population, default to descending (largest first)
            this.sortConfig.direction = column === 'population' ? 'desc' : 'asc';
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
        
        // Map column names to JP API property names
        const columnMap = {
            'name': 'PeopNameInCountry',
            'country': 'Ctry',
            'population': 'Population',
            'jpscale': 'JPScale',
            'type': 'type' // We'll handle this specially
        };
        
        // Sort the results
        this.currentResults.sort((a, b) => {
            let valueA, valueB;
            
            if (column === 'type') {
                valueA = this.determineType(a);
                valueB = this.determineType(b);
            } else if (column === 'name') {
                valueA = a[columnMap[column]] || a.PeopName;
                valueB = b[columnMap[column]] || b.PeopName;
            } else {
                valueA = a[columnMap[column]];
                valueB = b[columnMap[column]];
            }
            
            // Handle numeric values
            if (column === 'population') {
                valueA = parseInt(valueA) || 0;
                valueB = parseInt(valueB) || 0;
            }
            
            // Compare values based on direction
            if (direction === 'asc') {
                if (typeof valueA === 'string' && typeof valueB === 'string') {
                    return valueA.localeCompare(valueB);
                }
                return valueA - valueB;
            } else {
                if (typeof valueA === 'string' && typeof valueB === 'string') {
                    return valueB.localeCompare(valueA);
                }
                return valueB - valueA;
            }
        });
        
        // Re-display the sorted results
        this.displayResults(this.currentResults, false);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if this is a JP search result page
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    
    if (source === 'jp') {
        // Initialize the JP results UI
        new JPResultsUI();
    }
});

export { JPResultsUI };
