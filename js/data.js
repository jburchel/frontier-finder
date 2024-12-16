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
        const existingText = await existingResponse.text();
        const existingLines = existingText.split('\n');
        
        // Skip header row and parse data
        const header = existingLines[0].split(',');
        existingUpgData = existingLines.slice(1).map(line => {
            const values = parseCSVLine(line);
            return {
                country: values[0],
                name: values[1],
                latitude: parseFloat(values[2]),
                longitude: parseFloat(values[3]),
                id: values[4] || values[1] // Use name as ID if no ID provided
            };
        });

        // Load UUPGs for search
        console.log('Loading UUPGs data...');
        const uupgResponse = await fetch('data/uupgs.csv');
        const uupgText = await uupgResponse.text();
        const uupgLines = uupgText.split('\n');
        
        // Skip header row and parse data
        uupgData = uupgLines.slice(1).map(line => {
            const values = line.split(',');
            return {
                country: values[0],
                name: values[1],
                latitude: parseFloat(values[2]),
                longitude: parseFloat(values[3]),
                population: parseInt(values[4], 10),
                language: values[5],
                religion: values[6]
            };
        });

        console.log('Data loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Function to get unique countries from existing UPGs
export function getUniqueCountries() {
    const countries = new Set(existingUpgData.map(upg => upg.country));
    return Array.from(countries).sort();
}

// Function to get UPGs for a country
export function getUpgsForCountry(country) {
    return existingUpgData.filter(upg => upg.country === country);
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
export async function searchNearby(country, upgId, radius, units = 'kilometers', type = 'both') {
    try {
        // Find the selected UPG
        const selectedUpg = existingUpgData.find(upg => upg.id === upgId);
        if (!selectedUpg) {
            throw new Error('Selected UPG not found');
        }

        const results = {
            fpgs: [],
            uupgs: []
        };

        // Search for UUPGs if type is 'both' or 'uupg'
        if (type === 'both' || type === 'uupg') {
            results.uupgs = uupgData.filter(uupg => {
                const distance = calculateDistance(
                    selectedUpg.latitude,
                    selectedUpg.longitude,
                    uupg.latitude,
                    uupg.longitude,
                    units
                );
                if (distance <= radius) {
                    return { ...uupg, distance };
                }
                return false;
            });
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