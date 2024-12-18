// Import config
import { config } from './config.js';

// Constants for data paths and configuration
const BASE_PATH = window.location.hostname === 'localhost' ? '' : '/frontier-finder';
const DATA_PATHS = {
    UUPG: `${BASE_PATH}/data/updated_uupg.csv`,
    EXISTING_UPGS: `${BASE_PATH}/data/existing_upgs_updated.csv`
};

const REQUIRED_FIELDS = {
    UUPG: ['PeopleName', 'Country', 'Latitude', 'Longitude', 'Population', 'Language', 'Religion', 'Evangelical Engagement', 'pronunciation'],
    EXISTING_UPGS: ['name', 'country', 'latitude', 'longitude', 'pronunciation']
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

// Initialize the UI
async function initializeUI() {
    try {
        await loadAllData();
        initializeCountryDropdown();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing UI:', error);
        throw error;
    }
}

// Function to initialize country dropdown
function initializeCountryDropdown() {
    const countrySelect = document.getElementById('country');
    const countries = getUniqueCountries();
    
    // Clear existing options except the first one
    while (countrySelect.options.length > 1) {
        countrySelect.remove(1);
    }
    
    // Add countries to dropdown
    countries.forEach(country => {
        if (country && country.trim()) {
            const option = new Option(country, country);
            countrySelect.add(option);
        }
    });

    // Log the number of countries added
    console.log(`Added ${countries.length} countries to dropdown`);
}

// Setup event listeners
function setupEventListeners() {
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    
    countrySelect.addEventListener('change', () => {
        const selectedCountry = countrySelect.value;
        populateUPGDropdown(selectedCountry);
    });
}

// Function to populate UPG dropdown based on selected country
function populateUPGDropdown(country) {
    const upgSelect = document.getElementById('upg');
    const upgs = getUpgsForCountry(country);
    
    // Clear existing options
    upgSelect.innerHTML = '<option value="">Select a UPG</option>';
    
    // Enable/disable the UPG dropdown based on country selection
    upgSelect.disabled = !country;
    
    if (country) {
        upgs.forEach(upg => {
            const option = new Option(upg.name, upg.name);
            upgSelect.add(option);
        });
    }
}

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2, unit = 'mi') {
    const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Parse CSV line, handling quoted values correctly
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let withinQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            withinQuotes = !withinQuotes;
        } else if (char === ',' && !withinQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    values.push(currentValue.trim());
    return values;
}

// Enhanced error handling and validation
function validateCoordinates(lat, lon) {
    // Check if coordinates are empty strings or undefined
    if (!lat || !lon || lat === '' || lon === '') {
        return null;
    }
    
    // Parse coordinates
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    
    // Validate coordinates are within valid ranges
    if (!isValidCoordinate(parsedLat) || !isValidCoordinate(parsedLon) ||
        parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
        return null;
    }
    
    return { lat: parsedLat, lon: parsedLon };
}

function isValidCoordinate(coord) {
    return !isNaN(coord) && isFinite(coord);
}

