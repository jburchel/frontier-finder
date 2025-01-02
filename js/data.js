// Import config
import { config } from './config.js';

// Constants for data paths and configuration
const BASE_PATH = window.location.hostname === 'localhost' ? '' : '/frontier-finder';
const DATA_PATHS = {
    UUPG: './data/updated_uupg.csv',
    EXISTING_UPGS: './data/existing_upgs_updated.csv'
};

// Cache for loaded data
const dataCache = {
    uupg: null,
    existingUpgs: null,
    lastFetch: null
};

// Load data from CSV files
let existingUpgData = []; // For dropdown data
let uupgData = []; // For search data

// Joshua Project API configuration
const JP_API = {
    BASE_URL: 'https://joshuaproject.net/api/v2',
    KEY: config.JP_API_KEY
};

// Constants for search types
const SEARCH_TYPES = {
    FPG: 'fpg',
    UUPG: 'uupg',
    BOTH: 'both'
};

// Function to parse CSV line
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
}

// Function to validate coordinates
function validateCoordinates(lat, lon) {
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    
    if (isNaN(lat) || isNaN(lon)) return null;
    if (lat < -90 || lat > 90) return null;
    if (lon < -180 || lon > 180) return null;
    
    return { lat, lon };
}

// Function to load all data
async function loadAllData() {
    try {
        const [uupgs, existingUpgs] = await Promise.all([
            loadUUPGData(),
            loadExistingUPGs()
        ]);
        
        uupgData = uupgs;
        existingUpgData = existingUpgs;
        
        return { uupgs, existingUpgs };
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Initialize the UI
async function initializeUI() {
    try {
        await loadAllData();
        await initializeCountryDropdown();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing UI:', error);
        throw error;
    }
}

// Function to initialize country dropdown
async function initializeCountryDropdown() {
    try {
        const countryDropdown = document.getElementById('country');
        console.log('Initializing country dropdown...');

        if (!countryDropdown) {
            console.error('Country dropdown element not found');
            return;
        }

        // Load data if not already loaded
        if (existingUpgData.length === 0) {
            console.log('Loading UPG data...');
            existingUpgData = await loadExistingUPGs();
            console.log(`Loaded ${existingUpgData.length} UPGs`);
        }

        // Get unique countries
        const countries = [...new Set(existingUpgData.map(upg => upg.country))]
            .filter(Boolean)
            .sort();
        console.log(`Found ${countries.length} unique countries`);

        // Clear existing options
        countryDropdown.innerHTML = '<option value="">Select a country</option>';

        // Add country options
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryDropdown.appendChild(option);
        });

        console.log('Country dropdown populated successfully');
    } catch (error) {
        console.error('Error initializing country dropdown:', error);
        console.error('Error details:', error.stack);
    }
}

// Function to load existing UPGs data
async function loadExistingUPGs() {
    try {
        // Check cache with 5-minute expiration
        const now = Date.now();
        if (dataCache.existingUpgs && dataCache.lastFetch && (now - dataCache.lastFetch < 300000)) {
            return dataCache.existingUpgs;
        }

        const response = await fetch(DATA_PATHS.EXISTING_UPGS);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        if (!csvText.trim()) {
            throw new Error('CSV file is empty');
        }

        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]);

        const upgs = [];
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                if (!row.name || !row.country) {
                    console.warn(`Skipping row ${i + 1}: Missing name or country`);
                    continue;
                }

                upgs.push({
                    name: row.name,
                    country: row.country,
                    latitude: parseFloat(row.latitude) || 0,
                    longitude: parseFloat(row.longitude) || 0,
                    pronunciation: row.pronunciation || ''
                });
            } catch (error) {
                console.warn(`Error processing row ${i + 1}:`, error);
            }
        }

        dataCache.existingUpgs = upgs;
        dataCache.lastFetch = now;
        return upgs;
    } catch (error) {
        console.error('Error loading existing UPGs:', error);
        throw error;
    }
}

// Function to load UUPG data
async function loadUUPGData() {
    try {
        // Check cache
        if (dataCache.uupg) {
            return dataCache.uupg;
        }

        const response = await fetch(DATA_PATHS.UUPG);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        if (!csvText.trim()) {
            throw new Error('UUPG CSV file is empty');
        }

        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]);

        const uupgs = [];
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                uupgs.push(row);
            } catch (error) {
                console.warn(`Error processing UUPG row ${i + 1}:`, error);
            }
        }

        dataCache.uupg = uupgs;
        return uupgs;
    } catch (error) {
        console.error('Error loading UUPG data:', error);
        throw error;
    }
}

