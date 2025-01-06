import { config } from './config.js';
import { jpApi } from './api.js';

/**
 * Search functionality for Frontier Finder
 */
class SearchService {
    constructor() {
        this.currentUPGs = null;
        this.uupgs = null;
    }

    /**
     * Load and parse CSV data
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<Array>} - Parsed CSV data
     */
    async loadCSV(filePath) {
        try {
            const response = await fetch(filePath);
            const csvText = await response.text();
            
            // Parse CSV (skip header row)
            const rows = csvText.split('\n').slice(1);
            return rows
                .filter(row => row.trim())
                .map(row => {
                    const [name, country, pronunciation, latitude, longitude, 
                          population, evangelical, language, religion, description] = row.split(',');
                    return {
                        name: name.trim(),
                        country: country.trim(),
                        pronunciation: pronunciation.trim(),
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude),
                        population: parseInt(population, 10),
                        evangelical: parseFloat(evangelical),
                        language: language.trim(),
                        religion: religion.trim(),
                        description: description?.trim()
                    };
                });
        } catch (error) {
            console.error(`Failed to load CSV from ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Initialize by loading local data
     */
    async initialize() {
        try {
            // Load both CSV files concurrently
            [this.currentUPGs, this.uupgs] = await Promise.all([
                this.loadCSV(config.dataFiles.currentUPGs),
                this.loadCSV(config.dataFiles.uupgs)
            ]);
            console.log('Search service initialized with local data');
        } catch (error) {
            console.error('Failed to initialize search service:', error);
            throw error;
        }
    }

    /**
     * Find a UPG by country and name
     * @param {string} country 
     * @param {string} upgName 
     * @returns {Object|null}
     */
    findUPG(country, upgName) {
        return this.currentUPGs?.find(upg => 
            upg.country === country && upg.name === upgName
        ) || null;
    }

    /**
     * Search for nearby people groups
     * @param {Object} params - Search parameters
     * @returns {Promise<Object>} - Search results
     */
    async searchNearby({ country, upgName, radius, units, type }) {
        try {
            // Find the base UPG
            const baseUPG = this.findUPG(country, upgName);
            if (!baseUPG) {
                throw new Error('Selected UPG not found');
            }

            // Get nearby people groups from Joshua Project API
            const apiResults = await jpApi.searchPeopleGroups({
                latitude: baseUPG.latitude,
                longitude: baseUPG.longitude,
                radius,
                units
            });

            // Filter results based on search type
            let results = [];
            if (type === 'fpg' || type === 'both') {
                results.push(...this.filterFPGs(apiResults.data));
            }
            if (type === 'uupg' || type === 'both') {
                results.push(...this.filterUUPGs(apiResults.data));
            }

            return {
                baseUPG,
                results,
                totalFound: results.length
            };

        } catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    }

    /**
     * Filter for Frontier People Groups
     * @param {Array} groups - People groups to filter
     * @returns {Array} - Filtered FPGs
     */
    filterFPGs(groups) {
        return groups.filter(group => 
            parseFloat(group.PercentEvangelical) < 0.1
        );
    }

    /**
     * Filter for UUPGs using local data
     * @param {Array} groups - People groups to filter
     * @returns {Array} - Filtered UUPGs
     */
    filterUUPGs(groups) {
        const uupgIds = new Set(this.uupgs.map(u => u.id));
        return groups.filter(group => uupgIds.has(group.PeopleID3));
    }
}

// Create and export search service instance
export const searchService = new SearchService();
export default searchService;
