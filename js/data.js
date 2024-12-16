// Load data from CSV files
let existingUpgData = []; // For dropdown data
let uupgData = []; // For search data

// Function to calculate distance between two points using Haversine formula
export function calculateDistance(lat1, lon1, lat2, lon2, units = 'km') {
    const R = units === 'km' ? 6371 : 3959; // Earth's radius in km or miles
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

// Parse CSV line, handling quoted values correctly
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let withinQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (withinQuotes && i + 1 < line.length && line[i + 1] === '"') {
                // Handle escaped quotes ("") within quoted values
                currentValue += '"';
                i++; // Skip the next quote
            } else {
                withinQuotes = !withinQuotes;
            }
        } else if (char === ',' && !withinQuotes) {
            values.push(currentValue.trim().replace(/^"(.*)"$/, '$1')); // Remove surrounding quotes
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Add the last value
    values.push(currentValue.trim().replace(/^"(.*)"$/, '$1')); // Remove surrounding quotes
    
    // Trim trailing empty values
    while (values.length > 0 && values[values.length - 1] === '') {
        values.pop();
    }
    
    return values;
}

// Function to load UUPG data from CSV
export async function loadUUPGData() {
    try {
        console.log('Loading UUPG data...');
        const response = await fetch('/frontier-finder/data/updated_uupg.csv');
        if (!response.ok) {
            console.error('Failed to load UUPG data:', response.status, response.statusText);
            throw new Error(`Failed to load UUPG data: ${response.status} ${response.statusText}`);
        }
        const csvText = await response.text();
        console.log('UUPG CSV text length:', csvText.length);
        
        // Parse CSV
        const lines = csvText.split('\n');
        console.log('UUPG CSV lines:', lines.length);
        
        if (lines.length === 0) {
            throw new Error('UUPG CSV file is empty');
        }
        
        const headers = parseCSVLine(lines[0]);
        console.log('UUPG headers:', headers);
        
        uupgData = lines.slice(1)
            .filter(line => line.trim())
            .map((line, index) => {
                try {
                    const values = parseCSVLine(line);
                    const obj = {};
                    headers.forEach((header, index) => {
                        if (index < values.length) { // Only assign if value exists
                            obj[header] = values[index];
                        }
                    });
                    // Map PeopleName to name for consistency
                    if (obj.PeopleName) {
                        obj.name = obj.PeopleName;
                    }
                    // Convert numeric fields
                    obj.latitude = parseFloat(obj.Latitude || obj.latitude) || 0;
                    obj.longitude = parseFloat(obj.Longitude || obj.longitude) || 0;
                    obj.population = parseInt((obj.Population || obj.population || '').replace(/,/g, '')) || 0;
                    obj.language = obj.Language || obj.language || 'Unknown';
                    obj.religion = obj.Religion || obj.religion || 'Unknown';
                    return obj;
                } catch (error) {
                    console.error(`Error parsing UUPG line ${index + 2}:`, error);
                    console.error('Line content:', line);
                    return null;
                }
            })
            .filter(obj => obj && obj.country && obj.name); // Filter out invalid entries
            
        console.log(`Loaded ${uupgData.length} UUPGs from CSV`);
        return uupgData;
    } catch (error) {
        console.error('Error loading UUPG data:', error);
        throw error;
    }
}

// Function to load existing UPGs data
export async function loadExistingUPGs() {
    try {
        console.log('Loading existing UPGs data...');
        const response = await fetch('/frontier-finder/data/existing_upgs_updated.csv');
        if (!response.ok) {
            console.error('Failed to load existing UPGs data:', response.status, response.statusText);
            throw new Error(`Failed to load existing UPGs data: ${response.status} ${response.statusText}`);
        }
        const csvText = await response.text();
        console.log('Existing UPGs CSV text length:', csvText.length);
        
        // Parse CSV
        const lines = csvText.split('\n');
        console.log('Existing UPGs CSV lines:', lines.length);
        
        if (lines.length === 0) {
            throw new Error('Existing UPGs CSV file is empty');
        }
        
        const headers = parseCSVLine(lines[0]);
        console.log('Existing UPGs headers:', headers);
        
        existingUpgData = lines.slice(1)
            .filter(line => line.trim())
            .map((line, index) => {
                try {
                    const values = parseCSVLine(line);
                    const obj = {};
                    headers.forEach((header, index) => {
                        if (index < values.length) { // Only assign if value exists
                            obj[header] = values[index];
                        }
                    });
                    // Convert numeric fields
                    obj.latitude = parseFloat(obj.latitude) || 0;
                    obj.longitude = parseFloat(obj.longitude) || 0;
                    obj.population = parseInt((obj.population || '').replace(/,/g, '')) || 0;
                    return obj;
                } catch (error) {
                    console.error(`Error parsing existing UPG line ${index + 2}:`, error);
                    console.error('Line content:', line);
                    return null;
                }
            })
            .filter(obj => obj && obj.country && obj.name); // Filter out invalid entries
            
        console.log(`Loaded ${existingUpgData.length} existing UPGs from CSV`);
        return existingUpgData;
    } catch (error) {
        console.error('Error loading existing UPGs data:', error);
        throw error;
    }
}

