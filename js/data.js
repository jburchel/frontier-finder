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
        if (!countryDropdown) {
            console.error('Country dropdown element not found');
            return;
        }

        // Load data if not already loaded
        if (existingUpgData.length === 0) {
            existingUpgData = await loadExistingUPGs();
        }

        // Get unique countries
        const countries = [...new Set(existingUpgData.map(upg => upg.country))]
            .filter(Boolean)
            .sort();

        // Clear existing options
        countryDropdown.innerHTML = '<option value="">Select a country</option>';

        // Add country options
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryDropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error initializing country dropdown:', error);
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

// Export necessary functions
export {
    initializeUI,
    loadAllData,
    loadExistingUPGs,
    loadUUPGData,
    validateCoordinates,
    parseCSVLine
};