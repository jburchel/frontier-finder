import { firebaseService } from './firebase.js';

/**
 * Top 100 Priority List page handling
 */
class Top100Page {
    constructor() {
        this.listContainer = document.getElementById('top100List');
        this.typeFilter = document.getElementById('typeFilter');
        this.sortOptions = document.getElementById('sortOptions');
        
        this.groups = [];
        console.log('Top100Page initialized');
        this.initialize();
    }

    /**
     * Initialize the page
     */
    async initialize() {
        try {
            console.group('Top 100 Page Initialization');
            console.log('Starting initialization...');
            
            // Load groups
            await this.loadGroups();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Initialization complete');
            console.groupEnd();
            
        } catch (error) {
            console.error('Failed to initialize Top 100 page:', error);
            this.showError('Failed to load Top 100 list: ' + error.message);
            console.groupEnd();
        }
    }

    /**
     * Load groups from Firestore
     */
    async loadGroups() {
        console.group('Loading Top 100 Groups');
        try {
            console.log('Fetching groups from Firestore...');
            this.groups = await firebaseService.getTop100();
            console.log('Groups received:', this.groups);
            
            // Show browser compatibility warning if needed
            if (this.groups.length === 1 && this.groups[0].id === 'mock1') {
                this.showWarning('Browser privacy settings are blocking Firestore access. Try using Chrome or Firefox for development.');
            }
            
            this.displayGroups(this.groups);
            console.groupEnd();
        } catch (error) {
            console.error('Failed to load groups:', error);
            console.groupEnd();
            throw error;
        }
    }

    /**
     * Display groups in the list
     */
    displayGroups(groups) {
        if (!this.listContainer) {
            console.error('List container element not found');
            return;
        }

        console.log('Displaying groups:', groups.length);

        this.listContainer.innerHTML = groups.map((group, index) => `
            <div class="priority-card" data-id="${group.id}">
                <div class="priority-number">${index + 1}</div>
                <div class="card-content">
                    <h3>${group.PeopNameInCountry}</h3>
                    <p><strong>Type:</strong> ${group.type}</p>
                    <p><strong>Population:</strong> ${group.Population.toLocaleString()}</p>
                    <p><strong>Evangelical:</strong> ${group.PercentEvangelical}%</p>
                    <p><strong>Primary Religion:</strong> ${group.PrimaryReligion}</p>
                    <p><strong>Primary Language:</strong> ${group.PrimaryLanguageName}</p>
                    <p><strong>Added:</strong> ${new Date(group.addedAt.toDate()).toLocaleDateString()}</p>
                </div>
                <button class="delete-button" data-id="${group.id}">Remove</button>
            </div>
        `).join('');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Type filter
        this.typeFilter?.addEventListener('change', (e) => {
            this.filterGroups(e.target.value);
        });

        // Sort options
        this.sortOptions?.addEventListener('click', (e) => {
            const button = e.target.closest('.sort-button');
            if (button) {
                this.sortGroups(button.dataset.sort);
            }
        });

        // Delete buttons
        this.listContainer?.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.delete-button');
            if (deleteButton) {
                await this.removeGroup(deleteButton.dataset.id);
            }
        });
    }

    /**
     * Filter groups by type
     */
    filterGroups(type) {
        const filtered = type === 'all' 
            ? this.groups 
            : this.groups.filter(group => group.type.toLowerCase() === type);
        this.displayGroups(filtered);
    }

    /**
     * Sort groups by criteria
     */
    sortGroups(criteria) {
        const sortFunctions = {
            date: (a, b) => b.addedAt.toDate() - a.addedAt.toDate(),
            country: (a, b) => a.Country.localeCompare(b.Country),
            population: (a, b) => b.Population - a.Population
        };

        this.groups.sort(sortFunctions[criteria]);
        this.displayGroups(this.groups);
    }

    /**
     * Remove a group from the list
     */
    async removeGroup(id) {
        try {
            if (!confirm('Are you sure you want to remove this people group?')) {
                return;
            }

            await firebaseService.removeFromTop100(id);
            await this.loadGroups(); // Reload the list
            
        } catch (error) {
            console.error('Failed to remove group:', error);
            alert('Failed to remove group: ' + error.message);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.listContainer?.parentNode.insertBefore(errorDiv, this.listContainer);
    }

    showWarning(message) {
        const warning = document.createElement('div');
        warning.className = 'warning-message';
        warning.innerHTML = `
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">${message}</span>
        `;
        this.listContainer.parentNode.insertBefore(warning, this.listContainer);
    }
}

// Initialize page
const top100Page = new Top100Page();
export default top100Page; 