// Function to search nearby UPGs
async function searchNearby(country, selectedUpg, radius, units = 'kilometers', type = 'both') {
    try {
        // Load data if not already loaded
        if (existingUpgData.length === 0) {
            await loadAllData();
        }

        // Find the selected UPG's coordinates
        const sourceUpg = existingUpgData.find(upg => 
            upg.country === country && upg.name === selectedUpg
        );

        if (!sourceUpg) {
            throw new Error('Selected UPG not found');
        }

        let results = [];
        
        // Search for UUPGs if requested
        if (type === SEARCH_TYPES.UUPG || type === SEARCH_TYPES.BOTH) {
            const uupgResults = uupgData.map(uupg => {
                const distance = calculateDistance(
                    sourceUpg.latitude,
                    sourceUpg.longitude,
                    parseFloat(uupg.Latitude) || 0,
                    parseFloat(uupg.Longitude) || 0,
                    units
                );
                return {
                    ...uupg,
                    distance,
                    units,
                    type: 'UUPG'
                };
            }).filter(result => result.distance <= radius);
            
            results = [...results, ...uupgResults];
        }
        
        // Search for FPGs if requested
        if (type === SEARCH_TYPES.FPG || type === SEARCH_TYPES.BOTH) {
            const fpgResults = await searchJoshuaProject(
                sourceUpg.latitude,
                sourceUpg.longitude,
                radius,
                units
            );
            
            results = [...results, ...fpgResults];
        }

        // Filter by radius and sort by distance
        return results.sort((a, b) => a.distance - b.distance);
    } catch (error) {
        console.error('Error in searchNearby:', error);
        throw error;
    }
}

// Helper function to calculate distance between coordinates
function calculateDistance(lat1, lon1, lat2, lon2, units = 'kilometers') {
    const R = units === 'miles' ? 3959 : 6371; // Earth's radius in miles or km
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Helper function to convert degrees to radians
function toRad(degrees) {
    return degrees * Math.PI / 180;
}

// Function to setup event listeners
function setupEventListeners() {
    const countryDropdown = document.getElementById('country');
    const upgDropdown = document.getElementById('upg');

    if (countryDropdown) {
        countryDropdown.addEventListener('change', async function() {
            const selectedCountry = this.value;
            
            // Clear and disable UPG dropdown
            upgDropdown.innerHTML = '<option value="">Select a UPG</option>';
            upgDropdown.disabled = true;

            if (!selectedCountry) return;

            try {
                // Get UPGs for selected country
                const upgsInCountry = existingUpgData
                    .filter(upg => upg.country === selectedCountry)
                    .sort((a, b) => a.name.localeCompare(b.name));

                // Populate UPG dropdown
                upgsInCountry.forEach(upg => {
                    const option = document.createElement('option');
                    option.value = upg.name;
                    option.textContent = upg.name;
                    upgDropdown.appendChild(option);
                });

                // Enable UPG dropdown if we have options
                upgDropdown.disabled = upgsInCountry.length === 0;
            } catch (error) {
                console.error('Error updating UPG dropdown:', error);
            }
        });
    }
}

// Function to search Joshua Project API for FPGs
async function searchJoshuaProject(lat, lon, radius, units) {
    try {
        const url = new URL(`${JP_API.BASE_URL}/people_groups`);
        url.searchParams.append('api_key', JP_API.KEY);
        url.searchParams.append('lat', lat);
        url.searchParams.append('lon', lon);
        url.searchParams.append('rad', radius);
        url.searchParams.append('IsFPG', 'true');
        url.searchParams.append('fields', 'PeopleID3|PeopleName|Latitude|Longitude|Population|PrimaryReligion|JPScale');
        url.searchParams.append('limit', '100');
        
        console.log('Fetching from Joshua Project:', url.toString());
        
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Joshua Project API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Joshua Project response:', data);
        
        if (!data || !data.data) {
            console.warn('No data returned from Joshua Project API');
            return [];
        }
        
        return data.data.map(fpg => ({
            ...fpg,
            distance: calculateDistance(lat, lon, fpg.Latitude, fpg.Longitude, units),
            units,
            type: 'FPG'
        }));
    } catch (error) {
        console.error('Error fetching from Joshua Project:', error);
        console.error('Error details:', error.message);
        return [];
    }
}

// Export necessary functions
export {
    initializeUI,
    loadAllData,
    loadExistingUPGs,
    loadUUPGData,
    validateCoordinates,
    parseCSVLine,
    searchNearby
};