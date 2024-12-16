// Top 100 List Management
class Top100Manager {
    constructor() {
        try {
            console.log('Initializing Top100Manager...');
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            this.top100List = [];
            this.currentSort = { field: 'rank', order: 'asc' };
            this.currentFilter = '';
            
            this.initializeUI();
            this.setupEventListeners();
            this.setupAuthStateListener();
            console.log('Top100Manager initialized successfully');
        } catch (error) {
            console.error('Error in Top100Manager constructor:', error);
            document.getElementById('top100List').innerHTML = 
                `<p class="error">Error initializing Top 100 list: ${error.message}</p>`;
        }
    }

    initializeUI() {
        console.log('Initializing UI...');
        this.top100ListContainer = document.getElementById('top100List');
        this.regionFilter = document.getElementById('regionFilter');
        if (!this.top100ListContainer || !this.regionFilter) {
            throw new Error('Required UI elements not found');
        }
        this.populateRegionFilter();
        console.log('UI initialized successfully');
    }

    setupEventListeners() {
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

    setupAuthStateListener() {
        console.log('Setting up auth state listener...');
        this.auth.onAuthStateChanged(user => {
            console.log('Auth state changed:', user ? 'User signed in' : 'No user');
            if (user) {
                this.loadTop100List();
            } else {
                this.promptLogin();
            }
        });
    }

    async promptLogin() {
        console.log('Prompting login...');
        try {
            const result = await this.auth.signInAnonymously();
            console.log('Anonymous sign-in successful:', result.user.uid);
        } catch (error) {
            console.error('Error signing in:', error);
            this.top100ListContainer.innerHTML = 
                `<p class="error">Error signing in: ${error.message}. Please try refreshing the page.</p>`;
        }
    }

    async loadTop100List() {
        console.log('Loading top 100 list...');
        try {
            if (!this.auth.currentUser) {
                throw new Error('No authenticated user');
            }

            const docRef = this.db.collection('top100Lists').doc(this.auth.currentUser.uid);
            console.log('Fetching document:', docRef.path);
            
            const snapshot = await docRef.get();
            console.log('Document exists:', snapshot.exists);

            if (snapshot.exists) {
                const data = snapshot.data();
                console.log('Document data:', data);
                this.top100List = data.groups || [];
            } else {
                console.log('No existing top 100 list, creating empty list');
                this.top100List = [];
                // Create an empty document for the user
                await docRef.set({ groups: [] });
            }

            this.populateRegionFilter();
            this.renderTop100List();
        } catch (error) {
            console.error('Error loading Top 100 list:', error);
            this.top100ListContainer.innerHTML = 
                `<p class="error">Error loading Top 100 list: ${error.message}. Please try refreshing the page.</p>`;
        }
    }

    populateRegionFilter() {
        console.log('Populating region filter...');
        // Get unique regions from the list
        const regions = [...new Set(this.top100List.map(group => this.getRegionFromCountry(group.country)))];
        
        // Sort regions alphabetically
        regions.sort();
        
        // Clear existing options except "All Regions"
        this.regionFilter.innerHTML = '<option value="">All Regions</option>';
        
        // Add region options
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            this.regionFilter.appendChild(option);
        });
        console.log('Region filter populated successfully');
    }

    getRegionFromCountry(country) {
        console.log('Getting region from country:', country);
        // Add your region mapping logic here
        // This is a simplified example
        const regionMap = {
            'China': 'East Asia',
            'India': 'South Asia',
            'Iran': 'Middle East',
            'Indonesia': 'Southeast Asia',
            // Add more mappings as needed
        };
        return regionMap[country] || 'Other';
    }

    handleSort(field) {
        console.log('Handling sort:', field);
        const button = document.querySelector(`[data-sort="${field}"]`);
        
        // Toggle sort order if clicking the same field
        if (this.currentSort.field === field) {
            this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.order = 'asc';
        }

        // Update button states
        document.querySelectorAll('.sort-button').forEach(btn => {
            btn.classList.remove('active', 'asc', 'desc');
        });
        button.classList.add('active', this.currentSort.order);

        this.renderTop100List();
    }

    renderTop100List() {
        console.log('Rendering top 100 list...');
        this.top100ListContainer.innerHTML = '';
        
        if (this.top100List.length === 0) {
            this.top100ListContainer.innerHTML = '<p class="empty-list">No groups added to your Top 100 list yet.</p>';
            return;
        }

        // Filter list if region filter is active
        let filteredList = this.top100List;
        if (this.currentFilter) {
            filteredList = this.top100List.filter(group => 
                this.getRegionFromCountry(group.country) === this.currentFilter
            );
        }

        // Sort the list
        filteredList.sort((a, b) => {
            let aValue = a[this.currentSort.field];
            let bValue = b[this.currentSort.field];

            if (this.currentSort.field === 'rank') {
                aValue = this.top100List.indexOf(a);
                bValue = this.top100List.indexOf(b);
            }

            if (typeof aValue === 'number') {
                return this.currentSort.order === 'asc' ? aValue - bValue : bValue - aValue;
            }

            const comparison = String(aValue).localeCompare(String(bValue));
            return this.currentSort.order === 'asc' ? comparison : -comparison;
        });

        const list = document.createElement('div');
        list.className = 'top-100-items';

        filteredList.forEach((group, index) => {
            const rank = this.top100List.indexOf(group) + 1;
            const item = document.createElement('div');
            item.className = 'top-100-item';
            item.innerHTML = `
                <span class="rank">#${rank}</span>
                <div class="group-info">
                    <h3>${group.name}</h3>
                    <p>
                        <span class="country">${group.country}</span> |
                        <span class="population">Population: ${group.population.toLocaleString()}</span>
                    </p>
                    <p>
                        <span class="language">Language: ${group.language}</span> |
                        <span class="religion">Religion: ${group.religion}</span>
                    </p>
                </div>
                <button class="remove-button" data-index="${this.top100List.indexOf(group)}">Remove</button>
            `;

            // Add remove button functionality
            item.querySelector('.remove-button').addEventListener('click', () => 
                this.removeFromTop100(this.top100List.indexOf(group))
            );
            
            list.appendChild(item);
        });

        this.top100ListContainer.appendChild(list);
        console.log('Top 100 list rendered successfully');
    }

    async removeFromTop100(index) {
        console.log('Removing group from top 100 list:', index);
        try {
            this.top100List.splice(index, 1);
            await this.db.collection('top100Lists')
                .doc(this.auth.currentUser.uid)
                .set({
                    groups: this.top100List,
                    updatedAt: new Date().toISOString()
                });

            this.populateRegionFilter();
            this.renderTop100List();
        } catch (error) {
            console.error('Error removing group from Top 100:', error);
            alert('Error removing group from your Top 100 list. Please try again.');
        }
    }
}

// Initialize Top 100 Manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.top100Manager = new Top100Manager();
});
