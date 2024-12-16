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
        console.log('Loaded existing UPGs CSV:', existingCsvText.slice(0, 200) + '...');
        
        const existingLines = existingCsvText.split('\n').filter(line => line.trim());
        const existingHeaders = parseCSVLine(existingLines[0]);
        console.log('Existing UPG headers:', existingHeaders);

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

        console.log('Parsed existing UPGs:', existingUpgData.slice(0, 2));

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
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Function to get unique countries from existing UPGs
function getUniqueCountries() {
    const countries = [...new Set(existingUpgData.map(group => group.country))]
        .filter(country => country) // Remove empty values
        .sort();
    return countries;
}

// Function to populate country dropdown
function populateCountryDropdown() {
    const countrySelect = document.getElementById('country');
    const countries = getUniqueCountries();
    
    countrySelect.innerHTML = '<option value="">Select a Country</option>';
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
}

// Function to get UPGs for a country (from existing UPGs)
function getUPGsByCountry(country) {
    console.log('Getting UPGs for country:', country);
    if (!existingUpgData) {
        console.error('UPG data not loaded yet');
        return [];
    }
    console.log('Total existing UPGs:', existingUpgData.length);
    const upgs = existingUpgData
        .filter(group => group.country && group.country.trim().toLowerCase() === country.trim().toLowerCase())
        .sort((a, b) => a.name.localeCompare(b.name));
    console.log('Found UPGs:', upgs);
    return upgs;
}

// Function to fetch FPGs from Joshua Project API
async function fetchFPGs(latitude, longitude, radius, units) {
    // Validate API key before making the request
    if (!window.validateApiKey()) {
        console.error('API key validation failed');
        return [];
    }

    try {
        // Convert units to match Joshua Project's expectations
        const jpUnits = units === 'kilometers' ? 'km' : 'mi';
        
        // Construct API URL with correct parameters
        const apiUrl = `${window.jpConfig.apiBaseUrl}/v1/people_groups.json?api_key=${window.jpConfig.apiKey}&latitude=${latitude}&longitude=${longitude}&radius=${radius}&radius_units=${jpUnits}&frontier_only=1`;
        console.log('Fetching FPGs with URL:', apiUrl);

        const response = await fetch(apiUrl);
        console.log('FPG API Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('FPG API Error:', errorData);
            throw new Error(`Failed to fetch FPGs: ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('FPG API Response data:', data);

        // Handle both array and object responses
        const peopleGroups = Array.isArray(data) ? data : data.people_groups || [];
        console.log('People groups found:', peopleGroups.length);

        const mappedData = peopleGroups
            .map(fpg => {
                const fpgLat = parseFloat(fpg.latitude || fpg.Latitude) || 0;
                const fpgLon = parseFloat(fpg.longitude || fpg.Longitude) || 0;
                const distance = calculateDistance(
                    latitude,
                    longitude,
                    fpgLat,
                    fpgLon,
                    units
                );

                return {
                    name: fpg.peo_name || fpg.PeopNameInCountry,
                    country: fpg.cntry_name || fpg.Ctry,
                    latitude: fpgLat,
                    longitude: fpgLon,
                    population: parseInt(fpg.population || fpg.Population) || 0,
                    language: fpg.primary_language_name || fpg.PrimaryLanguageName,
                    religion: fpg.religion_primary_name || fpg.PrimaryReligion,
                    distance
                };
            })
            .filter(fpg => fpg.distance <= parseFloat(radius))
            .sort((a, b) => a.distance - b.distance);

        console.log('Filtered and sorted FPGs:', {
            total: peopleGroups.length,
            filtered: mappedData.length,
            radius,
            units
        });

        return mappedData;
    } catch (error) {
        console.error('Error fetching FPGs:', error);
        document.getElementById('fpgList').innerHTML = 
            `<p class="error">⚠️ Error fetching FPGs: ${error.message}</p>`;
        return [];
    }
}

// Function to search for nearby people groups
async function searchNearby(country, upgName, radius, units = 'kilometers') {
    console.log('Starting search with:', { country, upgName, radius, units });

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

    console.log('Found UUPGs:', uupgs.length);

    // Fetch FPGs from Joshua Project API
    console.log('Fetching FPGs for coordinates:', {
        lat: referenceUPG.latitude,
        lon: referenceUPG.longitude,
        radius,
        units
    });
    
    const fpgs = await fetchFPGs(
        referenceUPG.latitude,
        referenceUPG.longitude,
        radius,
        units
    );

    console.log('Found FPGs:', fpgs.length);

    return {
        uupgs,
        fpgs: fpgs.sort((a, b) => a.distance - b.distance)
    };
}

// Initialize data when the script loads
loadAllData().then(() => {
    console.log('Data loaded successfully');
    populateCountryDropdown();
}).catch(error => {
    console.error('Error loading data:', error);
});