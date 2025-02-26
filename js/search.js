import { config } from './config.js';
import { jpApi } from './api.js';
import { pronunciationService } from './services/pronunciationService.js';

/**
 * Search functionality for Frontier Finder
 */
class SearchService {
    constructor() {
        this.currentUPGs = null;
        this.uupgs = null;
        this.initialized = false;
        this.jpApi = jpApi; // Store API instance
        this.pronunciationMap = null; // Cache pronunciations
    }

    /**
     * Load and parse CSV data
     * @param {string} filePath - Path to CSV file
     * @param {string} type - Type of CSV ('upg' or 'uupg')
     * @returns {Promise<Array>} - Parsed CSV data
     */
    async loadCSV(filePath, type = 'uupg') {
        try {
            console.log(`Attempting to load ${type} CSV from:`, filePath);
            
            // Add a timestamp to prevent caching
            const url = `${filePath}?t=${Date.now()}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error(`Failed to load ${type} CSV:`, {
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
            
            console.log(`${type.toUpperCase()} CSV Headers:`, headers);
            
            return rows.slice(1) // Skip header row
                .filter(row => row.trim()) // Remove empty rows
                .map((row, index) => {
                    const values = row.split(',').map(val => val.trim());
                    const item = {};
                    
                    if (type === 'uupg') {
                        // UUPG CSV format
                        headers.forEach((header, i) => {
                            let value = values[i] || '';
                            
                            switch(header) {
                                case 'PeopleName':
                                    item.name = value;
                                    break;
                                case 'Country':
                                    item.country = value;
                                    break;
                                case 'Population':
                                    item.population = parseInt(value.replace(/[^\d]/g, '')) || 0;
                                    break;
                                case 'Language':
                                    item.language = value;
                                    break;
                                case 'Religion':
                                    item.religion = value;
                                    break;
                                case 'Latitude':
                                    item.latitude = parseFloat(value) || null;
                                    break;
                                case 'Longitude':
                                    item.longitude = parseFloat(value) || null;
                                    break;
                            }
                        });
                    } else {
                        // UPG CSV format (current_upgs.csv)
                        // Assuming the structure: name,country,pronunciation,latitude,longitude,...
                        item.name = values[0];
                        item.country = values[1];
                        item.pronunciation = values[2];
                        item.latitude = parseFloat(values[3]) || null;
                        item.longitude = parseFloat(values[4]) || null;
                        item.population = parseInt(values[5]?.replace(/[^\d]/g, '')) || 0;
                        item.evangelical = parseFloat(values[6]) || 0;
                        item.language = values[7];
                        item.religion = values[8];
                        item.description = values[9];
                    }

                    // Validate coordinates
                    if (item.latitude !== null && (item.latitude < -90 || item.latitude > 90)) {
                        console.warn(`Invalid latitude value in row ${index + 2}`);
                        item.latitude = null;
                    }
                    if (item.longitude !== null && (item.longitude < -180 || item.longitude > 180)) {
                        console.warn(`Invalid longitude value in row ${index + 2}`);
                        item.longitude = null;
                    }
                    
                    return item;
                })
                .filter(item => {
                    const isValid = item.latitude !== null && 
                                  item.longitude !== null && 
                                  !isNaN(item.latitude) && 
                                  !isNaN(item.longitude);
                                  
                    if (!isValid) {
                        console.warn('Filtering out item with invalid coordinates:', {
                            name: item.name,
                            latitude: item.latitude,
                            longitude: item.longitude
                        });
                    }
                    return isValid;
                });
                
        } catch (error) {
            console.error(`Failed to load ${type} CSV from ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Initialize by loading local data
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing search service...');
            
            // Load current UPGs first - we need this for the dropdown
            console.log('Loading current UPGs from:', config.dataFiles.currentUPGs);
            this.currentUPGs = await this.loadCSV(config.dataFiles.currentUPGs, 'upg');
            
            // Add UUPG data loading
            console.log('Loading UUPGs from:', config.dataFiles.uupgs);
            this.uupgs = await this.loadCSV(config.dataFiles.uupgs, 'uupg');
            
            if (!this.currentUPGs?.length) {
                throw new Error('Failed to load UPG data');
            }
            
            if (!this.uupgs?.length) {
                console.warn('No UUPG data loaded');
            } else {
                console.log('UUPGs loaded:', this.uupgs.length);
            }
            
            console.log('Current UPGs loaded:', this.currentUPGs.length);
            this.initialized = true;
            
            // Load pronunciations during initialization
            const { pronunciationMap } = await import('./data/pronunciations.js');
            this.pronunciationMap = pronunciationMap;
            console.log('Search service initialized with pronunciations');
            
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
    async searchNearby(baseUPG, radius, units = 'M', type = 'fpg') {
        try {
            console.log('Search params:', { baseUPG, radius, units, type });
            let results = [];

            // Search FPGs if type is 'fpg' or 'both'
            if (type === 'fpg' || type === 'both') {
                try {
                    const fpgResults = await this.jpApi.searchPeopleGroups({
                        latitude: baseUPG.latitude,
                        longitude: baseUPG.longitude,
                        radius,
                        units
                    });
                    results = results.concat(fpgResults);
                } catch (error) {
                    console.error('FPG search failed:', error);
                    if (type === 'fpg') throw error;
                }
            }

            // Search UUPGs if type is 'uupg' or 'both'
            if (type === 'uupg' || type === 'both') {
                try {
                    const uupgResults = await this.searchLocalUUPGs(baseUPG, radius, units);
                    results = results.concat(uupgResults);
                } catch (error) {
                    console.error('UUPG search failed:', error);
                    if (type === 'uupg') throw error;
                }
            }

            // Sort results by distance
            results.sort((a, b) => {
                const distA = parseFloat(a.distance);
                const distB = parseFloat(b.distance);
                return distA - distB;
            });

            // Add pronunciations to results
            results = await Promise.all(results.map(async result => {
                const pronunciation = await this.generatePronunciation(result.name);
                return {
                    ...result,
                    pronunciation: pronunciation || 'pronunciation pending'
                };
            }));

            console.log(`Found ${results.length} results with pronunciations`);
            return results;
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
        return groups
            .filter(group => parseFloat(group.PercentEvangelical) < 0.1)
            .map(group => ({
                ...group,
                type: 'FPG'
            }));
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

    /**
     * Search UUPGs using local CSV data
     * @param {Object} baseUPG - The reference UPG
     * @param {number} radius - Search radius
     * @param {string} units - Distance units (M/K)
     * @returns {Array} - Matching UUPGs
     */
    searchLocalUUPGs(baseUPG, radius, units) {
        console.log('Searching local UUPGs with params:', { 
            baseUPG, 
            radius, 
            units,
            availableUUPGs: this.uupgs?.length || 0 
        });
        
        if (!this.uupgs || !this.uupgs.length) {
            console.warn('No UUPG data available');
            return [];
        }

        const results = this.uupgs
            .filter(uupg => {
                try {
                    // Add debug logging
                    console.log('Processing UUPG:', {
                        name: uupg.name,
                        coords: {
                            lat: uupg.latitude,
                            lon: uupg.longitude
                        }
                    });

                    // Skip invalid coordinates
                    if (!uupg.latitude || !uupg.longitude || 
                        isNaN(uupg.latitude) || isNaN(uupg.longitude)) {
                        console.warn(`Invalid coordinates for UUPG: ${uupg.name}`);
                        return false;
                    }

                    const distance = this.calculateDistance(
                        baseUPG.latitude,
                        baseUPG.longitude,
                        parseFloat(uupg.latitude),
                        parseFloat(uupg.longitude),
                        units
                    );

                    // Add distance to UUPG object
                    uupg.distance = distance;
                    
                    const withinRadius = distance <= parseFloat(radius);
                    console.log(`UUPG ${uupg.name}: distance=${distance}, withinRadius=${withinRadius}`);
                    
                    return withinRadius;
                } catch (error) {
                    console.error(`Error processing UUPG ${uupg.name}:`, error);
                    return false;
                }
            })
            .map(uupg => ({
                type: 'UUPG',
                name: uupg.name,
                population: uupg.population,
                country: uupg.country,
                religion: uupg.religion,
                language: uupg.language,
                distance: `${uupg.distance} ${units}`
            }));

        console.log(`Found ${results.length} UUPGs within ${radius} ${units}`);
        return results;
    }

    /**
     * Calculate distance between two points
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @param {string} unit - Unit of measurement (M/K)
     * @returns {number} - Distance in specified units
     */
    calculateDistance(lat1, lon1, lat2, lon2, unit = 'M') {
        if ((lat1 === lat2) && (lon1 === lon2)) {
            return 0;
        }

        // Convert coordinates to numbers and handle invalid values
        lat1 = parseFloat(lat1) || 0;
        lon1 = parseFloat(lon1) || 0;
        lat2 = parseFloat(lat2) || 0;
        lon2 = parseFloat(lon2) || 0;

        const radlat1 = Math.PI * lat1/180;
        const radlat2 = Math.PI * lat2/180;
        const theta = lon1-lon2;
        const radtheta = Math.PI * theta/180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + 
                   Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(Math.min(1, Math.max(-1, dist))); // Ensure value is within valid range
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515; // Distance in miles
        
        if (unit === "K") { dist = dist * 1.609344; } // Convert to kilometers
        return Math.round(dist);
    }

    async getCountries() {
        if (!this.currentUPGs) {
            throw new Error('UPG data not loaded');
        }
        
        // Get unique countries
        const countries = [...new Set(this.currentUPGs.map(upg => upg.country))]
            .filter(Boolean) // Remove empty/null values
            .sort();
            
        console.log('Available countries:', countries.length);
        return countries;
    }

    async generatePronunciation(name) {
        // First check if we have a manual pronunciation
        if (this.pronunciationMap && this.pronunciationMap[name]) {
            return this.pronunciationMap[name];
        }

        // Generate pronunciation if we don't have one
        return pronunciationService.generatePronunciation(name);
    }

    async getAvailableCountries() {
        // Wait for data to be loaded if it hasn't been yet
        if (!this.currentUPGs) {
            console.log('Loading UPGs before getting countries...');
            await this.loadCurrentUPGs();
        }

        // Get unique countries from currentUPGs
        const countries = [...new Set(this.currentUPGs.map(upg => upg.country))]
            .filter(Boolean) // Remove any null/undefined values
            .sort(); // Sort alphabetically

        console.log('Available countries:', countries);
        return countries;
    }
}

// Create and export search service instance
export const searchService = new SearchService();
export default searchService;
