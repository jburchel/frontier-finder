// Load data from CSV files
let existingUpgData = []; // For dropdown data
let uupgData = []; // For search data

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
async function loadAllData() {
    try {
        // Load existing UPGs for dropdowns
        const existingResponse = await fetch('data/existing_upgs_updated.csv');
        if (!existingResponse.ok) {
            throw new Error(`HTTP error! status: ${existingResponse.status}`);
        }
        const existingCsvText = await existingResponse.text();
        const existingLines = existingCsvText.split('\n').filter(line => line.trim());
        const existingHeaders = parseCSVLine(existingLines[0]);

        existingUpgData = existingLines.slice(1).map(line => {
            const values = parseCSVLine(line);
            const obj = {};
            existingHeaders.forEach((header, index) => {
                let value = values[index] || '';
                if (header === 'latitude' || header === 'longitude' || header === 'population') {
                    value = parseFloat(value) || 0;
                }
                obj[header] = value;
            });
            return obj;
        });

        // Load UUPGs for search
        const uupgResponse = await fetch('data/updated_uupg.csv');
        if (!uupgResponse.ok) {
            throw new Error(`HTTP error! status: ${uupgResponse.status}`);
        }
        const uupgCsvText = await uupgResponse.text();
        const uupgLines = uupgCsvText.split('\n').filter(line => line.trim());
        const uupgHeaders = parseCSVLine(uupgLines[0]);

        uupgData = uupgLines.slice(1).map(line => {
            const values = parseCSVLine(line);
            const obj = {};
            obj.name = values[0] || ''; // PeopleName
            obj.country = values[1] || ''; // Country
            obj.population = parseInt(values[2]) || 0;
            obj.language = values[3] || '';
            obj.religion = values[4] || '';
            obj.latitude = parseFloat(values[5]) || 0;
            obj.longitude = parseFloat(values[6]) || 0;
            return obj;
        });

        console.log('Data loaded:', {
            existingUpgs: existingUpgData.length,
            uupgs: uupgData.length
        });
        
        // Populate the country dropdown
        const countrySelect = document.getElementById('country');
        if (countrySelect) {
            // Clear existing options except the first one
            while (countrySelect.options.length > 1) {
                countrySelect.remove(1);
            }
            
            const countries = getCountries();
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
            });
            
            // Enable the dropdown
            countrySelect.disabled = false;
        }
    } catch (error) {
        console.error('Error loading data:', error);
        // Display error to user
        const countrySelect = document.getElementById('country');
        if (countrySelect) {
            // Clear existing options except the first one
            while (countrySelect.options.length > 1) {
                countrySelect.remove(1);
            }
            const option = document.createElement('option');
            option.textContent = 'Error loading data';
            countrySelect.appendChild(option);
            countrySelect.disabled = true;
        }
    }
}

// Function to get unique countries (from existing UPGs)
function getCountries() {
    return [...new Set(existingUpgData.map(group => group.country))]
        .filter(country => country) // Remove empty values
        .sort();
}

// Function to get UPGs for a country (from existing UPGs)
function getUPGsByCountry(country) {
    return existingUpgData
        .filter(group => group.country === country)
        .sort((a, b) => a.name.localeCompare(b.name));
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
    // Find the reference UPG from existing UPGs
    const referenceUPG = existingUpgData.find(upg => 
        upg.country === country && upg.name === upgName
    );
    
    if (!referenceUPG) {
        console.error('Reference UPG not found:', { country, upgName });
        return { uupgs: [], fpgs: [] };
    }

    console.log('Reference UPG found:', referenceUPG);

    // Search for nearby UUPGs from updated_uupg.csv data
    const uupgs = uupgData
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

// Load data when the script loads
document.addEventListener('DOMContentLoaded', loadAllData);