// Function to load UUPG data from CSV
async function loadUUPGData() {
    // Check cache with 5-minute expiration
    const now = Date.now();
    if (dataCache.uupg && dataCache.lastFetch && (now - dataCache.lastFetch < 300000)) {
        console.log('Returning cached UUPG data');
        return dataCache.uupg;
    }

    try {
        console.log('Loading UUPG data...');
        const response = await fetch(DATA_PATHS.UUPG);
        if (!response.ok) {
            throw new Error(`Failed to load UUPG data: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        if (!csvText.trim()) {
            throw new Error('UUPG CSV file is empty');
        }

        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]);
        
        // Validate required fields
        for (const field of REQUIRED_FIELDS.UUPG) {
            if (!headers.includes(field)) {
                throw new Error(`Required field '${field}' not found in UUPG CSV`);
            }
        }

        const uupgs = [];
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                if (row['Evangelical Engagement'] === 'Unengaged') {
                    const coordinates = validateCoordinates(row['Latitude'], row['Longitude']);
                    if (coordinates) {
                        uupgs.push({
                            name: row['PeopleName'] || 'Unknown',
                            country: row['Country'] || 'Unknown',
                            population: parseInt(String(row['Population']).replace(/[^\d]/g, '') || '0'),
                            language: row['Language'] || 'Unknown',
                            religion: row['Religion'] || 'Unknown',
                            pronunciation: row['pronunciation'] || '',
                            latitude: coordinates.lat,
                            longitude: coordinates.lon,
                            isUUPG: true,
                            distance: null // Initialize distance as null
                        });
                    } else {
                        console.warn(`Skipping UUPG with invalid coordinates: ${row['PeopleName']}`);
                    }
                }
            } catch (error) {
                console.warn(`Error processing row ${i + 1}:`, error);
            }
        }

        console.log(`Loaded ${uupgs.length} UUPGs from CSV`);
        dataCache.uupg = uupgs;
        dataCache.lastFetch = now;
        return uupgs;
    } catch (error) {
        console.error('Error loading UUPG data:', error);
        throw error;
    }
}

// Function to load existing UPGs data
async function loadExistingUPGs() {
    // Check cache with 5-minute expiration
    const now = Date.now();
    if (dataCache.existingUpgs && dataCache.lastFetch && (now - dataCache.lastFetch < 300000)) {
        return dataCache.existingUpgs;
    }

    try {
        const response = await fetch(DATA_PATHS.EXISTING_UPGS);
        if (!response.ok) {
            throw new Error(`Failed to load existing UPGs: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        if (!csvText.trim()) {
            throw new Error('Existing UPGs CSV file is empty');
        }

        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]);

        // Validate required fields
        for (const field of REQUIRED_FIELDS.EXISTING_UPGS) {
            if (!headers.includes(field)) {
                throw new Error(`Required field '${field}' not found in existing UPGs CSV`);
            }
        }

        let skippedCount = 0;
        const upgs = [];
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                // Skip entries without a name or country
                if (!row['name'] || !row['country']) {
                    console.warn(`Skipping UPG at row ${i + 1}: Missing name or country`);
                    skippedCount++;
                    continue;
                }

                const coordinates = validateCoordinates(row['latitude'], row['longitude']);
                if (coordinates) {
                    upgs.push({
                        name: row['name'],
                        country: row['country'],
                        latitude: coordinates.lat,
                        longitude: coordinates.lon,
                        pronunciation: row['pronunciation'] || '',
                        distance: null // Initialize distance as null
                    });
                } else {
                    console.warn(`Skipping UPG '${row['name']}' from ${row['country']}: Invalid or missing coordinates`);
                    skippedCount++;
                }
            } catch (error) {
                console.warn(`Error processing row ${i + 1}:`, error);
                skippedCount++;
            }
        }

        console.log(`Loaded ${upgs.length} existing UPGs from CSV (skipped ${skippedCount} invalid entries)`);
        dataCache.existingUpgs = upgs;
        dataCache.lastFetch = now;
        return upgs;
    } catch (error) {
        console.error('Error loading existing UPGs:', error);
        throw error;
    }
}

// Function to fetch FPGs from Joshua Project API
async function fetchFPGs(latitude, longitude, radius, units) {
    console.log('Fetching FPGs with params:', { latitude, longitude, radius, units });
    try {
        const apiKey = config.joshuaProjectApiKey;
        if (!apiKey) {
            throw new Error('Joshua Project API key not configured');
        }

        // Convert radius to kilometers if needed
        const radiusInKm = units === 'miles' ? radius * 1.60934 : radius;

        const params = new URLSearchParams({
            api_key: apiKey,
            latitude,
            longitude,
            radius: radiusInKm,
            fields: 'PeopNameInCountry,Ctry,Population,PrimaryLanguageName,PrimaryReligion,Frontier,JPScale,PercentEvangelical',
            Frontier: 'Y'  // Only get Frontier People Groups
        });

        const response = await fetch(`https://api.joshuaproject.net/api/v2/people_groups?${params}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch FPGs: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Found ${data.length} FPGs from Joshua Project API`);

        // Map API response to our format
        return data.map(fpg => ({
            name: fpg.PeopNameInCountry || 'Unknown',
            country: fpg.Ctry || 'Unknown',
            distance: calculateDistance(latitude, longitude, fpg.Latitude, fpg.Longitude, units),
            population: parseInt(fpg.Population) || 0,
            language: fpg.PrimaryLanguageName || 'Unknown',
            religion: fpg.PrimaryReligion || 'Unknown',
            evangelical: fpg.PercentEvangelical || 0,
            jpScale: fpg.JPScale || '1',
            type: 'fpg',
            units
        }));
    } catch (error) {
        console.error('Error fetching FPGs:', error);
        throw error;
    }
}

