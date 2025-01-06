import { firebaseService } from './firebase.js';

/**
 * Results page handling
 */
class ResultsPage {
    constructor() {
        // Get elements
        this.uupgList = document.getElementById('uupgList');
        this.fpgList = document.getElementById('fpgList');
        this.searchParams = document.getElementById('searchParams');
        this.sortOptions = document.getElementById('sortOptions');
        this.saveButton = document.getElementById('saveSelected');

        // Get search results from session storage
        this.results = JSON.parse(sessionStorage.getItem('searchResults') || '{}');
        
        this.initialize();
    }

    /**
     * Initialize the results page
     */
    initialize() {
        // Display search parameters
        this.displaySearchParams();
        
        // Display results
        this.displayResults();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Display search parameters
     */
    displaySearchParams() {
        if (!this.searchParams || !this.results.params) return;

        const { country, upgName, radius, units, type } = this.results.params;
        this.searchParams.innerHTML = `
            <p><strong>Base UPG:</strong> ${upgName} (${country})</p>
            <p><strong>Search Radius:</strong> ${radius} ${units}</p>
            <p><strong>Search Type:</strong> ${type.toUpperCase()}</p>
        `;
    }

    /**
     * Display search results
     */
    displayResults() {
        if (!this.results.data) return;

        // Display UUPGs
        if (this.uupgList && (this.results.params.type === 'uupg' || this.results.params.type === 'both')) {
            const uupgs = this.results.data.filter(group => group.IsUUPG);
            this.displayPeopleGroups(this.uupgList, uupgs);
        }

        // Display FPGs
        if (this.fpgList && (this.results.params.type === 'fpg' || this.results.params.type === 'both')) {
            const fpgs = this.results.data.filter(group => !group.IsUUPG);
            this.displayPeopleGroups(this.fpgList, fpgs);
        }
    }

    /**
     * Display people groups in container
     */
    displayPeopleGroups(container, groups) {
        container.innerHTML = groups.map(group => `
            <div class="result-card">
                <input type="checkbox" class="select-group" data-id="${group.PeopleID3}">
                <div class="card-content">
                    <h3>${group.PeopNameInCountry}</h3>
                    <p><strong>Population:</strong> ${group.Population.toLocaleString()}</p>
                    <p><strong>Evangelical:</strong> ${group.PercentEvangelical}%</p>
                    <p><strong>Primary Religion:</strong> ${group.PrimaryReligion}</p>
                    <p><strong>Primary Language:</strong> ${group.PrimaryLanguageName}</p>
                    <p><strong>Distance:</strong> ${group.Distance.toFixed(1)} ${this.results.params.units}</p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sort buttons
        this.sortOptions?.addEventListener('click', (e) => {
            const button = e.target.closest('.sort-button');
            if (button) {
                this.sortResults(button.dataset.sort);
            }
        });

        // Save selected button
        this.saveButton?.addEventListener('click', () => this.saveSelectedGroups());
    }

    /**
     * Sort results by criteria
     */
    sortResults(criteria) {
        if (!this.results.data) return;

        const sortFunctions = {
            distance: (a, b) => a.Distance - b.Distance,
            country: (a, b) => a.Country.localeCompare(b.Country),
            population: (a, b) => b.Population - a.Population,
            language: (a, b) => a.PrimaryLanguageName.localeCompare(b.PrimaryLanguageName),
            religion: (a, b) => a.PrimaryReligion.localeCompare(b.PrimaryReligion)
        };

        this.results.data.sort(sortFunctions[criteria]);
        this.displayResults();
    }

    /**
     * Save selected groups to Top 100
     */
    async saveSelectedGroups() {
        try {
            const selected = document.querySelectorAll('.select-group:checked');
            if (!selected.length) {
                alert('Please select at least one people group');
                return;
            }

            const selectedGroups = Array.from(selected).map(checkbox => {
                const id = checkbox.dataset.id;
                return this.results.data.find(group => group.PeopleID3 === id);
            });

            for (const group of selectedGroups) {
                await firebaseService.addToTop100(group);
            }

            window.location.href = 'top100.html';
        } catch (error) {
            console.error('Failed to save selected groups:', error);
            alert('Failed to save selected groups: ' + error.message);
        }
    }
}

// Initialize page
const resultsPage = new ResultsPage();
export default resultsPage; 