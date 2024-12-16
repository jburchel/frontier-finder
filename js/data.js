// Load UUPG data from CSV
const upgData = [];

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2, units = 'km') {
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

// Fetch UPG data from CSV
async function loadUPGData() {
    try {
        const response = await fetch('data/upg_data.csv');
        const csvText = await response.text();
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');

        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, index) => {
                let value = values[index];
                if (header === 'latitude' || header === 'longitude' || header === 'population') {
                    value = parseFloat(value) || 0;
                }
                obj[header.trim()] = value;
            });
            return obj;
        });

        window.upgData = data;
        console.log('UPG data loaded:', data.length, 'records');
    } catch (error) {
        console.error('Error loading UPG data:', error);
    }
}

// Load data when the script loads
loadUPGData();

// Function to get unique countries
function getCountries() {
    const countries = [...new Set(upgData.map(upg => upg.country))];
    return countries.sort();
}

// Function to get UPGs for a country
function getUPGsByCountry(country) {
    return upgData
        .filter(upg => upg.country === country)
        .map(upg => upg.name)
        .sort();
}

// Function to fetch FPGs from Joshua Project API
async function fetchFPGs(latitude, longitude, radius, units) {
    try {
        const response = await fetch(`${config.apiBaseUrl}/people_groups/search?api_key=${config.apiKey}&latitude=${latitude}&longitude=${longitude}&radius=${radius}&radius_units=${units}&is_frontier=true`);
        if (!response.ok) {
            throw new Error('Failed to fetch FPGs from Joshua Project API');
        }
        const data = await response.json();
        return data.map(fpg => ({
            name: fpg.peo_name,
            country: fpg.cntry_name,
            latitude: fpg.latitude,
            longitude: fpg.longitude,
            population: fpg.population,
            language: fpg.primary_language_name,
            religion: fpg.religion_primary_name,
            distance: calculateDistance(
                latitude,
                longitude,
                fpg.latitude,
                fpg.longitude,
                units
            )
        }));
    } catch (error) {
        console.error('Error fetching FPGs:', error);
        return [];
    }
}

// Function to search for nearby people groups
async function searchNearby(country, upgName, radius, units = 'kilometers') {
    // Find the reference UPG
    const referenceUPG = upgData.find(upg => upg.country === country && upg.name === upgName);
    
    if (!referenceUPG) {
        console.error('Reference UPG not found:', { country, upgName });
        return { uupgs: [], fpgs: [] };
    }

    console.log('Reference UPG found:', referenceUPG);

    // Search for nearby UUPGs from CSV data
    const uupgs = upgData
        .filter(upg => upg.country !== country || upg.name !== upgName)
        .map(upg => ({
            ...upg,
            distance: calculateDistance(
                referenceUPG.latitude,
                referenceUPG.longitude,
                upg.latitude,
                upg.longitude,
                units
            )
        }))
        .filter(upg => upg.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);

    // Fetch FPGs from Joshua Project API
    const fpgs = await fetchFPGs(referenceUPG.latitude, referenceUPG.longitude, radius, units);

    return {
        uupgs,
        fpgs: fpgs.sort((a, b) => a.distance - b.distance)
    };
}