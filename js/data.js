// Load data from CSV files
let existingUpgData = []; // For dropdown data
let uupgData = []; // For search data

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2, unit = 'mi') {
    const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
        const response = await fetch('updated_uupg.csv');
        const csvText = await response.text();
        console.log('UUPG CSV text length:', csvText.length);

        // Split the CSV into lines and remove empty lines
        const lines = csvText.split('\n').filter(line => line.trim());
        console.log('UUPG CSV lines:', lines.length);

        // Parse headers (first line)
        const headers = lines[0].split(',').map(header => header.trim());
        console.log('UUPG headers:', headers);

        // Parse data rows
        const uupgs = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim());
            if (values.length !== headers.length) continue;

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });

            // Debug log for filtering
            console.log(`Row ${i} engagement:`, row['Evangelical Engagement']);

            // Only include if Evangelical Engagement is exactly 'Unengaged'
            if (row['Evangelical Engagement'] === 'Unengaged') {
                const latitude = parseFloat(row['Latitude']);
                const longitude = parseFloat(row['Longitude']);

                // Skip if coordinates are invalid
                if (isNaN(latitude) || isNaN(longitude)) {
                    console.log(`Skipping UUPG with invalid coordinates: ${row['PeopleName']}`);
                    continue;
                }

                uupgs.push({
                    name: row['PeopleName'] || 'Unknown',
                    country: row['Country'] || 'Unknown',
                    population: parseInt(String(row['Population']).replace(/[^\d]/g, '') || '0'),
                    language: row['Language'] || 'Unknown',
                    religion: row['Religion'] || 'Unknown',
                    latitude: latitude,
                    longitude: longitude,
                    isUUPG: true
                });
            }
        }

        console.log(`Loaded ${uupgs.length} UUPGs from CSV`);
        return uupgs;
    } catch (error) {
        console.error('Error loading UUPG data:', error);
        return [];
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
        console.log('Environment:', window.env);
        const apiKey = window.env?.VITE_JOSHUA_PROJECT_API_KEY;
        console.log('API Key:', apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'not found');
        
        if (!apiKey) {
            throw new Error('Joshua Project API key not found');
        }

        console.log('Fetching FPGs with params:', {
            latitude,
            longitude,
            radius,
            units: units === 'kilometers' ? 'km' : 'mi'
        });

        const params = new URLSearchParams({
            api_key: apiKey,
            latitude: latitude,
            longitude: longitude,
            distance: radius,
            distance_units: units === 'kilometers' ? 'km' : 'mi',
            filter: 'frontier_only',
            limit: 100
        });

        const url = `https://api.joshuaproject.net/v1/people_groups.json?${params.toString()}`;
        console.log('Requesting URL:', url.replace(apiKey, '***API_KEY***'));

        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch FPGs: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);

        if (!Array.isArray(data)) {
            console.log('API response is not an array:', data);
            return [];
        }

        console.log(`Found ${data.length} FPGs from Joshua Project API`);
        return data.map(pg => {
            // Safely handle population parsing
            let population = 0;
            try {
                population = parseInt(String(pg.Population || '0').replace(/[^\d]/g, ''));
            } catch (e) {
                console.warn('Error parsing population:', e);
            }

            // Calculate distance if not provided by API
            let distance = pg.Distance ? parseFloat(pg.Distance) : calculateDistance(
                latitude,
                longitude,
                parseFloat(pg.Latitude),
                parseFloat(pg.Longitude),
                units === 'kilometers' ? 'km' : 'mi'
            );

            return {
                name: pg.PeopNameInCountry || pg.PeopName || 'Unknown',
                country: pg.Ctry || 'Unknown',
                distance: distance,
                population: population,
                language: pg.PrimaryLanguageName || 'Unknown',
                religion: pg.PrimaryReligion || 'Unknown',
                latitude: parseFloat(pg.Latitude) || 0,
                longitude: parseFloat(pg.Longitude) || 0,
                jpScale: pg.JPScale || 'Unknown',
                isFPG: true
            };
        });
    } catch (error) {
        console.error('Error fetching FPGs:', error);
        return [];
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
            isUUPG: true
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