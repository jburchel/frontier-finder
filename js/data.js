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

// Function to load UUPG data from CSV
export async function loadUUPGData() {
    try {
        const response = await fetch('/data/updated_uupg.csv');
        if (!response.ok) {
            throw new Error(`Failed to load UUPG data: ${response.statusText}`);
        }
        const csvText = await response.text();
        
        // Parse CSV
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        uupgData = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = line.split(',').map(v => v.trim());
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index];
                });
                // Convert numeric fields
                obj.latitude = parseFloat(obj.latitude);
                obj.longitude = parseFloat(obj.longitude);
                obj.population = parseInt(obj.population) || 0;
                return obj;
            });
            
        console.log(`Loaded ${uupgData.length} UUPGs from CSV`);
    } catch (error) {
        console.error('Error loading UUPG data:', error);
        throw error;
    }
}

// Load both CSV files
export async function loadAllData() {
    try {
        // Load existing UPGs for dropdowns
        console.log('Loading existing UPGs data...');
        const existingResponse = await fetch('data/existing_upgs_updated.csv');
        if (!existingResponse.ok) {
            throw new Error(`Failed to load existing UPGs data: ${existingResponse.statusText}`);
        }
        const existingText = await existingResponse.text();
        if (!existingText.trim()) {
            throw new Error('Existing UPGs data file is empty');
        }
        
        const existingLines = existingText.split('\n').filter(line => line.trim());
        if (existingLines.length < 2) { // At least header + 1 data row
            throw new Error('Existing UPGs data file has insufficient data');
        }
        
        // Skip header row and parse data
        const header = existingLines[0].split(',');
        existingUpgData = existingLines.slice(1).map(line => {
            const values = parseCSVLine(line);
            return {
                name: values[0],
                country: values[1],
                latitude: parseFloat(values[2]) || 0,
                longitude: parseFloat(values[3]) || 0,
                population: parseInt(values[4]) || 0,
                evangelical: values[5],
                language: values[6],
                religion: values[7],
                description: values[8]
            };
        }).filter(upg => upg.country && upg.name); // Filter out any entries without country or name

        if (existingUpgData.length === 0) {
            throw new Error('No valid UPG data found after parsing');
        }

        console.log(`Data loaded successfully - ${existingUpgData.length} UPGs`);
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        throw new Error(`Failed to load data: ${error.message}`);
    }
}

// Function to get unique countries from existing UPGs
export function getUniqueCountries() {
    // Get unique countries and sort them
    const countries = [...new Set(existingUpgData.map(upg => upg.country))]
        .filter(country => country) // Remove empty values
        .sort();
    
    console.log('Unique countries:', countries);
    return countries;
}

// Function to get UPGs for a country
export function getUpgsForCountry(country) {
    // Filter UPGs by country and sort by name
    const upgs = existingUpgData
        .filter(upg => upg.country === country)
        .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`UPGs for ${country}:`, upgs);
    return upgs;
}

// Function to fetch FPGs from Joshua Project API
export async function fetchFPGs(latitude, longitude, radius, units) {
    try {
        const apiKey = process.env.JOSHUA_PROJECT_API_KEY;
        if (!apiKey) {
            throw new Error('Joshua Project API key not found. Please add it to your environment variables.');
        }

        console.log('Fetching FPGs with params:', {
            latitude,
            longitude,
            radius,
            units
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

        const response = await fetch(`${baseUrl}?${params}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch FPGs: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`Found ${data.length} FPGs from Joshua Project API`);
        
        return data.map(fpg => ({
            country: fpg.country.name,
            name: fpg.peo_name || fpg.name,
            latitude: parseFloat(fpg.latitude),
            longitude: parseFloat(fpg.longitude),
            population: parseInt(fpg.population) || 0,
            language: fpg.primary_language_name,
            religion: fpg.primary_religion,
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
        // Load UUPG data if not already loaded
        if (uupgData.length === 0) {
            await loadUUPGData();
        }

        // Find the selected UPG
        const selectedUpg = uupgData.find(upg => 
            upg.country === country && upg.name === upgName
        );
        
        if (!selectedUpg) {
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