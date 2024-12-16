// Top 100 List Management
class Top100Manager {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.top100List = [];
        this.currentSort = { field: 'rank', order: 'asc' };
        this.currentFilter = '';
        
        this.initializeUI();
        this.setupEventListeners();
        this.setupAuthStateListener();
    }

    initializeUI() {
        this.top100ListContainer = document.getElementById('top100List');
        this.regionFilter = document.getElementById('regionFilter');
        this.populateRegionFilter();
    }

    setupEventListeners() {
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
    }

    setupAuthStateListener() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.loadTop100List();
            } else {
                this.promptLogin();
            }
        });
    }

    async promptLogin() {
        try {
            await this.auth.signInAnonymously();
        } catch (error) {
            console.error('Error signing in:', error);
            this.top100ListContainer.innerHTML = '<p class="error">Error loading Top 100 list. Please try refreshing the page.</p>';
        }
    }

    async loadTop100List() {
        try {
            const snapshot = await this.db.collection('top100Lists')
                .doc(this.auth.currentUser.uid)
                .get();

            this.top100List = snapshot.exists ? snapshot.data().groups : [];
            this.populateRegionFilter();
            this.renderTop100List();
        } catch (error) {
            console.error('Error loading Top 100 list:', error);
            this.top100ListContainer.innerHTML = '<p class="error">Error loading Top 100 list. Please try refreshing the page.</p>';
        }
    }

    populateRegionFilter() {
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
    }

    getRegionFromCountry(country) {
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
    }

    async removeFromTop100(index) {
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
