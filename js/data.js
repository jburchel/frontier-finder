// Import config
import { config } from './config.js';

// Constants for data paths and configuration
const isGitHubPages = window.location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages ? '/frontier-finder' : '';

// Debug logging
console.log('Environment setup:', {
    hostname: window.location.hostname,
    isGitHubPages,
    BASE_PATH,
    currentPath: window.location.pathname,
    fullUrl: window.location.href
});

// Function to get correct asset path
function getAssetPath(path) {
    return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

const DATA_PATHS = {
    UUPG: getAssetPath('data/updated_uupg.csv'),
    EXISTING_UPGS: getAssetPath('data/existing_upgs_updated.csv')
};

// Add this debug function
async function verifyDataFiles() {
    console.log('Verifying data files...');
    console.log('Data paths:', DATA_PATHS);
    
    for (const [key, path] of Object.entries(DATA_PATHS)) {
        try {
            console.log(`Fetching ${key} from ${path}`);
            const response = await fetch(path, {
                headers: {
                    'Accept': 'text/csv',
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log(`${key} response:`, {
                status: response.status,
                ok: response.ok,
                contentType: response.headers.get('content-type'),
                url: response.url
            });
        } catch (e) {
            console.error(`Error accessing ${key}:`, e);
        }
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', verifyDataFiles);

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
async function initializeCountryDropdown() {
    try {
        const countryDropdown = document.getElementById('country');
        console.log('Found country dropdown:', countryDropdown);

        if (!countryDropdown) {
            console.log('Country dropdown not found - this is normal on results page');
            return;
        }

        // Load data if not already loaded
        if (existingUpgData.length === 0) {
            console.log('Loading data for country dropdown...');
            existingUpgData = await loadExistingUPGs();
            console.log('Loaded existing UPGs data:', existingUpgData);
        }

        // Get unique countries
        const countries = getUniqueCountries();
        console.log('Unique countries found:', countries);
        
        // Sort countries alphabetically
        countries.sort();

        // Clear existing options
        countryDropdown.innerHTML = '<option value="">Select a country...</option>';

        // Add country options
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryDropdown.appendChild(option);
        });

        // Initialize UPG dropdown if country is already selected
        const selectedCountry = countryDropdown.value;
        if (selectedCountry) {
            await populateUPGDropdown(selectedCountry);
        }

        console.log('Country dropdown initialized with', countries.length, 'countries');
    } catch (error) {
        console.error('Error initializing country dropdown:', error);
        throw error;
    }
}

// Setup event listeners
function setupEventListeners() {
    try {
        const countrySelect = document.getElementById('country');
        const upgSelect = document.getElementById('upg');
        const radiusInput = document.getElementById('radius');
        const unitsSelect = document.getElementById('units');
        const searchForm = document.getElementById('searchForm');

        // Skip event listeners on results page
        if (!searchForm) {
            console.log('Search form not found - this is normal on results page');
            return;
        }

        // Country selection change
        countrySelect.addEventListener('change', async (e) => {
            const selectedCountry = e.target.value;
            await populateUPGDropdown(selectedCountry);
        });

        // Form submission
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const country = countrySelect.value;
            const upg = upgSelect.value;
            const radius = radiusInput.value;
            const units = unitsSelect.value;

            if (!country || !upg || !radius) {
                alert('Please fill in all required fields');
                return;
            }

            // Redirect to results page with search parameters
            const params = new URLSearchParams({
                country,
                upg,
                radius,
                units
            });
            window.location.href = `results.html?${params}`;
        });
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
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
function calculateDistance(lat1, lon1, lat2, lon2, unit = 'miles') {
    // Convert latitude and longitude to numbers
    lat1 = parseFloat(lat1);
    lon1 = parseFloat(lon1);
    lat2 = parseFloat(lat2);
    lon2 = parseFloat(lon2);

    // Convert to radians
    lat1 = toRad(lat1);
    lon1 = toRad(lon1);
    lat2 = toRad(lat2);
    lon2 = toRad(lon2);

    // Calculate differences
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    // Haversine formula
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // Earth's radius in kilometers
    const R = 6371;
    
    // Calculate distance
    let distance = R * c;
    
    // Convert to miles if needed
    if (unit === 'miles') {
        distance = distance * 0.621371;
    }
    
    return parseFloat(distance.toFixed(2));
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

// Function to load existing UPGs data with better error handling
async function loadExistingUPGs() {
    const paths = [
        DATA_PATHS.EXISTING_UPGS,
        `${window.location.origin}${DATA_PATHS.EXISTING_UPGS}`,
        '/frontier-finder/data/existing_upgs_updated.csv',
        '/data/existing_upgs_updated.csv'
    ];

    console.log('Current location:', window.location.href);
    console.log('Attempting to load data from paths:', paths);

    for (const path of paths) {
        try {
            console.log(`Attempting fetch from: ${path}`);
            const response = await fetch(path);
            
            // Log the full response details
            console.log(`Response for ${path}:`, {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries([...response.headers.entries()])
            });

            if (response.ok) {
                const text = await response.text();
                console.log(`First 100 chars of data from ${path}:`, text.substring(0, 100));
                
                if (!text.trim()) {
                    console.error(`Empty response from ${path}`);
                    continue;
                }

                return processCSVResponse(text);
            }
        } catch (e) {
            console.error(`Error fetching from ${path}:`, e);
        }
    }

    throw new Error('Failed to load data from all attempted paths');
}

function processCSVResponse(csvText) {
    console.log('Processing CSV response...');
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log(`Found ${lines.length} lines in CSV`);
    
    if (lines.length === 0) {
        throw new Error('CSV file is empty');
    }

    const headers = parseCSVLine(lines[0]);
    console.log('CSV Headers:', headers);

    const data = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        return row;
    });

    console.log(`Processed ${data.length} rows of data`);
    console.log('Sample row:', data[0]);
    
    return data;
}

// Function to fetch FPGs from Joshua Project API
async function fetchFPGs(latitude, longitude, radius, units) {
    console.log('Fetching FPGs with params:', { latitude, longitude, radius, units });
    try {
        const apiKey = config.joshuaProjectApiKey;
        if (!apiKey) {
            const error = new Error('Joshua Project API key not configured');
            error.code = 'API_KEY_MISSING';
            throw error;
        }

        // Convert radius to kilometers if needed
        const radiusInKm = units === 'miles' ? radius * 1.60934 : radius;

        // Function to delay execution
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        // Function to fetch a page with retries
        async function fetchPage(url, retries = 3) {
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    // Add delay between requests to avoid rate limiting
                    if (attempt > 1) {
                        console.log(`Retry attempt ${attempt} after delay...`);
                        await delay(2000); // 2 second delay between retries
                    }

                    const response = await fetch(url);
                    
                    if (response.status === 429) {
                        console.log('Rate limit hit, waiting before retry...');
                        await delay(5000); // 5 second delay when rate limited
                        continue;
                    }
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    return await response.json();
                } catch (error) {
                    if (attempt === retries) {
                        throw error;
                    }
                    console.log(`Attempt ${attempt} failed, retrying...`);
                }
            }
        }

        // Build the API URL with parameters
        const params = new URLSearchParams({
            api_key: apiKey,
            latitude: parseFloat(latitude).toFixed(6),
            longitude: parseFloat(longitude).toFixed(6),
            distance: Math.round(radiusInKm),
            per_page: 100,
            page: 1
        });

        // Construct the base URL
        const baseUrl = `${config.apiBaseUrl}/api/v2/people_groups`;
        
        // Array to store all people groups
        let allPeopleGroups = [];
        let currentPage = 1;
        let totalPages = 1;

        try {
            do {
                // Update page parameter
                params.set('page', currentPage);
                const url = `${baseUrl}?${params}`;
                
                console.log(`Fetching page ${currentPage}...`);
                
                // Add delay between pages to avoid rate limiting
                if (currentPage > 1) {
                    await delay(1000); // 1 second delay between pages
                }

                // Fetch the page with retries
                const responseData = await fetchPage(url);
                
                if (currentPage === 1) {
                    totalPages = responseData.meta.pagination.total_pages;
                    console.log(`Found ${responseData.meta.pagination.total} total people groups across ${totalPages} pages`);
                }

                if (!responseData.data || !Array.isArray(responseData.data)) {
                    console.error('Unexpected API response format:', responseData);
                    throw new Error('Invalid API response format');
                }

                // Pre-filter the people groups by evangelical percentage before adding to array
                const filteredGroups = responseData.data.filter(fpg => {
                    const evangelicalPercent = parseFloat(fpg.PercentEvangelical) || 0;
                    return evangelicalPercent < 0.1;
                });

                // Add filtered groups to our array
                allPeopleGroups = allPeopleGroups.concat(filteredGroups);
                console.log(`Added ${filteredGroups.length} frontier groups from page ${currentPage}`);

                currentPage++;
            } while (currentPage <= totalPages);

            console.log(`Finished fetching all frontier groups, found ${allPeopleGroups.length} total`);

            // Now just filter by distance and map to our format
            const fpgs = allPeopleGroups
                .filter(fpg => {
                    const hasCoordinates = Boolean(fpg.Latitude && fpg.Longitude);
                    if (!hasCoordinates) {
                        return false;
                    }

                    const distance = calculateDistance(
                        latitude,
                        longitude,
                        fpg.Latitude,
                        fpg.Longitude,
                        units
                    );

                    const isWithinRadius = distance <= parseFloat(radius);
                    if (isWithinRadius) {
                        console.log(`Including FPG: ${fpg.PeopNameInCountry} (${distance.toFixed(2)} ${units}, ${parseFloat(fpg.PercentEvangelical)}% evangelical)`);
                    }
                    return isWithinRadius;
                }){{ ... }}
                
                // Map FPGs to common format
                .map(fpg => ({
                    name: fpg.PeopNameInCountry || fpg.PeopName || 'Unknown',
                    country: fpg.Ctry || 'Unknown',
                    distance: calculateDistance(
                        latitude,
                        longitude,
                        fpg.Latitude,
                        fpg.Longitude,
                        units
                    ),
                    population: parseInt(fpg.Population) || 0,
                    language: fpg.PrimaryLanguageName || 'Unknown',
                    religion: fpg.PrimaryReligion || 'Unknown',
                    evangelical: parseFloat(fpg.PercentEvangelical) || 0,
                    jpScale: fpg.JPScalePC || '1',
                    type: 'fpg',
                    units
                }))
                .sort((a, b) => a.distance - b.distance);

            console.log(`Found ${fpgs.length} FPGs within ${radius} ${units}`);
            if (fpgs.length > 0) {
                console.log('Sample nearby FPG:', fpgs[0]);
            }

            return fpgs;
        } catch (error) {
            console.error('Error fetching FPGs:', error);
            // Log the error to the UI
            document.getElementById('fpgList').innerHTML = `
                <p class="error">Error fetching FPGs: ${error.message}</p>
                <p class="error-details">Please check the browser console for more details.</p>
            `;
            throw error;
        }
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
            isUUPG: true,
            units
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
        
        // Load UUPG data
        console.log('Loading UUPG data...');
        uupgData = await loadUUPGData();
        
        // Load existing UPGs data
        console.log('Loading existing UPGs data...');
        existingUpgData = await loadExistingUPGs();
        
        console.log('All data loaded successfully');
        console.log(`Loaded ${uupgData.length} UUPGs and ${existingUpgData.length} existing UPGs`);
        
        return {
            uupgData,
            existingUpgData
        };
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
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM loaded, initializing UI...');
        await initializeUI();
        console.log('UI initialization complete');
    } catch (error) {
        console.error('Failed to initialize UI:', error);
        // Show error to user
        const container = document.querySelector('.container');
        if (container) {
            container.insertAdjacentHTML('afterbegin', `
                <div class="error-message" style="color: red; padding: 20px; margin: 20px; border: 1px solid red;">
                    Error loading application data: ${error.message}
                </div>
            `);
        }
    }
});

