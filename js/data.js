// At the top of the file, add exports for functions that need to be shared
export { initializeUI, fetchPeopleGroups, loadExistingUPGs, searchNearby };

// Import config
import { config } from './config.js';

// Constants for data paths and configuration
const isGitHubPages = window.location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages ? '/frontier-finder' : '';

// Debug logging for environment
console.log('Environment setup:', {
    hostname: window.location.hostname,
    isGitHubPages,
    BASE_PATH,
    currentPath: window.location.pathname
});

const DATA_PATHS = {
    UUPG: `${BASE_PATH}/data/updated_uupg.csv`,
    EXISTING_UPGS: `${BASE_PATH}/data/existing_upgs_updated.csv`
};

// Debug logging for data paths
console.log('Data paths:', DATA_PATHS);

// Function to get correct asset path
function getAssetPath(path) {
    return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

// Constants for required fields
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

// Function to load existing UPGs with better error handling
async function loadExistingUPGs() {
    console.log('Loading existing UPGs...');
    try {
        const response = await fetch(DATA_PATHS.EXISTING_UPGS);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV data first 100 chars:', csvText.substring(0, 100));
        
        const lines = csvText.split('\n').filter(line => line.trim());
        console.log(`Found ${lines.length} lines in CSV`);
        
        const headers = parseCSVLine(lines[0]);
        console.log('CSV Headers:', headers);

        // Validate required fields
        for (const field of REQUIRED_FIELDS.EXISTING_UPGS) {
            if (!headers.includes(field)) {
                throw new Error(`Required field '${field}' not found in CSV`);
            }
        }

        const upgs = [];
        let skippedCount = 0;

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                if (!row['name'] || !row['country']) {
                    console.warn(`Skipping row ${i + 1}: Missing name or country`);
                    skippedCount++;
                    continue;
                }

                upgs.push({
                    name: row['name'],
                    country: row['country'],
                    latitude: parseFloat(row['latitude']) || 0,
                    longitude: parseFloat(row['longitude']) || 0,
                    pronunciation: row['pronunciation'] || ''
                });
            } catch (error) {
                console.warn(`Error processing row ${i + 1}:`, error);
                skippedCount++;
            }
        }

        console.log(`Successfully loaded ${upgs.length} UPGs (skipped ${skippedCount})`);
        console.log('Sample UPG:', upgs[0]);
        return upgs;

    } catch (error) {
        console.error('Error loading existing UPGs:', error);
        throw error;
    }
}

// Initialize UI with better error handling
async function initializeUI() {
    try {
        console.log('Initializing UI...');
        const countryDropdown = document.getElementById('country');
        const upgDropdown = document.getElementById('upg');

        if (!countryDropdown || !upgDropdown) {
            throw new Error('Required dropdown elements not found');
        }

        console.log('Loading data...');
        const upgs = await loadExistingUPGs();
        
        // Get unique countries
        const countries = [...new Set(upgs.map(upg => upg.country))]
            .filter(Boolean)
            .sort();
        
        console.log(`Found ${countries.length} unique countries`);

        // Populate country dropdown
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryDropdown.appendChild(option);
        });

        // Setup country change handler
        countryDropdown.addEventListener('change', (e) => {
            const selectedCountry = e.target.value;
            console.log('Country selected:', selectedCountry);
            
            // Clear and disable UPG dropdown if no country selected
            upgDropdown.innerHTML = '<option value="">Select a UPG</option>';
            upgDropdown.disabled = !selectedCountry;

            if (selectedCountry) {
                // Filter UPGs for selected country
                const countryUPGs = upgs
                    .filter(upg => upg.country === selectedCountry)
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                console.log(`Found ${countryUPGs.length} UPGs for ${selectedCountry}`);

                // Populate UPG dropdown
                countryUPGs.forEach(upg => {
                    const option = document.createElement('option');
                    option.value = upg.name;
                    option.textContent = upg.name;
                    upgDropdown.appendChild(option);
                });
                
                upgDropdown.disabled = false;
            }
        });

        console.log('UI initialization complete');
    } catch (error) {
        console.error('Error initializing UI:', error);
        throw error;
    }
}

async function fetchPeopleGroups(params) {
    console.log('Fetching with params:', params);
    
    // Build the URL with parameters
    const queryParams = new URLSearchParams({
        api_key: config.joshuaProjectApiKey,
        ...params
    }).toString();
    
    const url = `${config.apiBaseUrl}/people_groups?${queryParams}`;
    console.log('Full API URL:', url);

    return new Promise((resolve, reject) => {
        const callbackName = 'jp_callback_' + Date.now();
        
        // Add callback to window
        window[callbackName] = (data) => {
            resolve(data);
            // Clean up
            delete window[callbackName];
            document.head.removeChild(script);
        };
        
        const script = document.createElement('script');
        
        script.onload = () => {
            console.log('Script loaded successfully');
        };
        
        script.onerror = (error) => {
            console.error('Script load error:', error);
            reject(new Error('Failed to load data from Joshua Project API'));
            delete window[callbackName];
            document.head.removeChild(script);
        };
        
        script.src = `${url}&callback=${callbackName}`;
        console.log('Adding script with src:', script.src);
        document.head.appendChild(script);
    });
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

// Add this function at the top of data.js, before it's used
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Handle escaped quotes
                currentValue += '"';
                i++;
            } else {
                // Toggle quotes mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of value
            values.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Push the last value
    values.push(currentValue.trim());
    return values;
}

