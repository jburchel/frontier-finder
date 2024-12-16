// Import Firebase configuration
import { db } from './firebase-config.js';

// Top 100 List Management
class Top100Manager {
    constructor() {
        this.top100List = [];
        this.currentSort = { field: 'rank', order: 'asc' };
        this.currentFilter = '';
        this.initialized = false;
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
        if (!this.initialized) return;
        
        console.log('Setting up event listeners...');
        // Set up sort buttons
        document.querySelectorAll('.sort-button').forEach(button => {
            button.addEventListener('click', () => {
                const sortField = button.getAttribute('data-sort');
                this.handleSort(sortField);
            });
        });

        // Set up region filter
        this.regionFilter.addEventListener('change', () => {
            this.currentFilter = this.regionFilter.value;
            this.renderTop100List();
        });
        console.log('Event listeners set up successfully');
    }

    handleSort(field) {
        console.log('Handling sort by:', field);
        if (this.currentSort.field === field) {
            this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort = { field, order: 'asc' };
        }
        this.renderTop100List();
    }

    sortList(list) {
        return [...list].sort((a, b) => {
            let valueA = a[this.currentSort.field];
            let valueB = b[this.currentSort.field];

            // Handle numeric values
            if (this.currentSort.field === 'rank' || this.currentSort.field === 'population') {
                valueA = Number(valueA);
                valueB = Number(valueB);
            }

            // Handle string values
            if (typeof valueA === 'string') {
                valueA = valueA.toLowerCase();
            }
            if (typeof valueB === 'string') {
                valueB = valueB.toLowerCase();
            }

            if (valueA < valueB) return this.currentSort.order === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.currentSort.order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    async loadTop100List() {
        try {
            console.log('Loading top 100 list...');
            const snapshot = await db.collection('top100').get();
            this.top100List = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.renderTop100List();
            console.log('Top 100 list loaded successfully');
        } catch (error) {
            console.error('Error loading top 100 list:', error);
            this.top100ListContainer.innerHTML = `<p class="error">Error loading Top 100 list: ${error.message}</p>`;
        }
    }

    renderTop100List() {
        console.log('Rendering top 100 list...');
        let filteredList = this.top100List;
        
        // Apply region filter
        if (this.currentFilter) {
            filteredList = filteredList.filter(item => item.region === this.currentFilter);
        }

        // Apply sorting
        filteredList = this.sortList(filteredList);

        // Render the list
        const html = filteredList.map((item, index) => `
            <div class="upg-card">
                <div class="upg-rank">#${item.rank}</div>
                <div class="upg-details">
                    <h3>${item.name}</h3>
                    <p><strong>Country:</strong> ${item.country}</p>
                    <p><strong>Population:</strong> ${item.population.toLocaleString()}</p>
                    <p><strong>Language:</strong> ${item.language}</p>
                    <p><strong>Religion:</strong> ${item.religion}</p>
                </div>
            </div>
        `).join('');

        this.top100ListContainer.innerHTML = html || '<p>No results found</p>';
        console.log('Top 100 list rendered successfully');
    }

    async populateRegionFilter() {
        try {
            console.log('Populating region filter...');
            const snapshot = await db.collection('regions').get();
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
}

// Initialize Top 100 Manager when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    window.top100Manager = new Top100Manager();
    await window.top100Manager.initialize();
});
