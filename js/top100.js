import { firebaseService } from './firebase.js';
import { formatGroupType } from './utils.js';
import { speechService } from './services/speechService.js';
import { pronunciationService } from './services/pronunciationService.js';

class Top100Page {
    constructor() {
        this.groups = [];
        this.currentFilter = 'all';
        this.currentSort = 'addedAt';
        this.sortDirection = 'desc';
        this.firebaseService = firebaseService;
        this.initialize();
    }

    async initialize() {
        try {
            this.showLoading();
            await this.firebaseService.initialize();
            await this.loadGroups();
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to initialize Top 100 page:', error);
            this.showError('Failed to load Top 100 list. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async loadGroups() {
        try {
            this.groups = await this.firebaseService.getTop100();
            this.groups = this.groups.filter(group => group && group.name);
            this.updateSortButtons();
        } catch (error) {
            console.error('Failed to load groups:', error);
            this.showError('Failed to load groups. Please try again.');
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
        const tableBody = document.getElementById('top100TableBody');
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }
        tableBody.innerHTML = '';

        if (!this.groups || this.groups.length === 0) {
            document.querySelector('main').innerHTML = `
                <div class="empty-state">
                    <p>Your Top 100 list is empty.</p>
                    <p>Add items from the search results page.</p>
                </div>
            `;
            return;
        }

        // Sort the groups before displaying
        this.sortGroups();

        this.groups.forEach(group => {
            const row = this.createTableRow(group);
            tableBody.appendChild(row);
        });
        this.updateListSummary();
    }

    filterGroups() {
        if (this.currentFilter === 'all') return [...this.groups];
        return this.groups.filter(group => group.type === this.currentFilter);
    }

    sortGroups() {
        this.groups.sort((a, b) => {
            const aValue = a[this.currentSort];
            const bValue = b[this.currentSort];

            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return this.sortDirection === 'asc' ? -1 : 1;
            if (bValue == null) return this.sortDirection === 'asc' ? 1 : -1;

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            const aString = String(aValue).toLowerCase();
            const bString = String(bValue).toLowerCase();

            if (aString < bString) return this.sortDirection === 'asc' ? -1 : 1;
            if (aString > bString) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    handleSort(sortBy) {
        if (this.currentSort === sortBy) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort = sortBy;
            this.sortDirection = 'asc';
        }
        this.updateSortButtons();
        this.updateDisplay();
    }

    updateSortButtons() {
        document.querySelectorAll('.sort-controls button').forEach(button => {
            button.classList.toggle('active', button.dataset.sort === this.currentSort);
            if (button.dataset.sort === this.currentSort) {
                button.innerHTML = button.dataset.label + (this.sortDirection === 'asc' ? ' &#9650;' : ' &#9660;');
            } else {
                button.innerHTML = button.dataset.label;
            }
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
        const tableBody = document.getElementById('top100TableBody');
        const emptyState = document.getElementById('emptyState');

        if (groups.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        tableBody.innerHTML = groups.map(group => `
            <tr>
                <td>${formatGroupType(group.type)}</td>
                <td>${group.name}</td>
                <td class="pronunciation-text">[${group.pronunciation || 'pronunciation pending'}]</td>
                <td class="play-button-cell">
                    <button class="play-button" 
                            title="Play pronunciation"
                            aria-label="Play pronunciation of ${group.name}"
                            data-text="${group.name}"
                            ${!group.pronunciation ? 'disabled' : ''}>
                    </button>
                </td>
                <td>${parseInt(group.population).toLocaleString()}</td>
                <td>${group.country}</td>
                <td>${group.religion || 'Islam'}</td>
                <td class="actions-cell">
                    <button class="delete-button" data-id="${group.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Add event listeners for play buttons
        tableBody.querySelectorAll('.play-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const text = button.getAttribute('data-text');
                await pronunciationService.speakPronunciation(text);
            });
        });

        // Add event listeners for delete buttons
        tableBody.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                this.deleteGroup(id);
            });
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