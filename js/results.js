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
                units: params.get('units')
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

            const results = await searchService.searchNearby(
                searchParams.upg,
                searchParams.radius,
                searchParams.units
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
            
            // Display results
            this.displayResults(results);
            
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
        document.getElementById('location').textContent = `${params.upg.latitude}, ${params.upg.longitude}`;
        document.getElementById('searchRadius').textContent = `${params.radius} ${params.units === 'M' ? 'Miles' : 'Kilometers'}`;
    }

    setupEventListeners() {
        const addToListButton = document.getElementById('addToListButton');
        if (addToListButton) {
            addToListButton.addEventListener('click', () => this.addToTop100List());
        }
        
        const addSelectedButton = document.getElementById('addSelectedButton');
        if (addSelectedButton) {
            addSelectedButton.addEventListener('click', () => this.addToTop100List());
        }
    }

    setupSorting(table) {
        const headers = table.querySelectorAll('thead th');
        headers.forEach(header => {
            // Skip the checkbox column
            if (header.textContent.trim() === 'Select') return;
            
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort') || 
                               header.textContent.toLowerCase().replace(/\s+/g, '');
                
                // Toggle direction if clicking the same column
                if (this.sortConfig.column === column) {
                    this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortConfig.column = column;
                    this.sortConfig.direction = 'asc';
                }
                
                // Update UI to show sort direction
                headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
                header.classList.add(`sort-${this.sortConfig.direction}`);
                
                this.sortResults();
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
            }
            
            // Compare values
            if (valueA < valueB) return direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Re-display sorted results
        this.displayResults(this.currentResults, false);
    }

    createFilterControls() {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-container';
        
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = i18nService.translate('filterResults');
        filterInput.className = 'filter-input';
        
        filterInput.addEventListener('input', (e) => {
            this.filterResults(e.target.value);
        });
        
        filterContainer.appendChild(filterInput);
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
                <th data-i18n="headerSelect">${i18nService.translate('headerSelect')}</th>
                <th data-i18n="headerName">${i18nService.translate('headerName')}</th>
                <th data-i18n="headerPronunciation">${i18nService.translate('headerPronunciation')}</th>
                <th data-i18n="headerPopulation">${i18nService.translate('headerPopulation')}</th>
                <th data-i18n="headerCountry">${i18nService.translate('headerCountry')}</th>
                <th data-i18n="headerDistance">${i18nService.translate('headerDistance')}</th>
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
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="result-checkbox" data-index="${i}">
                </td>
                <td>${result.name}</td>
                <td>
                    <span class="pronunciation">${result.pronunciation || ''}</span>
                    ${result.pronunciation ? `
                        <button class="speak-button" title="Speak pronunciation">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    ` : ''}
                </td>
                <td>${result.population.toLocaleString()}</td>
                <td>${result.country}</td>
                <td>${formatDistance(result.distance, results[0].units || 'M')}</td>
            `;
            
            // Add event listener for checkbox
            const checkbox = row.querySelector('.result-checkbox');
            checkbox.addEventListener('change', () => {
                this.handleSelectionChange(checkbox, i);
            });
            
            // Add event listener for speak button
            const speakButton = row.querySelector('.speak-button');
            if (speakButton) {
                speakButton.addEventListener('click', () => {
                    const text = result.pronunciation || result.name;
                    if (window.responsiveVoice && window.responsiveVoice.voiceSupport()) {
                        window.responsiveVoice.speak(text);
                    } else if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(text);
                        window.speechSynthesis.speak(utterance);
                    }
                });
            }
            
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // Clear previous results and add new table
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(tableContainer);
        
        // Setup sorting
        this.setupSorting(table);
        
        // Update button state
        this.updateAddToListButton();
    }

    displayError(message) {
        if (!this.resultsContainer) return;
        
        this.resultsContainer.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
                <button onclick="window.location.href='index.html'" class="button">
                    ${i18nService.translate('backToSearch')}
                </button>
            </div>
        `;
    }

    handleSelectionChange(checkbox, resultIndex) {
        if (checkbox.checked) {
            this.selectedResults.add(resultIndex);
        } else {
            this.selectedResults.delete(resultIndex);
        }
        
        this.updateAddToListButton();
    }

    updateAddToListButton() {
        const addButton = document.getElementById('addToListButton');
        const addSelectedButton = document.getElementById('addSelectedButton');
        
        if (addButton) {
            addButton.disabled = this.selectedResults.size === 0;
        }
        
        if (addSelectedButton) {
            addSelectedButton.disabled = this.selectedResults.size === 0;
            addSelectedButton.textContent = `${i18nService.translate('buttonAddSelected')} (${this.selectedResults.size})`;
        }
    }

    async addToTop100List() {
        try {
            if (!firebaseService.isInitialized()) {
                await firebaseService.initialize();
            }
            
            const db = firebaseService.getFirestore();
            if (!db) {
                throw new Error('Firestore not available');
            }
            
            const selectedItems = Array.from(this.selectedResults).map(index => {
                const item = this.currentResults[index];
                return {
                    name: item.name,
                    country: item.country,
                    population: item.population,
                    language: item.language,
                    religion: item.religion,
                    pronunciation: item.pronunciation || '',
                    type: 'FPG',
                    addedAt: new Date().toISOString()
                };
            });
            
            if (selectedItems.length === 0) {
                alert(i18nService.translate('noItemsSelected'));
                return;
            }
            
            // Show loading
            this.showLoading(i18nService.translate('savingToList'));
            
            // Get existing items to check for duplicates
            const top100Collection = collection(db, 'top100');
            const existingSnapshot = await getDocs(top100Collection);
            const existingItems = existingSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Check for duplicates
            const duplicates = [];
            const newItems = [];
            
            for (const item of selectedItems) {
                const isDuplicate = existingItems.some(existing => 
                    existing.name === item.name && 
                    existing.country === item.country
                );
                
                if (isDuplicate) {
                    duplicates.push(item.name);
                } else {
                    newItems.push(item);
                }
            }
            
            // Add new items
            for (const item of newItems) {
                await addDoc(top100Collection, item);
            }
            
            // Hide loading
            this.hideLoading();
            
            // Show result message
            let message = '';
            if (newItems.length > 0) {
                message += `${i18nService.translate('addedToList')}: ${newItems.length} ${i18nService.translate('items')}. `;
            }
            if (duplicates.length > 0) {
                message += `${i18nService.translate('duplicatesSkipped')}: ${duplicates.join(', ')}`;
            }
            
            alert(message);
            
            // Redirect to top100 page
            window.location.href = 'top100.html';
            
        } catch (error) {
            console.error('Error adding to Top 100 list:', error);
            this.hideLoading();
            alert(`${i18nService.translate('errorAddingToList')}: ${error.message}`);
        }
    }
}

// Initialize the results UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize i18n first
        await i18nService.initialize();
        
        // Create results UI
        new ResultsUI();
    } catch (error) {
        console.error('Failed to initialize results page:', error);
    }
}); 