async function fetchPeopleGroups(params) {
    const baseUrl = 'https://api.joshuaproject.net/v2/PeopleGroups';
    const queryString = new URLSearchParams({
        api_key: config.joshuaProjectApiKey,
        ...params
    });
    
    try {
        const response = await fetch(`${baseUrl}?${queryString}`);
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
    } catch (error) {
        console.error('Error fetching people groups:', error);
        throw error;
    }
}

function checkRateLimit(headers) {
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');
    
    if (remaining < 10) {
        console.warn(`API rate limit warning: ${remaining} requests remaining`);
    }
    
    return {
        remaining: parseInt(remaining),
        reset: new Date(reset * 1000)
    };
}

class APICache {
    constructor(ttl = 300000) { // 5 minutes default TTL
        this.cache = new Map();
        this.ttl = ttl;
    }

    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
}

// Add this function to help debug asset loading
async function verifyAssets() {
    const assets = [
        'css/style.css',
        'images/crossover-global-logo.png',
        'data/updated_uupg.csv',
        'data/existing_upgs_updated.csv'
    ];

    console.log('Verifying assets...');
    for (const asset of assets) {
        try {
            const response = await fetch(asset);
            console.log(`${asset}:`, {
                status: response.status,
                ok: response.ok,
                contentType: response.headers.get('content-type')
            });
        } catch (e) {
            console.error(`Error loading ${asset}:`, e);
        }
    }
}

// Call this after DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    await verifyAssets();
    // ... rest of your initialization code
});