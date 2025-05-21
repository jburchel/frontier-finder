import { firebaseService } from './firebase.js';
import { formatGroupType } from './utils.js';
import { speechService } from './services/speechService.js';
import { pronunciationService } from './services/pronunciationService.js';
import { i18nService } from './i18n.js';
import { config } from './config.js';

console.log('Top100 module loaded');

export class Top100Page {
    constructor() {
        console.log('Top100Page: Initializing...');
        this.groups = []; // Initialize groups as empty array
        
        // DOM elements
        this.loadingElement = document.getElementById('loadingState');
        this.errorElement = document.getElementById('errorState');
        this.errorMessageElement = document.querySelector('.error-message');
        this.emptyElement = document.getElementById('emptyState');
        this.tableContainer = document.getElementById('tableContainer');
        this.tableBody = document.getElementById('top100List');
        this.filterSelect = document.getElementById('filterSelect');
        this.searchFilter = document.getElementById('searchFilter');
        this.exportCSVButton = document.getElementById('exportCSVButton');
        this.exportPDFButton = document.getElementById('exportPDFButton');
        
        this.currentFilter = 'all';
        this.currentSort = 'name';
        this.sortDirection = 'asc';
        this.searchTerm = '';
        
        this.setupEventListeners();
        this.initializeFirebase();
    }

    async initializeFirebase() {
        try {
            console.log('Top100Page: Initializing Firebase...');
            this.showLoading();
            
            // Initialize Firebase service
            await firebaseService.initialize();
            
            // Once Firebase is initialized, load the Top 100 list
            this.loadTop100List();
            
        } catch (error) {
            console.error('Top100Page: Firebase initialization error:', error);
            this.showError('Failed to connect to the database. Please check your internet connection and try again.');
        }
    }

    setupEventListeners() {
        console.log('Top100Page: Setting up event listeners');
        
        // Filter change event
        this.filterSelect.addEventListener('change', () => {
            this.currentFilter = this.filterSelect.value;
            this.updateDisplay();
        });
        
        // Search filter input event
        this.searchFilter.addEventListener('input', () => {
            this.searchTerm = this.searchFilter.value.toLowerCase();
            this.updateDisplay();
        });
        
        // Sort button clicks
        document.querySelectorAll('.sort-controls button').forEach(button => {
            button.addEventListener('click', () => {
                const sortBy = button.getAttribute('data-sort');
                if (this.currentSort === sortBy) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSort = sortBy;
                    this.sortDirection = 'asc';
                }
                this.updateSortButtons();
                this.updateDisplay();
            });
        });
        
        // Export buttons
        this.exportCSVButton.addEventListener('click', () => {
            console.log('Top100Page: Export CSV button clicked');
            this.exportToCSV();
        });
        
        this.exportPDFButton.addEventListener('click', () => {
            console.log('Top100Page: Export PDF button clicked');
            this.exportToPDF();
        });
        
