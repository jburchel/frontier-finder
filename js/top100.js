// Import Firebase configuration and Firestore functions
import { db, collection, getDocs, addDoc, deleteDoc, doc } from './firebase-config.js';

// Top 100 List Management
class Top100Manager {
    constructor() {
        this.top100List = [];
        this.currentSort = { field: 'rank', order: 'asc' };
        this.currentFilter = '';
        this.initialized = false;
        this.loadingIndicator = document.getElementById('loading');
        this.errorContainer = document.getElementById('error');
    }

    async initialize() {
        try {
            console.log('Initializing Top100Manager...');
            await this.initializeUI();
            this.setupEventListeners();
            await this.loadTop100List(); // Load the list immediately
            this.initialized = true;
            console.log('Top100Manager initialized successfully');
        } catch (error) {
            console.error('Error in Top100Manager initialization:', error);
            const container = document.getElementById('top100List');
            if (container) {
                container.innerHTML = `<p class="error">Error initializing Top 100 list: ${error.message}</p>`;
            }
            throw error;
        }
    }

    async initializeUI() {
        console.log('Initializing UI...');
        this.top100ListContainer = document.getElementById('top100List');
        this.regionFilter = document.getElementById('regionFilter');
        
        if (!this.top100ListContainer || !this.regionFilter) {
            throw new Error('Required UI elements not found');
        }
        
        await this.populateRegionFilter();
        console.log('UI initialized successfully');
    }

