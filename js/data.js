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

// Export necessary functions
export {
    initializeUI,
    loadAllData,
    loadExistingUPGs,
    loadUUPGData,
    validateCoordinates,
    parseCSVLine
};