        // Retry button
        const retryButton = document.getElementById('retryButton');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                console.log('Top100Page: Retry button clicked');
                this.retry();
            });
        }
    }
    
    async loadTop100List() {
        try {
            console.log('Top100Page: Loading Top 100 list...');
            this.showLoading();
            
            // Check if we just added items
            const justAdded = sessionStorage.getItem('justAddedToTop100') === 'true';
            if (justAdded) {
                // Clear the flag so we don't show the message again on refresh
                sessionStorage.removeItem('justAddedToTop100');
                
                // Show a success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.style.backgroundColor = '#d4edda';
                successMessage.style.color = '#155724';
                successMessage.style.padding = '15px';
                successMessage.style.marginBottom = '20px';
                successMessage.style.borderRadius = '4px';
                successMessage.style.border = '1px solid #c3e6cb';
                successMessage.style.textAlign = 'center';
                successMessage.style.display = 'flex';
                successMessage.style.alignItems = 'center';
                successMessage.style.justifyContent = 'center';
                successMessage.innerHTML = `
                    <i class="fas fa-check-circle" style="margin-right: 10px; font-size: 20px;"></i>
                    <span>Items successfully added to your Top 100 list!</span>
                `;
                
                // Insert the message at the top of the container
                const container = document.querySelector('.container');
                if (container) {
                    container.insertBefore(successMessage, container.firstChild);
                    
                    // Remove the message after 5 seconds
                    setTimeout(() => {
                        successMessage.style.transition = 'opacity 0.5s';
                        successMessage.style.opacity = '0';
                        setTimeout(() => {
                            if (successMessage.parentNode) {
                                successMessage.parentNode.removeChild(successMessage);
                            }
                        }, 500);
                    }, 5000);
                }
            }
            
            try {
                // Try to use Firebase first
                console.log('Top100Page: Attempting to load from Firebase...');
                this.groups = await firebaseService.getTop100();
                console.log(`Top100Page: Loaded ${this.groups.length} groups from Firebase`);
            } catch (firebaseError) {
                console.error('Top100Page: Firebase error, falling back to localStorage:', firebaseError);
                
                // Firebase failed, try localStorage as fallback
                try {
                    const storedItems = localStorage.getItem('top100Items');
                    if (storedItems) {
                        this.groups = JSON.parse(storedItems);
                        console.log(`Top100Page: Loaded ${this.groups.length} groups from localStorage`);
                    } else {
                        console.log('Top100Page: No items found in localStorage');
                        this.groups = [];
                    }
                } catch (localStorageError) {
                    console.error('Top100Page: Error reading from localStorage:', localStorageError);
                    this.groups = [];
                }
            }
            
            this.updateDisplay();
            
        } catch (error) {
            console.error('Top100Page: Error loading Top 100 list:', error);
            this.showError('Failed to load your Top 100 list. Please try again later.');
        }
    }
    
    updateDisplay() {
        const filteredGroups = this.filterGroups();
        const sortedGroups = this.sortGroups(filteredGroups);
        
        if (this.groups.length === 0) {
            this.showEmptyState();
        } else if (filteredGroups.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-results">No groups match your current filters</td>
                </tr>
            `;
            this.hideLoading();
            this.hideError();
            this.hideEmptyState();
            this.tableContainer.style.display = 'block';
        } else {
            this.renderGroups(sortedGroups);
            this.hideLoading();
            this.hideError();
            this.hideEmptyState();
            this.tableContainer.style.display = 'block';
        }
    }
    
    filterGroups() {
        console.log(`Top100Page: Filtering groups with filter: ${this.currentFilter}`);
        let filtered = [...this.groups];
        
        // Filter by type
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(group => group.type === this.currentFilter);
        }
        
        // Filter by search term
        if (this.searchTerm) {
            filtered = filtered.filter(group => {
                return (
                    (group.name && group.name.toLowerCase().includes(this.searchTerm)) ||
                    (group.country && group.country.toLowerCase().includes(this.searchTerm)) ||
                    (group.language && group.language.toLowerCase().includes(this.searchTerm)) ||
                    (group.religion && group.religion.toLowerCase().includes(this.searchTerm))
                );
            });
        }
        
        console.log(`Top100Page: Filtered to ${filtered.length} groups`);
        return filtered;
    }
    
    sortGroups(groups) {
        console.log(`Top100Page: Sorting groups by ${this.currentSort} in ${this.sortDirection} order`);
        
        return [...groups].sort((a, b) => {
            let valueA, valueB;
            
            switch (this.currentSort) {
                case 'name':
                    valueA = a.name || '';
                    valueB = b.name || '';
                    break;
                case 'population':
                    valueA = parseInt(a.population) || 0;
                    valueB = parseInt(b.population) || 0;
                    break;
                case 'country':
                    valueA = a.country || '';
                    valueB = b.country || '';
                    break;
                case 'type':
                    valueA = a.type || '';
                    valueB = b.type || '';
                    break;
                case 'dateAdded':
                    valueA = a.dateAdded || new Date(0);
                    valueB = b.dateAdded || new Date(0);
                    break;
                default:
                    valueA = a.name || '';
                    valueB = b.name || '';
            }
            
            // For strings, use localeCompare
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return this.sortDirection === 'asc' 
                    ? valueA.localeCompare(valueB) 
                    : valueB.localeCompare(valueA);
            }
            
            // For dates
            if (valueA instanceof Date && valueB instanceof Date) {
                return this.sortDirection === 'asc' 
                    ? valueA.getTime() - valueB.getTime() 
                    : valueB.getTime() - valueA.getTime();
            }
            
            // For numbers
            return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        });
    }
    
    renderGroups(groups) {
        this.tableBody.innerHTML = '';
        
        groups.forEach(group => {
            const row = document.createElement('tr');
            
            // Format population with commas
            const formattedPopulation = group.population 
                ? parseInt(group.population).toLocaleString() 
                : 'Unknown';
            
            row.innerHTML = `
                <td>${group.name || 'Unknown'}</td>
                <td>${group.pronunciation || ''}</td>
                <td>
                    ${group.pronunciation ? 
                        `<button class="speak-button" title="Speak pronunciation">
                            <i class="fas fa-volume-up"></i>
                        </button>` : 
                        ''}
                </td>
                <td>${formattedPopulation}</td>
                <td>${group.country || 'Unknown'}</td>
                <td>${group.type || 'Unknown'}</td>
                <td>
                    <button class="delete-button" data-id="${group.id}">
                        Remove
                    </button>
                </td>
            `;
            
            // Add event listener for delete button
            const deleteButton = row.querySelector('.delete-button');
            deleteButton.addEventListener('click', () => this.removeFromTop100(group.id));
            
            // Add event listener for pronunciation button
            const speakButton = row.querySelector('.speak-button');
            if (speakButton) {
                speakButton.addEventListener('click', () => {
                    const text = group.pronunciation || group.name;
                    if (window.responsiveVoice && window.responsiveVoice.voiceSupport()) {
                        window.responsiveVoice.speak(text);
                    } else if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(text);
                        window.speechSynthesis.speak(utterance);
                    } else {
                        console.warn('Speech synthesis not supported in this browser');
                    }
                });
            }
            
            this.tableBody.appendChild(row);
        });
    }
    
    async removeFromTop100(id) {
        try {
            console.log(`Top100Page: Removing group with ID: ${id}`);
            
            // Try to remove from Firebase first
            try {
                await firebaseService.removeFromTop100(id);
                console.log('Top100Page: Successfully removed from Firebase');
            } catch (firebaseError) {
                console.error('Top100Page: Error removing from Firebase, will still update local data:', firebaseError);
            }
            
            // Update local data
            this.groups = this.groups.filter(group => group.id !== id);
            this.updateDisplay();
            
            // Also update localStorage
            try {
                localStorage.setItem('top100Items', JSON.stringify(this.groups));
                console.log('Top100Page: Updated localStorage after removal');
            } catch (localStorageError) {
                console.error('Top100Page: Error updating localStorage:', localStorageError);
            }
            
        } catch (error) {
            console.error('Top100Page: Error removing group:', error);
            this.showError('Failed to remove group. Please try again.');
        }
    }
    
    updateSortButtons() {
        const buttons = document.querySelectorAll('.sort-controls button');
        buttons.forEach(button => {
            const sortType = button.getAttribute('data-sort');
            button.classList.toggle('active', sortType === this.currentSort);
            
            // Clear any existing direction indicators
            button.classList.remove('asc', 'desc');
            
            // Add direction indicator to the active button
            if (sortType === this.currentSort) {
                button.classList.add(this.sortDirection);
            }
        });
    }
    
    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
        }
        if (this.tableContainer) {
            this.tableContainer.style.display = 'none';
        }
        if (this.emptyElement) {
            this.emptyElement.style.display = 'none';
        }
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }
    
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }
    
    showEmptyState() {
        if (this.emptyElement) {
            this.emptyElement.style.display = 'block';
        }
        if (this.tableContainer) {
            this.tableContainer.style.display = 'none';
        }
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }
    
    hideEmptyState() {
        if (this.emptyElement) {
            this.emptyElement.style.display = 'none';
        }
    }
    
    showError(message) {
        if (this.errorElement) {
            this.errorElement.style.display = 'block';
            if (this.errorMessageElement) {
                this.errorMessageElement.textContent = message;
            }
        }
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
        if (this.tableContainer) {
            this.tableContainer.style.display = 'none';
        }
        if (this.emptyElement) {
            this.emptyElement.style.display = 'none';
        }
    }
    
    hideError() {
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }
    
    exportToCSV() {
        console.log('Top100Page: Exporting to CSV...');
        const filteredGroups = this.filterGroups();
        
        if (filteredGroups.length === 0) {
            alert('No data to export. Please adjust your filters or add groups to your list.');
            return;
        }
        
        // Define CSV headers
        const headers = ['Name', 'Pronunciation', 'Population', 'Country', 'Type', 'Religion', 'Language'];
        
        // Convert data to CSV rows
        const rows = filteredGroups.map(group => {
            return [
                this.escapeCsvValue(group.name || ''),
                this.escapeCsvValue(group.pronunciation || ''),
                group.population || '',
                this.escapeCsvValue(group.country || ''),
                this.escapeCsvValue(group.type || ''),
                this.escapeCsvValue(group.religion || ''),
                this.escapeCsvValue(group.language || '')
            ];
        });
        
        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Get current date for filename
        const date = new Date().toISOString().split('T')[0];
        
        link.setAttribute('href', url);
        link.setAttribute('download', `frontier_finder_top100_${date}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    escapeCsvValue(value) {
        if (value === null || value === undefined) return '';
        
        // If the value contains a comma, quote, or newline, wrap it in quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            // Double any quotes within the value
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
    }
    
    exportToPDF() {
        console.log('Top100Page: Exporting to PDF...');
        const filteredGroups = this.filterGroups();
        
        // Alert user that this feature is coming soon
        alert('PDF export will be available in a future update. Please use CSV export for now.');
        
        // TODO: Implement PDF export using a library like jsPDF
        /*
        Example implementation:
        
        import { jsPDF } from 'jspdf';
        import 'jspdf-autotable';
        
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Frontier Finder - Top 100 Priority List', 14, 22);
        
        // Add date
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        
        // Create table
        doc.autoTable({
            head: [['Name', 'Population', 'Country', 'Type', 'Religion', 'Language']],
            body: filteredGroups.map(group => [
                group.name || '',
                group.population ? parseInt(group.population).toLocaleString() : '',
                group.country || '',
                group.type || '',
                group.religion || '',
                group.language || ''
            ]),
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [24, 57, 99], textColor: 255 }
        });
        
        // Save PDF
        const date = new Date().toISOString().split('T')[0];
        doc.save(`frontier_finder_top100_${date}.pdf`);
        */
    }

    // Add a retry method
    retry() {
        console.log('Top100Page: Retrying...');
        this.showLoading();
        
        // Reset Firebase initialization
        firebaseService.initialized = false;
        firebaseService.initializationPromise = null;
        
        // Try to initialize Firebase again
        this.initializeFirebase();
    }
}

// Initialize the page when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing Top100Page');
        const page = new Top100Page();
    } catch (error) {
        console.error('Error initializing Top100Page:', error);
        const errorElement = document.getElementById('errorState');
        const errorMessageElement = document.querySelector('.error-message');
        
        if (errorElement) {
            errorElement.style.display = 'block';
        }
        
        if (errorMessageElement) {
            errorMessageElement.textContent = 'Failed to initialize the page. Please refresh and try again.';
        }
        
        const loadingElement = document.getElementById('loadingState');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
});

// Add global play function
window.playPronunciation = (pronunciation) => {
    if (!pronunciation) return;
    speechService.speak(pronunciation);
};

async function displayTop100Items(items) {
    const tableBody = document.getElementById('top100TableBody');
    tableBody.innerHTML = '';

    for (const item of items) {
        const row = document.createElement('tr');
        const pronunciation = await pronunciationService.generatePronunciation(item.peopleName);
        
        row.innerHTML = `
            <td>${item.peopleName}</td>
            <td>
                ${pronunciation}
                <button class="btn btn-sm btn-secondary speak-button" 
                        data-text="${item.peopleName}">
                    <i class="fas fa-volume-up"></i>
                </button>
            </td>
            <td>${item.population.toLocaleString()}</td>
            <td>${item.country}</td>
            <td>${item.type}</td>
            <td>
                <button class="btn btn-danger delete-button" data-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        // Add click handler for the speak button
        const speakButton = row.querySelector('.speak-button');
        speakButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const text = speakButton.getAttribute('data-text');
            await pronunciationService.speakPronunciation(text);
        });

        tableBody.appendChild(row);
    }
} 