// Function to load all data
export async function loadAllData() {
    try {
        console.log('Loading all data...');
        await Promise.all([
            loadUUPGData(),
            loadExistingUPGs()
        ]);
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Function to get unique countries from existing UPGs
export function getUniqueCountries() {
    console.log('Getting unique countries from', existingUpgData.length, 'UPGs');
    
    if (existingUpgData.length === 0) {
        console.error('No existing UPG data available');
        return [];
    }
    
    // Get unique countries and sort them
    const countries = [...new Set(existingUpgData.map(upg => upg.country))]
        .filter(country => country && country.trim()) // Remove empty values
        .sort();
    
    console.log('Found', countries.length, 'unique countries:', countries);
    return countries;
}

// Function to get UPGs for a country
export function getUpgsForCountry(country) {
    console.log('Getting UPGs for country:', country);
    console.log('Total existing UPGs:', existingUpgData.length);
    
    if (existingUpgData.length === 0) {
        console.error('No existing UPG data available');
        return [];
    }
    
    if (!country) {
        console.error('No country specified');
        return [];
    }
    
    // Filter UPGs by country and sort by name
    const upgs = existingUpgData
        .filter(upg => upg.country === country)
        .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Found ${upgs.length} UPGs for ${country}:`, upgs);
    return upgs;
}

// Function to fetch FPGs from Joshua Project API
export async function fetchFPGs(latitude, longitude, radius, units) {
    try {
        const apiKey = import.meta.env.VITE_JOSHUA_PROJECT_API_KEY;
        console.log('API Key available:', !!apiKey);
        
        if (!apiKey) {
            throw new Error('Joshua Project API key not found. Please add VITE_JOSHUA_PROJECT_API_KEY to your .env file.');
        }

        console.log('Fetching FPGs with params:', {
            latitude,
            longitude,
            radius,
            units: units === 'kilometers' ? 'km' : 'mi'
        });

        const baseUrl = 'https://api.joshuaproject.net/v1/people_groups.json';
        const params = new URLSearchParams({
            api_key: apiKey,
            latitude,
            longitude,
            radius,
            radius_units: units === 'kilometers' ? 'km' : 'mi',
            frontier_only: 1,
            limit: 100 // Increase limit to get more results
        });

        const url = `${baseUrl}?${params}`;
        console.log('Fetching from URL:', url.replace(apiKey, '[REDACTED]')); // Log URL without exposing API key

        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Failed to fetch FPGs: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`Found ${data.length} FPGs from Joshua Project API`);
        
        return data.map(fpg => ({
            country: fpg.country?.name || fpg.country || 'Unknown',
            name: fpg.peo_name || fpg.name || 'Unknown',
            latitude: parseFloat(fpg.latitude) || 0,
            longitude: parseFloat(fpg.longitude) || 0,
            population: parseInt(fpg.population) || 0,
            language: fpg.primary_language_name || 'Unknown',
            religion: fpg.primary_religion || 'Unknown',
            distance: calculateDistance(latitude, longitude, fpg.latitude, fpg.longitude, units)
        }));
    } catch (error) {
        console.error('Error fetching FPGs:', error);
        throw error;
    }
}

// Function to search for nearby people groups
export async function searchNearby(country, upgName, radius, units = 'kilometers', type = 'both') {
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
            results.uupgs = uupgData
                .filter(uupg => {
                    // Make sure we have valid coordinates
                    if (!uupg.latitude || !uupg.longitude) {
                        console.warn('UUPG missing coordinates:', uupg);
                        return false;
                    }
                    
                    if (uupg.country === country && uupg.name === upgName) {
                        return false; // Exclude the selected UPG
                    }
                    
                    const distance = calculateDistance(
                        selectedUpg.latitude,
                        selectedUpg.longitude,
                        uupg.latitude,
                        uupg.longitude,
                        units
                    );
                    uupg.distance = distance; // Add distance to UUPG object
                    return distance <= radius;
                })
                .sort((a, b) => a.distance - b.distance);
            
            console.log('UUPGs found:', results.uupgs.length);
        }

        return results;
    } catch (error) {
        console.error('Error in searchNearby:', error);
        throw error;
    }
}