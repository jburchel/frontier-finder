/**
 * Joshua Project Search functionality
 * Handles direct searches against the Joshua Project API
 */

// Configuration with API key
import { jpConfig } from './config.js';

const jpSearch = {
    /**
     * Initialize the Joshua Project search functionality
     */
    initialize: function() {
        // Get form elements
        this.pgNameInput = document.getElementById('pgNameSearch');
        this.countrySelect = document.getElementById('jpCountrySearch');
        this.jpScaleSelect = document.getElementById('jpScaleSearch');
        this.religionSelect = document.getElementById('religionSearch');
        this.searchButton = document.getElementById('jpSearchButton');
        
        // Populate country dropdown
        this.loadCountries();
        
        // Add event listeners
        if (this.searchButton) {
            this.searchButton.addEventListener('click', this.performSearch.bind(this));
        }
    },
    
    /**
     * Load countries from Joshua Project API
     */
    loadCountries: async function() {
        try {
            const response = await fetch(`https://api.joshuaproject.net/v1/countries.json?api_key=${jpConfig.apiKey}`);
            if (!response.ok) throw new Error('Failed to fetch countries');
            
            const countries = await response.json();
            
            // Sort countries alphabetically
            countries.sort((a, b) => a.name.localeCompare(b.name));
            
            // Add countries to dropdown
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.code;
                option.textContent = country.name;
                this.countrySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    },
    
    /**
     * Perform search against Joshua Project API
     */
    performSearch: async function() {
        try {
            // Show loading indicator
            this.searchButton.disabled = true;
            this.searchButton.textContent = 'Searching...';
            
            // Build query parameters
            const params = new URLSearchParams();
            params.append('api_key', jpConfig.apiKey);
            
            // Add search criteria if provided
            if (this.pgNameInput.value) {
                params.append('name', this.pgNameInput.value);
            }
            
            if (this.countrySelect.value) {
                params.append('countries', this.countrySelect.value);
            }
            
            if (this.jpScaleSelect.value) {
                params.append('progress_scale', this.jpScaleSelect.value);
            }
            
            if (this.religionSelect.value) {
                params.append('primary_religion', this.religionSelect.value);
            }
            
            // Make API request
            const response = await fetch(`https://api.joshuaproject.net/v1/people_groups.json?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch people groups');
            
            const peopleGroups = await response.json();
            
            // Store results in session storage
            sessionStorage.setItem('jpSearchResults', JSON.stringify(peopleGroups));
            
            // Redirect to results page
            window.location.href = 'results.html?source=jp';
        } catch (error) {
            console.error('Error performing search:', error);
            alert('An error occurred while searching. Please try again.');
        } finally {
            // Reset button
            this.searchButton.disabled = false;
            this.searchButton.textContent = 'Search Joshua Project';
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    jpSearch.initialize();
});

export { jpSearch };