    setupEventListeners() {
        // Sort buttons
        const sortButtons = document.querySelectorAll('.sort-button');
        sortButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sortField = button.dataset.sort;
                if (this.currentSort.field === sortField) {
                    // Toggle order if clicking the same field
                    this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    // Set new field with default ascending order
                    this.currentSort = { field: sortField, order: 'asc' };
                }
                this.sortList();
                this.displayList();
            });
        });

        // Region filter
        if (this.regionFilter) {
            this.regionFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.displayList();
            });
        }
    }

    async loadTop100List() {
        try {
            console.log('Loading Top 100 list...');
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
            if (this.errorContainer) this.errorContainer.style.display = 'none';

            const querySnapshot = await getDocs(collection(db, 'top100'));
            
            // Create a map to track unique entries
            const uniqueGroups = new Map();
            const duplicates = [];

            querySnapshot.docs.forEach(doc => {
                const data = doc.data();
                const key = `${data.name}-${data.country}`.toLowerCase();

                if (!uniqueGroups.has(key)) {
                    // First occurrence - keep this one
                    uniqueGroups.set(key, {
                        id: doc.id,
                        ...data
                    });
                } else {
                    // Duplicate found - mark for deletion
                    duplicates.push(doc.id);
                }
            });

            // Delete duplicates from Firestore
            if (duplicates.length > 0) {
                console.log(`Found ${duplicates.length} duplicates. Removing...`);
                await Promise.all(duplicates.map(id => 
                    deleteDoc(doc(db, 'top100', id))
                ));
                console.log('Duplicates removed successfully');
            }

            // Convert map values to array
            this.top100List = Array.from(uniqueGroups.values());
            console.log(`Loaded ${this.top100List.length} unique items`);

            this.sortList();
            this.displayList();
        } catch (error) {
            console.error('Error loading Top 100 list:', error);
            if (this.errorContainer) {
                this.errorContainer.innerHTML = `<p>Error loading Top 100 list: ${error.message}</p>`;
                this.errorContainer.style.display = 'block';
            }
        } finally {
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        }
    }

    async deleteItem(id) {
        try {
            console.log('Starting delete operation for item:', id);
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
            
            if (!id) {
                throw new Error('No item ID provided for deletion');
            }

            // Delete from Firestore
            console.log('Attempting to delete from Firestore, collection: top100, id:', id);
            const docRef = doc(db, 'top100', id);
            await deleteDoc(docRef);
            console.log('Successfully deleted from Firestore');
            
            // Remove from local list
            const beforeLength = this.top100List.length;
            this.top100List = this.top100List.filter(item => item.id !== id);
            const afterLength = this.top100List.length;
            console.log(`Local list updated. Items removed: ${beforeLength - afterLength}`);
            
            // Update display
            this.displayList();
            console.log('Display updated successfully');
        } catch (error) {
            console.error('Error in deleteItem:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                name: error.name,
                stack: error.stack
            });
            if (this.errorContainer) {
                this.errorContainer.innerHTML = `<p>Error deleting item: ${error.message}</p>`;
                this.errorContainer.style.display = 'block';
            }
            throw error; // Re-throw to handle in the click handler
        } finally {
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        }
    }

    displayList() {
        if (!this.top100ListContainer) return;

        const filteredList = this.filterList();
        const html = filteredList.map((item, index) => {
            const typeClass = item.type === 'FPG' ? 'fpg-type' : 'uupg-type';
            return `
                <div class="upg-card">
                    <div class="upg-header">
                        <div class="upg-title-container">
                            <span class="rank-badge">#${item.rank || index + 1}</span>
                            <h3 class="upg-title">${item.name}</h3>
                        </div>
                        <button class="delete-button" data-id="${item.id}">Delete</button>
                    </div>
                    <div class="upg-details">
                        <div class="upg-column">
                            <p><strong>Type:</strong> <span class="${typeClass}">${item.type.toUpperCase()}</span></p>
                            <p><strong>Country:</strong> ${item.country}</p>
                            <p><strong>Population:</strong> ${item.population.toLocaleString()}</p>
                        </div>
                        <div class="upg-column">
                            <p><strong>Language:</strong> ${item.language}</p>
                            <p><strong>Religion:</strong> ${item.religion}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.top100ListContainer.innerHTML = html;
        
        // Add event listeners for delete buttons
        const deleteButtons = this.top100ListContainer.querySelectorAll('.delete-button');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                // Get the ID from the clicked button, handling event delegation
                const button = e.target.closest('.delete-button');
                const id = button ? button.dataset.id : null;
                console.log('Delete button clicked, element:', button);
                console.log('Delete button clicked for id:', id);
                
                if (!id) {
                    console.error('No item ID found on delete button');
                    alert('Error: Could not identify item to delete');
                    return;
                }
                
                if (confirm('Are you sure you want to remove this people group from the Top 100 list?')) {
                    try {
                        await this.deleteItem(id);
                        console.log('Delete operation completed successfully');
                    } catch (error) {
                        console.error('Error in delete button handler:', error);
                        alert('Failed to delete item. Please try again.');
                    }
                }
            });
        });
    }

    filterList() {
        return this.top100List.filter(item => !this.currentFilter || item.region === this.currentFilter);
    }

    sortList() {
        this.top100List.sort((a, b) => {
            let valueA = a[this.currentSort.field];
            let valueB = b[this.currentSort.field];

            // Handle numeric values
            if (this.currentSort.field === 'population') {
                valueA = parseInt(valueA) || 0;
                valueB = parseInt(valueB) || 0;
            }

            // Handle string values
            if (typeof valueA === 'string') valueA = valueA.toLowerCase();
            if (typeof valueB === 'string') valueB = valueB.toLowerCase();

            if (valueA < valueB) return this.currentSort.order === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.currentSort.order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    async populateRegionFilter() {
        try {
            // Get unique regions from the list
            const regions = [...new Set(this.top100List.map(item => item.region))].filter(Boolean);
            regions.sort();

            // Create options HTML
            const optionsHtml = [
                '<option value="">All Regions</option>',
                ...regions.map(region => `<option value="${region}">${region}</option>`)
            ].join('');

            this.regionFilter.innerHTML = optionsHtml;
        } catch (error) {
            console.error('Error populating region filter:', error);
            this.regionFilter.innerHTML = '<option value="">Error loading regions</option>';
        }
    }
}

// Initialize Top 100 Manager when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    window.top100Manager = new Top100Manager();
    await window.top100Manager.initialize();
});
