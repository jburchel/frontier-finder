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
                this.handleSort(sortField);
                
                // Update active button state
                sortButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // Region filter
        const regionFilter = document.getElementById('regionFilter');
        if (regionFilter) {
            regionFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.renderList();
            });
        }
    }

    handleSort(field) {
        if (this.currentSort.field === field) {
            this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.order = 'asc';
        }
        this.renderList();
    }

    async loadTop100List() {
        try {
            console.log('Loading top 100 list...');
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
            if (this.errorContainer) this.errorContainer.style.display = 'none';

            const querySnapshot = await getDocs(collection(db, 'top100'));
            this.top100List = querySnapshot.docs.map(doc => ({
                id: doc.id,  // Store the document ID
                ...doc.data()
            }));

            console.log(`Loaded ${this.top100List.length} items`);
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
            console.log('Deleting item:', id);
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
            
            // Delete from Firestore
            await deleteDoc(doc(db, 'top100', id));
            
            // Remove from local list
            this.top100List = this.top100List.filter(item => item.id !== id);
            
            // Update display
            this.displayList();
            console.log('Item deleted successfully');
        } catch (error) {
            console.error('Error deleting item:', error);
            if (this.errorContainer) {
                this.errorContainer.innerHTML = `<p>Error deleting item: ${error.message}</p>`;
                this.errorContainer.style.display = 'block';
            }
        } finally {
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        }
    }

    async saveToTop100(peopleGroup) {
        try {
            // Check for duplicates before saving
            const key = `${peopleGroup.name}-${peopleGroup.country}`.toLowerCase();
            const isDuplicate = this.top100List.some(group => 
                `${group.name}-${group.country}`.toLowerCase() === key
            );

            if (isDuplicate) {
                throw new Error('This people group is already in the Top 100 list');
            }

            // Ensure type is uppercase
            peopleGroup.type = peopleGroup.type ? peopleGroup.type.toUpperCase() : 'BOTH';

            const docRef = await addDoc(collection(db, 'top100'), peopleGroup);
            console.log('Document written with ID:', docRef.id);
            await this.loadTop100List(); // Reload the list after adding
        } catch (error) {
            console.error('Error saving to Top 100:', error);
            throw error;
        }
    }

    renderList() {
        const container = document.getElementById('top100List');
        if (!container) return;

        // Show loading state
        this.loadingIndicator.style.display = 'block';
        container.style.display = 'none';

        try {
            // Filter list if needed
            let filteredList = this.currentFilter
                ? this.top100List.filter(item => item.region === this.currentFilter)
                : this.top100List;

            // Sort list
            filteredList.sort((a, b) => {
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

            // Create card HTML
            const createCard = (item, index) => {
                return `
                    <div class="people-group-card">
                        <div class="card-header">
                            <h3>${item.name}</h3>
                            <div class="rank-badge">#${index + 1}</div>
                        </div>
                        <div class="card-content">
                            <div class="card-columns">
                                <div class="card-column">
                                    <div class="info-item">
                                        <label>Type:</label>
                                        <span>${item.type || 'BOTH'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Country:</label>
                                        <span>${item.country}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Population:</label>
                                        <span>${item.population.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div class="card-column">
                                    <div class="info-item">
                                        <label>Language:</label>
                                        <span>${item.language}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Religion:</label>
                                        <span>${item.religion}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            };

            // Split list into two sections
            const midPoint = Math.ceil(filteredList.length / 2);
            const leftSection = filteredList.slice(0, midPoint);
            const rightSection = filteredList.slice(midPoint);

            // Create HTML for both sections
            const leftSectionHtml = leftSection.map((item, index) => createCard(item, index)).join('');
            const rightSectionHtml = rightSection.map((item, index) => createCard(item, index + midPoint)).join('');

            // Combine sections with vertical divider
            const html = `
                <div class="section-container">
                    <div class="section">${leftSectionHtml}</div>
                    <div class="vertical-divider"></div>
                    <div class="section">${rightSectionHtml}</div>
                </div>
            `;

            container.innerHTML = filteredList.length ? html : '<p class="no-results">No results found</p>';
        } catch (error) {
            console.error('Error rendering list:', error);
            this.errorContainer.style.display = 'block';
            this.errorContainer.innerHTML = `<p>Error rendering list: ${error.message}</p>`;
        } finally {
            // Hide loading state
            this.loadingIndicator.style.display = 'none';
            container.style.display = 'block';
        }
    }

    async populateRegionFilter() {
        try {
            console.log('Populating region filter...');
            const snapshot = await getDocs(collection(db, 'regions'));
            const regions = snapshot.docs.map(doc => doc.data().name);
            
            const options = regions.map(region => 
                `<option value="${region}">${region}</option>`
            ).join('');
            
            this.regionFilter.innerHTML = '<option value="">All Regions</option>' + options;
            console.log('Region filter populated successfully');
        } catch (error) {
            console.error('Error populating region filter:', error);
            this.regionFilter.innerHTML = '<option value="">Error loading regions</option>';
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
                            <p><strong>Type:</strong> <span class="${typeClass}">${item.type}</span></p>
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
            button.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (confirm('Are you sure you want to remove this people group from the Top 100 list?')) {
                    this.deleteItem(id);
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
}

// Initialize Top 100 Manager when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    window.top100Manager = new Top100Manager();
    await window.top100Manager.initialize();
});
