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
        console.log('Loading existing UPGs data...');
        const existingResponse = await fetch('data/existing_upgs_updated.csv');
        if (!existingResponse.ok) {
            throw new Error(`Failed to load existing UPGs: HTTP ${existingResponse.status}`);
        }
        const existingCsvText = await existingResponse.text();
        if (!existingCsvText.trim()) {
            throw new Error('Existing UPGs CSV is empty');
        }
        console.log('Successfully loaded existing UPGs CSV');
        
        const existingLines = existingCsvText.split('\n').filter(line => line.trim());
        const existingHeaders = parseCSVLine(existingLines[0]);
        console.log('Existing UPG headers:', existingHeaders);

        if (existingLines.length < 2) {
            throw new Error('No data rows found in existing UPGs CSV');
        }

        existingUpgData = existingLines.slice(1).map((line, index) => {
            try {
                const values = parseCSVLine(line);
                const obj = {};
                existingHeaders.forEach((header, i) => {
                    let value = values[i] || '';
                    if (header === 'latitude' || header === 'longitude' || header === 'population') {
                        value = parseFloat(value) || 0;
                    }
                    obj[header] = value;
                });
                return obj;
            } catch (err) {
                console.error(`Error parsing line ${index + 2} of existing UPGs:`, err);
                return null;
            }
        }).filter(Boolean);

        console.log(`Parsed ${existingUpgData.length} existing UPGs`);

        // Load UUPGs for search
        console.log('Loading UUPGs data...');
        const uupgResponse = await fetch('data/updated_uupg.csv');
        if (!uupgResponse.ok) {
            throw new Error(`Failed to load UUPGs: HTTP ${uupgResponse.status}`);
        }
        const uupgCsvText = await uupgResponse.text();
        if (!uupgCsvText.trim()) {
            throw new Error('UUPGs CSV is empty');
        }
        console.log('Successfully loaded UUPGs CSV');

        const uupgLines = uupgCsvText.split('\n').filter(line => line.trim());
        const uupgHeaders = parseCSVLine(uupgLines[0]);
        console.log('UUPG headers:', uupgHeaders);

        if (uupgLines.length < 2) {
            throw new Error('No data rows found in UUPGs CSV');
        }

        uupgData = uupgLines.slice(1).map((line, index) => {
            try {
                const values = parseCSVLine(line);
                return {
                    name: values[0] || '', // PeopleName
                    country: values[1] || '', // Country
                    population: parseInt(values[2]) || 0, // Population
                    language: values[3] || '', // Language
                    religion: values[4] || '', // Religion
                    latitude: parseFloat(values[5]) || 0, // Latitude
                    longitude: parseFloat(values[6]) || 0 // Longitude
                };
            } catch (err) {
                console.error(`Error parsing line ${index + 2} of UUPGs:`, err);
                return null;
            }
        }).filter(Boolean); // Remove any null entries from parsing errors

        console.log(`Parsed ${uupgData.length} UUPGs`);

        console.log('Data loading complete:', {
            existingUpgs: existingUpgData.length,
            uupgs: uupgData.length
        });

        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
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
            .sort((a, b) => b.distance - a.distance);

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
    console.log('Total UUPGs in dataset:', uupgData.length);

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
        .map(upg => {
            const distance = calculateDistance(
                referenceUPG.latitude,
                referenceUPG.longitude,
                upg.latitude,
                upg.longitude,
                units
            );
            console.log(`Distance to ${upg.name} (${upg.country}):`, distance, units);
            return {
                ...upg,
                distance
            };
        })
        .filter(upg => {
            const withinRadius = upg.distance <= parseFloat(radius);
            if (withinRadius) {
                console.log(`Found UUPG within radius: ${upg.name} (${upg.distance} ${units})`);
            }
            return withinRadius;
        })
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