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
    }

    async addSelectedToList() {
        if (this.selectedResults.size === 0) return;
        
        try {
            const selectedItems = this.currentResults.filter(result => 
                this.selectedResults.has(result.ID || result.PeopleID3)
            );
            
            if (selectedItems.length === 0) return;
            
            // Show loading state
            this.showLoading(i18nService.translate('savingToList'));
            
            // Save to Firestore
            const db = firebaseService.getFirestore();
            const top100Collection = collection(db, 'top100');
            
            // Get existing items
            const existingSnapshot = await getDocs(top100Collection);
            const existingItems = existingSnapshot.docs.map(doc => doc.data().name);
            
            // Add each selected item if not already in the list
            for (const item of selectedItems) {
                const name = item.PeopNameInCountry || item.PeopName;
                if (!existingItems.includes(name)) {
                    await addDoc(top100Collection, {
                        name: name,
                        country: item.Ctry,
                        population: item.Population,
                        type: this.determineType(item),
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
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="result-checkbox" value="${result.ID || result.PeopleID3}" />
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
                    if (!playButton.dataset.hasListener) {
                        playButton.dataset.hasListener = 'true';
                        playButton.addEventListener('click', (e) => {
                            const name = e.currentTarget.dataset.name;
                            if (name) {
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
        
        // Clear the container and add the new elements
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(tableContainer);
        
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
