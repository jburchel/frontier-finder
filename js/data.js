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

        // Load UUPGs for search
        console.log('Loading UUPGs data...');
        const uupgResponse = await fetch('data/updated_uupg.csv');
        if (!uupgResponse.ok) {
            throw new Error(`Failed to load UUPGs data: ${uupgResponse.statusText}`);
        }
        const uupgText = await uupgResponse.text();
        if (!uupgText.trim()) {
            throw new Error('UUPGs data file is empty');
        }
        
        const uupgLines = uupgText.split('\n').filter(line => line.trim());
        if (uupgLines.length < 2) { // At least header + 1 data row
            throw new Error('UUPGs data file has insufficient data');
        }
        
        // Skip header row and parse data
        uupgData = uupgLines.slice(1).map(line => {
            const values = line.split(',');
            return {
                country: values[0],
                name: values[1],
                latitude: parseFloat(values[2]) || 0,
                longitude: parseFloat(values[3]) || 0,
                population: parseInt(values[4]) || 0,
                language: values[5],
                religion: values[6]
            };
        }).filter(uupg => uupg.country && uupg.name); // Filter out any entries without country or name

        if (uupgData.length === 0) {
            throw new Error('No valid UUPG data found after parsing');
        }

        console.log(`Data loaded successfully - ${existingUpgData.length} UPGs and ${uupgData.length} UUPGs`);
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
        const apiKey = 'YOUR_API_KEY'; // Replace with your Joshua Project API key
        const baseUrl = 'https://api.joshuaproject.net/v1/people_groups.json';
        const params = new URLSearchParams({
            api_key: apiKey,
            latitude,
            longitude,
            radius,
            radius_units: units === 'kilometers' ? 'km' : 'mi',
            frontier_only: 1
        });

        const response = await fetch(`${baseUrl}?${params}`);
        if (!response.ok) {
            throw new Error('Failed to fetch FPGs');
        }

        const data = await response.json();
        return data.map(fpg => ({
            country: fpg.country,
            name: fpg.name,
            latitude: fpg.latitude,
            longitude: fpg.longitude,
            population: fpg.population,
            language: fpg.primary_language_name,
            religion: fpg.primary_religion
        }));
    } catch (error) {
        console.error('Error fetching FPGs:', error);
        return [];
    }
}

// Function to search for nearby people groups
export async function searchNearby(country, upgName, radius, units = 'kilometers', type = 'both') {
    try {
        // Find the selected UPG
        const selectedUpg = existingUpgData.find(upg => 
            upg.country === country && upg.name === upgName
        );
        
        if (!selectedUpg) {
            throw new Error('Selected UPG not found');
        }

        const results = {
            fpgs: [],
            uupgs: []
        };

        // Search for UUPGs if type is 'both' or 'uupg'
        if (type === 'both' || type === 'uupg') {
            results.uupgs = uupgData
                .map(uupg => {
                    const distance = calculateDistance(
                        selectedUpg.latitude,
                        selectedUpg.longitude,
                        uupg.latitude,
                        uupg.longitude,
                        units
                    );
                    return { ...uupg, distance };
                })
                .filter(uupg => uupg.distance <= radius)
                .sort((a, b) => a.distance - b.distance);
        }

        // Search for FPGs if type is 'both' or 'fpg'
        if (type === 'both' || type === 'fpg') {
            results.fpgs = await fetchFPGs(
                selectedUpg.latitude,
                selectedUpg.longitude,
                radius,
                units
            );
        }

        return results;
    } catch (error) {
        console.error('Error searching nearby:', error);
        throw error;
    }
}