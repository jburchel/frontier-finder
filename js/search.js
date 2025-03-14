import { config } from './config.js';
import { jpApi } from './api.js';
import { pronunciationService } from './services/pronunciationService.js';

/**
 * Search functionality for Frontier Finder
 */
class SearchService {
    constructor() {
        this.currentUPGs = null;
        this.initialized = false;
        this.jpApi = jpApi; // Store API instance
        this.pronunciationMap = null; // Cache pronunciations
    }

    /**
     * Load and parse CSV data
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<Array>} - Parsed CSV data
     */
    async loadCSV(filePath) {
        try {
            console.log(`Attempting to load UPG CSV from:`, filePath);
            
            // Add a timestamp to prevent caching
            const url = `${filePath}?t=${Date.now()}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error(`Failed to load UPG CSV:`, {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                });
                throw new Error(`HTTP error! status: ${response.status} loading ${filePath}`);
            }
            
            const csvText = await response.text();
            
            if (!csvText) {
                throw new Error(`Empty response loading ${filePath}`);
            }
            
            console.log(`CSV loaded from ${filePath}:`, {
                length: csvText.length,
                preview: csvText.substring(0, 100)
            });
            
            // Parse CSV
            const rows = csvText.split('\n');
            const headers = rows[0].split(',').map(h => h.trim());
            
            console.log(`UPG CSV Headers:`, headers);
            
            return rows.slice(1) // Skip header row
                .filter(row => row.trim()) // Remove empty rows
                .map((row, index) => {
                    const values = row.split(',').map(val => val.trim());
                    const item = {};
                    
                    // UPG CSV format (current_upgs.csv)
                    // Assuming the structure: name,country,pronunciation,latitude,longitude,...
                    item.name = values[0];
                    item.country = values[1];
                    item.pronunciation = values[2];
                    item.latitude = parseFloat(values[3]) || null;
                    item.longitude = parseFloat(values[4]) || null;
                    item.population = values[5] ? parseInt(values[5].replace(/[^\d]/g, '')) || 0 : 0;
                    item.evangelical = values[6];
                    item.language = values[7];
                    item.religion = values[8];
                    item.description = values[9];
                    
                    return item;
                });
        } catch (error) {
            console.error(`Error loading CSV from ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Initialize the search service
     */
    async initialize() {
        try {
            console.log('Initializing search service...');
            
            // Load current UPGs
            this.currentUPGs = await this.loadCSV('data/current_upgs.csv');
            console.log('Loaded current UPGs:', this.currentUPGs.length);
            
            // Load pronunciations
            try {
                const response = await fetch('js/data/pronunciations.json');
                if (response.ok) {
                    this.pronunciationMap = await response.json();
                    console.log('Loaded pronunciations:', Object.keys(this.pronunciationMap).length);
                }
            } catch (e) {
                console.warn('Failed to load pronunciations:', e);
                this.pronunciationMap = {};
            }
            
            this.initialized = true;
            console.log('Search service initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize search service:', error);
            throw error;
        }
    }

    /**
     * Find a UPG by country and name
     */
    findUPG(country, upgName) {
        if (!this.currentUPGs) return null;
        
        return this.currentUPGs.find(upg => 
            upg.country === country && 
            upg.name === upgName
        );
    }

    /**
     * Search for nearby people groups
     * @param {Object} baseUPG - The base UPG to search from
     * @param {number} radius - Search radius
     * @param {string} units - Units (M for miles, K for kilometers)
     * @returns {Promise<Array>} - Array of nearby people groups
     */
    async searchNearby(baseUPG, radius, units = 'M') {
        console.log('Searching for FPGs near:', baseUPG, 'with radius:', radius, units);
        
        if (!baseUPG || !baseUPG.latitude || !baseUPG.longitude) {
            console.error('Invalid base UPG or missing coordinates:', baseUPG);
            throw new Error('Invalid base UPG or missing coordinates');
        }
        
        try {
            // Search for FPGs using Joshua Project API
            const fpgResults = await this.jpApi.searchNearbyFPGs(
                baseUPG.latitude, 
                baseUPG.longitude, 
                radius, 
                units
            );
            
            console.log('FPG search results:', fpgResults.length);
            
            // Filter and process FPG results
            const filteredFPGs = this.filterFPGs(fpgResults);
            
            // Add distance to each result
            const resultsWithDistance = filteredFPGs.map(group => {
                const distance = this.calculateDistance(
                    baseUPG.latitude, 
                    baseUPG.longitude, 
                    group.latitude, 
                    group.longitude, 
                    units
                );
                
                return {
                    ...group,
                    distance: parseFloat(distance.toFixed(1)),
                    type: 'FPG'
                };
            });
            
            // Sort by distance
            return resultsWithDistance.sort((a, b) => a.distance - b.distance);
            
        } catch (error) {
            console.error('Error searching nearby people groups:', error);
            throw error;
        }
    }

    /**
     * Filter FPG results to ensure they meet criteria
     */
    filterFPGs(groups) {
        return groups.filter(group => {
            // Ensure it has coordinates
            if (!group.latitude || !group.longitude) return false;
            
            // Ensure it's a valid FPG (Frontier field is 'Y')
            return group.Frontier === 'Y';
        });
    }

    /**
     * Calculate distance between two points
     * @param {number} lat1 - Latitude of point 1
     * @param {number} lon1 - Longitude of point 1
     * @param {number} lat2 - Latitude of point 2
     * @param {number} lon2 - Longitude of point 2
     * @param {string} unit - Unit (M for miles, K for kilometers)
     * @returns {number} - Distance in specified units
     */
    calculateDistance(lat1, lon1, lat2, lon2, unit = 'M') {
        if ((lat1 === lat2) && (lon1 === lon2)) {
            return 0;
        }
        
        const radlat1 = Math.PI * lat1 / 180;
        const radlat2 = Math.PI * lat2 / 180;
        const theta = lon1 - lon2;
        const radtheta = Math.PI * theta / 180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        
        if (dist > 1) {
            dist = 1;
        }
        
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515; // Distance in miles
        
        if (unit === 'K') {
            dist = dist * 1.609344; // Convert to kilometers
        }
        
        return dist;
    }

    /**
     * Get list of countries from current UPGs
     */
    async getCountries() {
        if (!this.currentUPGs) {
            await this.initialize();
        }
        
        const countries = [...new Set(this.currentUPGs.map(upg => upg.country))];
        return countries.sort();
    }

    /**
     * Generate pronunciation for a name
     */
    async generatePronunciation(name) {
        if (this.pronunciationMap && this.pronunciationMap[name]) {
            return this.pronunciationMap[name];
        }
        
        return await pronunciationService.generatePronunciation(name);
    }

    /**
     * Get available countries
     */
    async getAvailableCountries() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        return this.getCountries();
    }
}

// Create and export singleton instance
export const searchService = new SearchService();
