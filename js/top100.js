import { firebaseService } from './firebase.js';
import { formatGroupType } from './utils.js';

class Top100Page {
    constructor() {
        this.groups = [];
        this.currentFilter = 'all';
        this.currentSort = 'dateAdded';
        this.sortDirection = 'desc';
        this.initialize();
    }

    async initialize() {
        try {
            console.log('Starting initialization...');
            await this.loadGroups();
            this.setupEventListeners();
            this.updateDisplay();
            console.log('Initialization complete');
        } catch (error) {
            console.error('Failed to initialize Top 100 page:', error);
            this.showError('Failed to load the Top 100 list. Please try again later.');
        }
    }

    async loadGroups() {
        try {
            console.log('Loading Top 100 Groups');
            this.showLoading();
            this.groups = await firebaseService.getTop100();
            this.hideLoading();
            console.log(`Groups received: ${this.groups.length}`);
        } catch (error) {
            console.error('Failed to load groups:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Filter change handler
        document.getElementById('groupFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.updateDisplay();
        });

        // Sort button handlers
        document.querySelectorAll('.sort-controls button').forEach(button => {
            button.addEventListener('click', () => {
                const sortType = button.dataset.sort;
                if (this.currentSort === sortType) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSort = sortType;
                    this.sortDirection = 'desc';
                }
                this.updateDisplay();
            });
        });
    }

    updateDisplay() {
        const filteredGroups = this.filterGroups();
        const sortedGroups = this.sortGroups(filteredGroups);
        this.updateSummary(filteredGroups);
        this.renderTable(sortedGroups);
        this.updateSortButtons();
    }

    filterGroups() {
        if (this.currentFilter === 'all') return [...this.groups];
        return this.groups.filter(group => group.type === this.currentFilter);
    }

    sortGroups(groups) {
        return [...groups].sort((a, b) => {
            let valueA, valueB;
            
            switch (this.currentSort) {
                case 'dateAdded':
                    valueA = new Date(a.addedAt);
                    valueB = new Date(b.addedAt);
                    break;
                case 'population':
                    valueA = parseInt(a.population) || 0;
                    valueB = parseInt(b.population) || 0;
                    break;
                default:
                    valueA = (a[this.currentSort] || '').toLowerCase();
                    valueB = (b[this.currentSort] || '').toLowerCase();
            }

            const comparison = valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    updateSummary(filteredGroups) {
        const summary = document.getElementById('listSummary');
        const fpgCount = filteredGroups.filter(g => g.type.toLowerCase() === 'fpg').length;
        const uupgCount = filteredGroups.filter(g => g.type.toLowerCase() === 'uupg').length;

        summary.innerHTML = `
            <h3>List Summary</h3>
            <p>Total Groups: ${filteredGroups.length}</p>
            <ul>
                <li>${formatGroupType('FPG')}s: ${fpgCount}</li>
                <li>${formatGroupType('UUPG')}s: ${uupgCount}</li>
            </ul>
        `;
    }

    renderTable(groups) {
        const tbody = document.getElementById('top100Body');
        const tableContainer = document.querySelector('.table-container');
        const emptyState = document.getElementById('emptyState');

        if (groups.length === 0) {
            tableContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        tableContainer.style.display = 'block';
        emptyState.style.display = 'none';

        tbody.innerHTML = groups.map(group => `
            <tr>
                <td>${formatGroupType(group.type)}</td>
                <td>${group.name}</td>
                <td class="pronunciation-text">[${group.pronunciation || 'pronunciation pending'}]</td>
                <td class="play-button-cell">
                    <button class="play-button" 
                            title="Play pronunciation"
                            aria-label="Play pronunciation of ${group.name}"
                            onclick="event.preventDefault(); event.stopPropagation();"
                            ${!group.pronunciation ? 'disabled' : ''}>
                    </button>
                </td>
                <td>${parseInt(group.population).toLocaleString()}</td>
                <td>${group.country}</td>
                <td>${group.religion}</td>
                <td>${new Date(group.addedAt).toLocaleDateString()}</td>
                <td class="actions-cell">
                    <button class="delete-button" onclick="window.top100Page.deleteGroup('${group.id}')">
                        Remove
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateSortButtons() {
        document.querySelectorAll('.sort-controls button').forEach(button => {
            button.classList.toggle('active', button.dataset.sort === this.currentSort);
        });
    }

    async deleteGroup(id) {
        if (!confirm('Are you sure you want to remove this group from your Top 100 list?')) {
            return;
        }

        try {
            await firebaseService.removeFromTop100(id);
            this.groups = this.groups.filter(g => g.id !== id);
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to delete group:', error);
            alert('Failed to remove group. Please try again.');
        }
    }

    showLoading() {
        document.getElementById('loadingState').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
    }

    showError(message) {
        const errorHtml = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="window.location.reload()" class="button">Try Again</button>
            </div>
        `;
        document.querySelector('main').innerHTML = errorHtml;
    }
}

// Create and expose instance for event handlers
window.top100Page = new Top100Page(); 