// Function to search for nearby people groups
async function searchNearby(country, upgName, radius, units = 'kilometers', type = 'both') {
    try {
        console.log('Starting search with parameters:', { country, upgName, radius, units, type });
        
        // Load data if not already loaded
        if (uupgData.length === 0 || existingUpgData.length === 0) {
            await loadAllData();
        }

        // Find the selected UPG from existing UPGs
        const selectedUpg = existingUpgData.find(upg => 
            upg.country === country && upg.name === upgName
        );
        
        if (!selectedUpg) {
            console.error('Selected UPG not found in existing UPGs:', { country, upgName });
            console.log('Available UPGs for country:', existingUpgData.filter(upg => upg.country === country).map(upg => upg.name));
            throw new Error('Selected UPG not found');
        }

        console.log('Selected UPG:', selectedUpg);

        const results = {
            fpgs: [],
            uupgs: []
        };

        // Search for FPGs if type is 'both' or 'fpg'
        if (type === 'both' || type === 'fpg') {
            try {
                console.log('Searching for FPGs...');
                results.fpgs = await fetchFPGs(
                    selectedUpg.latitude,
                    selectedUpg.longitude,
                    radius,
                    units
                );
                console.log('FPGs found:', results.fpgs.length);
            } catch (error) {
                console.error('Error fetching FPGs:', error);
                results.fpgs = [];
            }
        }

        // Search for UUPGs if type is 'both' or 'uupg'
        if (type === 'both' || type === 'uupg') {
            console.log('Searching for UUPGs...');
            results.uupgs = await searchUUPGs(
                selectedUpg.latitude,
                selectedUpg.longitude,
                radius,
                units
            );
            console.log('UUPGs found:', results.uupgs.length);
        }

        return results;
    } catch (error) {
        console.error('Error in searchNearby:', error);
        throw error;
    }
}

// Function to search for UUPGs near a location
async function searchUUPGs(latitude, longitude, radius, units = 'miles') {
    console.log('Searching for UUPGs with params:', { latitude, longitude, radius, units });
    try {
        // Get all UUPGs
        const allUUPGs = await loadUUPGData();
        console.log('Loaded UUPGs:', allUUPGs.length);
        
        if (allUUPGs.length > 0) {
            console.log('Sample UUPG data:', allUUPGs[0]);
        }

        // Filter UUPGs by distance
        const nearbyUUPGs = allUUPGs.filter(uupg => {
            const distance = calculateDistance(
                latitude,
                longitude,
                uupg.latitude,
                uupg.longitude,
                units
            );
            uupg.distance = distance; // Add distance to UUPG object
            return distance <= radius;
        });

        console.log(`Found ${nearbyUUPGs.length} UUPGs within ${radius} ${units}`);
        if (nearbyUUPGs.length > 0) {
            console.log('Sample nearby UUPG:', nearbyUUPGs[0]);
        }

        // Map UUPGs to common format
        const mappedUUPGs = nearbyUUPGs.map(uupg => ({
            name: uupg.name,
            country: uupg.country,
            distance: uupg.distance,
            population: uupg.population,
            language: uupg.language,
            religion: uupg.religion,
            latitude: uupg.latitude,
            longitude: uupg.longitude,
            isUUPG: true
        }));

        console.log('Mapped UUPGs:', mappedUUPGs.length);
        if (mappedUUPGs.length > 0) {
            console.log('Sample mapped UUPG:', mappedUUPGs[0]);
        }

        return mappedUUPGs;
    } catch (error) {
        console.error('Error searching UUPGs:', error);
        return [];
    }
}

// Function to load all data
async function loadAllData() {
    try {
        console.log('Loading all data...');
        const [uupgs, upgs] = await Promise.all([
            loadUUPGData(),
            loadExistingUPGs()
        ]);
        
        // Update the global arrays
        uupgData = uupgs;
        existingUpgData = upgs;
        
        console.log('All data loaded successfully');
        console.log(`Loaded ${uupgData.length} UUPGs and ${existingUpgData.length} existing UPGs`);
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Function to get unique countries from existing UPGs
function getUniqueCountries() {
    if (!existingUpgData || existingUpgData.length === 0) {
        console.error('No existing UPG data available');
        return [];
    }
    
    // Get unique countries and sort them
    const countries = [...new Set(existingUpgData.map(upg => upg.country))]
        .filter(country => country && country.trim()) // Remove empty values
        .sort();
    
    console.log(`Found ${countries.length} unique countries`);
    return countries;
}

// Function to get UPGs for a country
function getUpgsForCountry(country) {
    if (!country) return [];
    
    return existingUpgData.filter(upg => upg.country === country)
        .sort((a, b) => a.name.localeCompare(b.name));
}

// Export functions that need to be accessible from other modules
export {
    loadAllData,
    searchNearby,
    initializeUI,
    getUniqueCountries,
    getUpgsForCountry,
    fetchFPGs,
    searchUUPGs
};

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);