// Add this function to test Joshua Project API
async function testJoshuaProjectAPI() {
    console.log('Testing Joshua Project API connection...');
    try {
        // Create a unique callback name
        const callbackName = 'jpCallback_' + Math.random().toString(36).substr(2, 9);
        
        // Create promise to handle JSONP response
        const jsonpPromise = new Promise((resolve, reject) => {
            // Add callback to window
            window[callbackName] = (data) => {
                resolve(data);
                // Clean up
                delete window[callbackName];
                document.head.removeChild(script);
            };
            
            // Create script element
            const script = document.createElement('script');
            
            // Use v1 API endpoint with JSONP
            script.src = `${config.apiBaseUrl}/people_groups?api_key=${config.joshuaProjectApiKey}&limit=1&callback=${callbackName}`;
            
            // Handle errors
            script.onerror = () => {
                reject(new Error('Failed to load JSONP script'));
                delete window[callbackName];
                document.head.removeChild(script);
            };
            
            // Add script to page
            document.head.appendChild(script);
        });

        console.log('API Key being used:', config.joshuaProjectApiKey);
        console.log('Making JSONP API call...');
        
        const data = await jsonpPromise;
        console.log('API Test successful:', {
            data: data
        });

        return true;
    } catch (error) {
        console.error('API Test Failed:', error);
        return false;
    }
}

// Update the searchNearby function
async function searchNearby(selectedCountry, selectedUPG, radius, units, searchType) {
    try {
        console.log('Starting search with params:', { selectedCountry, selectedUPG, radius, units, searchType });
        
        // Get the coordinates of the selected UPG
        const upgs = await loadExistingUPGs();
        const baseUPG = upgs.find(upg => upg.country === selectedCountry && upg.name === selectedUPG);
        
        if (!baseUPG) {
            throw new Error('Selected UPG not found');
        }

        // Prepare search parameters
        const params = {
            lat: baseUPG.latitude,
            lon: baseUPG.longitude,
            rad: radius,
            rad_units: units.toLowerCase() === 'kilometers' ? 'km' : 'mi'
        };

        // Add type-specific parameters
        if (searchType === 'fpg') {
            params.is_frontier = 1;
        } else if (searchType === 'uupg') {
            params.is_uupg = 1;
        }

        console.log('API request params:', params);

        try {
            const results = await fetchPeopleGroups(params);
            console.log('Raw API response:', results);
            return {
                baseUPG,
                results: results.data || []
            };
        } catch (error) {
            console.warn('API search failed:', error);
            return {
                baseUPG,
                results: [],
                error: error.message
            };
        }
    } catch (error) {
        console.error('Search failed:', error);
        throw error;
    }
}

// Update the form submission handler
document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const searchButton = e.target.querySelector('button[type="submit"]');
            const originalButtonText = searchButton.textContent;
            
            try {
                // Clear any existing errors
                const existingError = document.querySelector('.error-message');
                if (existingError) existingError.remove();

                // Disable button and show loading state
                searchButton.disabled = true;
                searchButton.textContent = 'Searching...';

                const country = document.getElementById('country').value;
                const upg = document.getElementById('upg').value;
                const radius = document.getElementById('radius').value;
                const units = document.querySelector('input[name="units"]:checked').value;
                const type = document.querySelector('input[name="type"]:checked').value;

                if (!country || !upg || !radius) {
                    throw new Error('Please fill in all required fields');
                }

                console.log('Form values:', { country, upg, radius, units, type });

                const results = await searchNearby(country, upg, radius, units, type);
                
                if (results.error) {
                    throw new Error(results.error);
                }

                // Store results and redirect
                sessionStorage.setItem('searchResults', JSON.stringify(results));
                window.location.href = `results.html?${new URLSearchParams({
                    country, upg, radius, units, type
                }).toString()}`;

            } catch (error) {
                console.error('Search error:', error);
                showError(error.message);
                
                // Reset button state
                searchButton.disabled = false;
                searchButton.textContent = originalButtonText;
            }
        });
    }
});

// Remove all other DOMContentLoaded listeners and keep just this one
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Starting application initialization...');
        
        // First verify local assets
        await verifyAssets();
        console.log('Assets verified');

        // Initialize UI (this loads the CSV data)
        await initializeUI();
        console.log('UI initialized');

        // Test Joshua Project API last, but don't let it block initialization
        const apiTestResult = await testJoshuaProjectAPI();
        if (!apiTestResult) {
            console.warn('API test failed but continuing with local data');
            // Optionally show a warning to the user
            const container = document.querySelector('.container');
            if (container) {
                container.insertAdjacentHTML('afterbegin', `
                    <div class="warning-message" style="color: orange; padding: 10px; margin: 10px; border: 1px solid orange;">
                        ⚠️ Unable to connect to Joshua Project API. Using local data only. Click "Test API" to diagnose the connection.
                    </div>
                `);
            }
        }

    } catch (error) {
        console.error('Initialization failed:', error);
        const container = document.querySelector('.container');
        if (container) {
            container.insertAdjacentHTML('afterbegin', `
                <div class="error-message" style="color: red; padding: 20px; margin: 20px; border: 1px solid red;">
                    Error initializing application: ${error.message}
                </div>
            `);
        }
    }
});

// Add this helper function
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = `⚠️ ${message}`;
    
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message at the top of the form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.insertAdjacentElement('beforebegin', errorDiv);
    }
}