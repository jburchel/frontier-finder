/**
 * Local UUPG data handler
 * This file provides a fallback mechanism for UUPG searches when the Joshua Project API fails
 */

import { config } from './config.js';

class UUPGDataService {
    constructor() {
        this.uupgData = [];
        this.initialized = false;
    }

    /**
     * Initialize the service by loading UUPG data
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Load UUPGs from CSV file
            await this.loadUUPGsFromCSV();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize UUPG data service:', error);
            throw error;
        }
    }

    /**
     * Load UUPGs from CSV file
     */
    async loadUUPGsFromCSV() {
        try {
            const response = await fetch('data/uupgs.csv');
            if (!response.ok) {
                throw new Error(`Failed to load UUPG data: ${response.status}`);
            }

            const csvText = await response.text();
            const rows = csvText.trim().split('\n');
            const headers = rows[0].split(',').map(h => h.trim());

            // Find column indices
            const nameIndex = headers.indexOf('Name');
            const countryIndex = headers.indexOf('Country');
            const latIndex = headers.indexOf('Latitude');
            const lngIndex = headers.indexOf('Longitude');
            const popIndex = headers.indexOf('Population');
            const langIndex = headers.indexOf('Language');
            const relIndex = headers.indexOf('Religion');

            if (nameIndex === -1 || countryIndex === -1) {
                throw new Error('Required columns not found in CSV');
            }

            // Process UUPGs
            this.uupgData = [];
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;

                const columns = rows[i].split(',').map(c => c.trim());

                if (columns.length > Math.max(nameIndex, countryIndex)) {
                    const name = columns[nameIndex];
                    const country = columns[countryIndex];
                    const latitude = latIndex !== -1 ? parseFloat(columns[latIndex]) : null;
                    const longitude = lngIndex !== -1 ? parseFloat(columns[lngIndex]) : null;
                    const population = popIndex !== -1 ? parseInt(columns[popIndex]) : 0;
                    const language = langIndex !== -1 ? columns[langIndex] : 'Unknown';
                    const religion = relIndex !== -1 ? columns[relIndex] : 'Unknown';

                    if (name && country) {
                        this.uupgData.push({
                            name,
                            country,
                            latitude,
                            longitude,
                            population,
                            language,
                            religion,
                            evangelical: '0.0%', // UUPGs by definition
                            type: 'UUPG'
                        });
                    }
                }
            }

            console.log(`Loaded ${this.uupgData.length} UUPGs from CSV`);
        } catch (error) {
            console.error('Error loading UUPGs from CSV:', error);
            throw error;
        }
    }

    /**
     * Search for UUPGs near a location
     * @param {number} latitude - Center latitude
     * @param {number} longitude - Center longitude
     * @param {number} radius - Search radius
     * @param {string} units - Units (M for miles, K for kilometers)
     * @returns {Array} - Array of UUPGs
     */
    searchNearbyUUPGs(latitude, longitude, radius, units = 'M') {
        if (!this.initialized) {
            throw new Error('UUPG data service not initialized');
        }

        // Filter UUPGs by distance
        return this.uupgData
            .filter(uupg => {
                if (!uupg.latitude || !uupg.longitude) return false;

                // Calculate distance
                const distance = this.calculateDistance(
                    latitude,
                    longitude,
                    uupg.latitude,
                    uupg.longitude,
                    units
                );

                // Keep only results within radius
                const withinRadius = distance <= parseFloat(radius);
                if (withinRadius) {
                    uupg.distance = parseFloat(distance.toFixed(1));
                }
                return withinRadius;
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
}

// Create and export singleton instance
export const uupgDataService = new UUPGDataService();
export default uupgDataService;
