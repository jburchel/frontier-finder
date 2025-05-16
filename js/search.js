import { config } from './config.js';
import { jpApi } from './api.js';
import { pronunciationService } from './services/pronunciationService.js';

/**
 * Search service for finding people groups
 */
class SearchService {
    constructor() {
        this.jpApi = jpApi;
        this.initialized = false;
        this.currentUPGs = [];
        this.pronunciationMap = {};
    }

    /**
     * Initialize the search service
     */
    async initialize() {
        try {
            console.log('Initializing search service...');
            
            // Load current UPGs
            this.currentUPGs = await this.loadCSV('data/current_upgs.csv');
            console.log('Loaded current UPGs:', this.currentUPGs.length);
            
            // UUPG data will be fetched directly from Joshua Project API
            
            // Load pronunciations
            try {
                const response = await fetch('js/data/pronunciations.json');
                if (response.ok) {
                    this.pronunciationMap = await response.json();
                    console.log('Loaded pronunciations:', Object.keys(this.pronunciationMap).length);
                }
            } catch (e) {
                console.warn('Failed to load pronunciations:', e);
                this.pronunciationMap = {};
            }
            
            this.initialized = true;
            console.log('Search service initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize search service:', error);
            throw error;
        }
    }

    /**
     * Load CSV file and parse it
     * @param {string} url - URL of the CSV file
     * @returns {Promise<Array>} - Array of objects
     */
    async loadCSV(url) {
        try {
            console.log('Loading CSV from:', url);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
            }
            
            const text = await response.text();
            console.log('CSV loaded, size:', text.length, 'bytes');
            
            // Parse CSV
            const rows = text.split('\n');
            console.log('CSV rows:', rows.length);
            
            if (rows.length < 2) {
                throw new Error('CSV file is empty or malformed');
            }
            
            const headers = rows[0].split(',');
            console.log('CSV headers:', headers);
            
            const result = [];
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;
                
                const values = rows[i].split(',');
                
                // Skip rows with insufficient values
                if (values.length < 3) {
                    console.warn(`Skipping row ${i} due to insufficient values:`, values);
                    continue;
                }
                
                const obj = {};
                
                // Ensure we have the required fields
                let hasRequiredFields = false;
                let hasCountry = false;
                
                for (let j = 0; j < headers.length && j < values.length; j++) {
                    const header = headers[j].trim();
                    const value = values[j] ? values[j].trim() : '';
                    
                    obj[header] = value;
                    
                    // Check if this is the country field and it has a value
                    if ((header === 'Country' || header === 'country') && value) {
                        hasCountry = true;
                    }
                    
                    // Check if we have the name field
                    if ((header === 'Name' || header === 'name') && value) {
                        hasRequiredFields = true;
                    }
                }
                
                // Skip rows without required fields
                if (!hasRequiredFields || !hasCountry) {
                    console.warn(`Skipping row ${i} due to missing required fields:`, { hasName: hasRequiredFields, hasCountry });
                    continue;
                }
                
                // Normalize field names to lowercase
                if (obj.Name && !obj.name) obj.name = obj.Name;
                if (obj.Country && !obj.country) obj.country = obj.Country;
                if (obj.Latitude && !obj.latitude) obj.latitude = obj.Latitude;
                if (obj.Longitude && !obj.longitude) obj.longitude = obj.Longitude;
                
                // Add pronunciation if available
                const name = obj.name;
                if (name && this.pronunciationMap && this.pronunciationMap[name.toLowerCase()]) {
                    obj.pronunciation = this.pronunciationMap[name.toLowerCase()];
                }
                
                // Add coordinates if available
                if (obj.latitude && obj.longitude) {
                    obj.latitude = parseFloat(obj.latitude);
                    obj.longitude = parseFloat(obj.longitude);
                }
                
                // Only add UPGs with valid coordinates
                if (obj.latitude && obj.longitude && !isNaN(obj.latitude) && !isNaN(obj.longitude)) {
                    result.push(obj);
                } else {
                    console.warn(`Skipping row ${i} due to invalid coordinates:`, { lat: obj.latitude, lng: obj.longitude });
                }
            }
            
            console.log(`Successfully parsed ${result.length} valid UPGs with countries from CSV`);
            
            // Log the first few results for debugging
            if (result.length > 0) {
                console.log('Sample UPG data:', result.slice(0, 3));
                
                // Log unique countries for debugging
                const countries = new Set();
                result.forEach(upg => {
                    if (upg.country) {
                        countries.add(upg.country);
                    }
                });
                console.log(`Found ${countries.size} unique countries in UPG data`);
            } else {
                console.error('No valid UPGs found in CSV data');
            }
            
            return result;
        } catch (error) {
            console.error('Failed to load CSV:', error);
            console.error('Error details:', error.message);
            
            // Return an empty array with a test country to prevent initialization failures
            console.log('Returning test data to prevent initialization failure');
            return [
                {
                    name: 'Test UPG',
                    country: 'Test Country',
                    latitude: 0,
                    longitude: 0
                }
            ];
        }
    }

    /**
     * Get UPGs for a country
     * @param {string} country - Country name
     * @returns {Promise<Array>} - Array of UPGs
     */
    async getUPGsForCountry(country) {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.currentUPGs.filter(upg => upg.country === country);
    }

    /**
     * Get countries from current UPGs
     * @returns {Promise<Array>} - Array of country names
     */
    async getCountries() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        // Get unique countries
        const countries = new Set();
        this.currentUPGs.forEach(upg => {
            if (upg.country) {
                countries.add(upg.country);
            }
        });
        
        return Array.from(countries).sort();
    }
    
    /**
     * Get available countries (alias for getCountries for backward compatibility)
     * @returns {Promise<Array>} - Array of country names
     */
    async getAvailableCountries() {
        return this.getCountries();
    }

    /**
     * Get UPG by name
     * @param {string} name - UPG name
     * @returns {Promise<Object>} - UPG object
     */
    async getUPGByName(name) {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.currentUPGs.find(upg => upg.name === name);
    }

    /**
     * Search for people groups near a location
     * @param {Object} baseUPG - Base UPG with coordinates
     * @param {number} radius - Search radius
     * @param {string} units - Units (M for miles, K for kilometers)
     * @param {Array<string>} searchTypes - Array of search types (fpg, uupg, zero)
     * @returns {Promise<Array>} - Array of nearby people groups
     */
    // Test function to verify distance calculations
    testDistanceCalculation() {
        // Test with known coordinates and distances
        const testCases = [
            {
                name: 'New York to Los Angeles',
                lat1: 40.7128, lon1: -74.0060, // New York
                lat2: 34.0522, lon2: -118.2437, // Los Angeles
                expectedMiles: 2451, // Approximate distance
                tolerance: 50 // Allow some tolerance in the calculation
            },
            {
                name: 'London to Paris',
                lat1: 51.5074, lon1: -0.1278, // London
                lat2: 48.8566, lon2: 2.3522, // Paris
                expectedMiles: 214, // Approximate distance
                tolerance: 10 // Allow some tolerance in the calculation
            },
            {
                name: 'Tokyo to Beijing',
                lat1: 35.6762, lon1: 139.6503, // Tokyo
                lat2: 39.9042, lon2: 116.4074, // Beijing
                expectedMiles: 1303, // Approximate distance
                tolerance: 30 // Allow some tolerance in the calculation
            }
        ];
        
        console.log('SEARCH DEBUG: Running distance calculation tests...');
        
        for (const test of testCases) {
            const calculatedDistance = this.calculateDistance(
                test.lat1, test.lon1, test.lat2, test.lon2, 'M'
            );
            
            const difference = Math.abs(calculatedDistance - test.expectedMiles);
            const passed = difference <= test.tolerance;
            
            console.log(`SEARCH DEBUG: Distance test '${test.name}':`, {
                calculated: calculatedDistance.toFixed(2),
                expected: test.expectedMiles,
                difference: difference.toFixed(2),
                passed: passed ? '✓' : '✗'
            });
        }
    }
    
    async searchNearby(baseUPG, radius, units = 'M', searchTypes = ['fpg']) {
        // Run distance calculation tests first
        this.testDistanceCalculation();
        
        // Ensure searchTypes is always an array
        if (!Array.isArray(searchTypes)) {
            searchTypes = [searchTypes];
        }
        
        console.log('SEARCH DEBUG: Starting search with parameters:', {
            baseUPG,
            radius,
            units,
            searchTypes
        });
        
        if (!baseUPG || !baseUPG.latitude || !baseUPG.longitude) {
            console.error('Invalid base UPG or missing coordinates:', baseUPG);
            throw new Error('Invalid base UPG or missing coordinates');
        }
        
        console.log('SEARCH DEBUG: Base UPG coordinates confirmed:', {
            latitude: baseUPG.latitude,
            longitude: baseUPG.longitude
        });
        
        try {
            let results = [];
            
            // Search for FPGs if requested
            if (searchTypes.includes('fpg')) {
                console.log('SEARCH DEBUG: Searching for FPGs...');
                try {
                    const fpgResults = await this.jpApi.searchNearbyFPGs(
                        baseUPG.latitude, 
                        baseUPG.longitude, 
                        radius, 
                        units
                    );
                    
                    console.log('SEARCH DEBUG: FPG search results count:', fpgResults.length);
                    
                    // Filter and process FPG results
                    const filteredFPGs = this.filterFPGs(fpgResults);
                    
                    // Add distance and type to each result
                    const fpgsWithDistance = filteredFPGs.map(group => {
                        const distance = this.calculateDistance(
                            baseUPG.latitude, 
                            baseUPG.longitude, 
                            group.latitude, 
                            group.longitude, 
                            units
                        );
                        
                        return {
                            ...group,
                            distance: parseFloat(distance.toFixed(1)),
                            type: 'FPG'
                        };
                    });
                    
                    console.log('SEARCH DEBUG: Filtered FPGs count:', fpgsWithDistance.length);
                    results = results.concat(fpgsWithDistance);
                } catch (error) {
                    console.error('SEARCH DEBUG: FPG search failed:', error);
                    // Continue with UUPG search even if FPG search fails
                }
            }
            
            // Load UUPG data if needed for any of the search types
            if (searchTypes.includes('uupg') || searchTypes.includes('zero')) {
                console.log('SEARCH DEBUG: Loading UUPG data from CSV file...');
                
                try {
                    // Load UUPGs from local CSV file
                    const uupgsResponse = await fetch('data/uupgs.csv');
                    if (!uupgsResponse.ok) {
                        throw new Error('Failed to load UUPG data');
                    }
                    
                    const uupgsText = await uupgsResponse.text();
                    
                    // Split by newlines and filter out empty rows
                    let uupgsRows = uupgsText.split('\n').filter(row => row.trim().length > 0);
                    
                    console.log('SEARCH DEBUG: Total rows in UUPG CSV (before filtering):', uupgsText.split('\n').length);
                    console.log('SEARCH DEBUG: Total rows in UUPG CSV (after filtering empty rows):', uupgsRows.length);
                    console.log('SEARCH DEBUG: Last 5 rows:', uupgsRows.slice(-5));
                    
                    if (uupgsRows.length < 2) {
                        throw new Error('UUPG data is empty or malformed');
                    }
                    
                    const uupgsHeaders = parseCSVLine(uupgsRows[0]);
                    
                    // Find important column indices
                    const strategicPriorityIndex = uupgsHeaders.findIndex(header => 
                        header.trim().includes('Strategic Priority'));
                    const globalStatusIndex = uupgsHeaders.findIndex(header => 
                        header.trim().includes('Global Status of  Evangelical'));
                    const latitudeIndex = uupgsHeaders.findIndex(header => header.trim() === 'Latitude');
                    const longitudeIndex = uupgsHeaders.findIndex(header => header.trim() === 'Longitude');
                    const peopleNameIndex = uupgsHeaders.findIndex(header => header.trim() === 'PeopleName');
                    
                    console.log('SEARCH DEBUG: Found column indices:', {
                        strategicPriorityIndex,
                        globalStatusIndex,
                        latitudeIndex,
                        longitudeIndex,
                        peopleNameIndex,
                        headers: uupgsHeaders
                    });
                    
                    // Print the first few rows to debug
                    console.log('SEARCH DEBUG: First few rows of data:');
                    for (let i = 1; i < Math.min(5, uupgsRows.length); i++) {
                        const values = parseCSVLine(uupgsRows[i]);
                        console.log(`Row ${i}:`, {
                            peopleName: peopleNameIndex >= 0 ? values[peopleNameIndex] : 'Not found',
                            latitude: latitudeIndex >= 0 ? values[latitudeIndex] : 'Not found',
                            longitude: longitudeIndex >= 0 ? values[longitudeIndex] : 'Not found',
                            strategicPriority: strategicPriorityIndex >= 0 ? values[strategicPriorityIndex] : 'Not found',
                            globalStatus: globalStatusIndex >= 0 ? values[globalStatusIndex] : 'Not found'
                        });
                    }
                    
                    // Function to parse CSV line with proper handling of quoted values
                    function parseCSVLine(line) {
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            
                            if (char === '"') {
                                // Toggle quote state
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                // End of field
                                result.push(current);
                                current = '';
                            } else {
                                // Add character to current field
                                current += char;
                            }
                        }
                        
                        // Add the last field
                        result.push(current);
                        return result;
                    }
                    
                    // Parse the CSV data
                    const allPeopleGroups = [];
                    let uupgCount = 0;
                    let zeroScaleCount = 0;
                    let invalidCoordinatesCount = 0;
                    let outOfRangeCount = 0;
                    let processedRowCount = 0;
                    
                    // Only process valid rows (skip header)
                    for (let i = 1; i < uupgsRows.length; i++) {
                        processedRowCount++;
                        
                        // Skip empty rows
                        if (!uupgsRows[i].trim()) {
                            console.log(`SEARCH DEBUG: Skipping empty row ${i}`);
                            continue;
                        }
                        
                        // Split the row into values, handling quoted values properly
                        // This is a simple CSV parser that handles basic quoted values
                        let values = [];
                        let currentValue = '';
                        let inQuotes = false;
                        
                        const rowChars = uupgsRows[i].split('');
                        for (let j = 0; j < rowChars.length; j++) {
                            const char = rowChars[j];
                            
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                values.push(currentValue);
                                currentValue = '';
                            } else {
                                currentValue += char;
                            }
                        }
                        
                        // Add the last value
                        values.push(currentValue);
                        
                        // Skip rows with insufficient values
                        if (values.length < 3) {
                            console.log(`SEARCH DEBUG: Skipping row ${i} due to insufficient values (${values.length})`);
                            continue;
                        }
                        
                        // Log every 500th row for debugging
                        if (i % 500 === 0) {
                            console.log(`SEARCH DEBUG: Processing row ${i}:`, {
                                rowLength: uupgsRows[i].length,
                                valuesCount: values.length,
                                firstFewValues: values.slice(0, 3)
                            });
                        }
                        
                        const peopleGroup = {};
                        for (let j = 0; j < uupgsHeaders.length && j < values.length; j++) {
                            const header = uupgsHeaders[j].trim();
                            const value = values[j] ? values[j].trim() : '';
                            peopleGroup[header] = value;
                        }
                        
                        // Add required fields for consistency
                        peopleGroup.name = peopleGroup.PeopleName || peopleGroup.Name || 'Unknown';
                        peopleGroup.country = peopleGroup.Country || 'Unknown';
                        peopleGroup.population = parseInt(peopleGroup.Population || '0');
                        peopleGroup.language = peopleGroup.Language || 'Unknown';
                        peopleGroup.religion = peopleGroup.Religion || 'Unknown';
                        
                        // These values will be set in the filtering section below
                        
                        // Parse coordinates - remove quotes and then parse
                        const cleanLat = peopleGroup.Latitude ? peopleGroup.Latitude.replace(/\"/g, '') : '';
                        const cleanLng = peopleGroup.Longitude ? peopleGroup.Longitude.replace(/\"/g, '') : '';
                        const lat = parseFloat(cleanLat);
                        const lng = parseFloat(cleanLng);
                        
                        // Log coordinate parsing for every 100th row
                        if (i % 100 === 0) {
                            console.log(`SEARCH DEBUG: Row ${i} coordinates:`, {
                                name: peopleGroup.name,
                                rawLat: peopleGroup.Latitude,
                                rawLng: peopleGroup.Longitude,
                                cleanLat,
                                cleanLng,
                                parsedLat: lat,
                                parsedLng: lng,
                                isValid: !isNaN(lat) && !isNaN(lng)
                            });
                        }
                        
                        if (isNaN(lat) || isNaN(lng)) {
                            invalidCoordinatesCount++;
                            
                            // Only log every 10th invalid coordinate to avoid flooding the console
                            if (invalidCoordinatesCount % 10 === 0) {
                                console.log(`SEARCH DEBUG: Skipping row ${i} due to invalid coordinates (${invalidCoordinatesCount} total):`, {
                                    name: peopleGroup.name,
                                    rawLat: peopleGroup.Latitude,
                                    rawLng: peopleGroup.Longitude,
                                    cleanLat,
                                    cleanLng
                                });
                            }
                            continue;
                        }
                        
                        peopleGroup.latitude = lat;
                        peopleGroup.longitude = lng;
                        
                        // Calculate distance
                        const distance = this.calculateDistance(
                            baseUPG.latitude,
                            baseUPG.longitude,
                            lat,
                            lng,
                            units
                        );
                        
                        // Log distance calculation for every 100th row
                        if (i % 100 === 0) {
                            console.log(`SEARCH DEBUG: Row ${i} distance calculation:`, {
                                name: peopleGroup.name,
                                baseUPGCoords: { lat: baseUPG.latitude, lng: baseUPG.longitude },
                                peopleGroupCoords: { lat, lng },
                                distance,
                                radius: parseFloat(radius),
                                units,
                                isWithinRadius: distance <= parseFloat(radius)
                            });
                        }
                        
                        // Log all potential matches that are close to the radius threshold
                        if (distance <= parseFloat(radius) * 1.1 && distance >= parseFloat(radius) * 0.9) {
                            console.log(`SEARCH DEBUG: Row ${i} near radius threshold:`, {
                                name: peopleGroup.name,
                                distance,
                                radius: parseFloat(radius),
                                isWithinRadius: distance <= parseFloat(radius)
                            });
                        }
                        
                        // Check if within radius
                        if (distance <= parseFloat(radius)) {
                            peopleGroup.distance = parseFloat(distance.toFixed(1));
                            
                            // Get the values for filtering
                            const strategicPriority = strategicPriorityIndex >= 0 && values[strategicPriorityIndex] ? 
                                values[strategicPriorityIndex].trim() : '';
                            const globalStatus = globalStatusIndex >= 0 && values[globalStatusIndex] ? 
                                values[globalStatusIndex].trim() : '';
                            
                            // Log every 100th row for debugging
                            if (i % 100 === 0) {
                                console.log(`SEARCH DEBUG: Row ${i} values:`, {
                                    name: peopleGroup.name,
                                    strategicPriority,
                                    globalStatus,
                                    distance,
                                    searchTypes
                                });
                            }
                            
                            // Store these values for filtering
                            peopleGroup.strategicPriority = strategicPriority;
                            peopleGroup.globalStatus = globalStatus;
                            
                            // The CSV may have quotes around the values, so clean them up
                            const cleanStrategicPriority = strategicPriority.replace(/\"/g, '');
                            
                            console.log('SEARCH DEBUG: Cleaned Strategic Priority:', {
                                original: strategicPriority,
                                cleaned: cleanStrategicPriority
                            });
                            
                            // Determine the type based on filters
                            // Check for both possible orderings of the words
                            const isUUPG = cleanStrategicPriority.includes('Unengaged and Unreached') || 
                                         cleanStrategicPriority.includes('Unreached and Unengaged');
                            // Clean up the global status value as well
                            const cleanGlobalStatus = globalStatus.replace(/\"/g, '');
                            
                            console.log('SEARCH DEBUG: Cleaned Global Status:', {
                                original: globalStatus,
                                cleaned: cleanGlobalStatus
                            });
                            
                            const isZeroScale = cleanGlobalStatus === '0' || cleanGlobalStatus === '0.0';
                            
                            // Log all potential matches for debugging
                            if (isUUPG || isZeroScale) {
                                console.log('SEARCH DEBUG: Potential match found:', {
                                    name: peopleGroup.name,
                                    isUUPG,
                                    isZeroScale,
                                    strategicPriority,
                                    cleanStrategicPriority,
                                    globalStatus,
                                    cleanGlobalStatus,
                                    searchTypes,
                                    distance
                                });
                            }
                            
                            // Determine if this people group should be included based on search types
                            let shouldInclude = false;
                            
                            // Set the appropriate type label based on characteristics
                            if (isUUPG && searchTypes.includes('uupg')) {
                                peopleGroup.type = 'UUPG';
                                uupgCount++;
                                shouldInclude = true;
                                console.log('SEARCH DEBUG: Including UUPG:', peopleGroup.name);
                            } else if (isZeroScale && searchTypes.includes('zero')) {
                                peopleGroup.type = 'Zero Scale';
                                zeroScaleCount++;
                                shouldInclude = true;
                                console.log('SEARCH DEBUG: Including Zero Scale:', peopleGroup.name);
                            } else {
                                peopleGroup.type = 'UPG';
                            }
                            
                            // Add to results if it matches any of the selected search types
                            if (shouldInclude) {
                                allPeopleGroups.push(peopleGroup);
                            }
                        } else {
                            // Track people groups outside the radius
                            outOfRangeCount++;
                            
                            // Log every 100th out-of-range people group
                            if (outOfRangeCount % 100 === 0) {
                                console.log(`SEARCH DEBUG: People group outside radius (${outOfRangeCount} total):`, {
                                    name: peopleGroup.name,
                                    distance: distance.toFixed(1),
                                    radius: parseFloat(radius)
                                });
                            }
                        }
                    }
                    
                    // Log summary statistics
                    console.log('SEARCH DEBUG: Processing summary:', {
                        totalRows: uupgsRows.length,
                        processedRows: processedRowCount,
                        invalidCoordinates: invalidCoordinatesCount,
                        outOfRange: outOfRangeCount,
                        withinRange: allPeopleGroups.length,
                        uupgs: uupgCount,
                        zeroScale: zeroScaleCount
                    });
                    
                    console.log(`SEARCH DEBUG: Found ${allPeopleGroups.length} people groups within ${radius} ${units} using local data`);
                    console.log(`SEARCH DEBUG: Breakdown - UUPGs: ${uupgCount}, Zero Scale: ${zeroScaleCount}`);
                    
                    // Add the people groups to the results
                    results = results.concat(allPeopleGroups);
                    
                } catch (error) {
                    console.error('SEARCH DEBUG: Error loading local UUPG data:', error);
                    
                    // We'll skip the API fallback for Zero Scale search since that requires local data
                    // Only try API fallback for UUPG search type
                    if (searchTypes.includes('uupg')) {
                        try {
                            console.log('SEARCH DEBUG: Falling back to API for UUPGs');
                            const uupgResults = await this.jpApi.searchNearbyUUPGs(
                                baseUPG.latitude, 
                                baseUPG.longitude, 
                                radius, 
                                units
                            );
                            
                            console.log('SEARCH DEBUG: UUPG API call completed');
                            console.log('SEARCH DEBUG: UUPG search results count:', uupgResults.length);
                            
                            // Add type to each result (distance is already calculated in API call)
                            const uupgsWithType = uupgResults.map(group => ({
                                ...group,
                                type: 'UUPG'
                            }));
                            
                            results = results.concat(uupgsWithType);
                        } catch (apiError) {
                            console.error('SEARCH DEBUG: API fallback also failed:', apiError);
                            // Continue with existing results even if both methods fail
                        }
                    } else {
                        console.log('SEARCH DEBUG: Skipping API fallback for Zero Scale search');
                    }
                }
            }
            
            console.log(`SEARCH DEBUG: Total results (${searchTypes.join(', ')}):`, results.length);
            
            // Sort by distance
            return results.sort((a, b) => a.distance - b.distance);
            
        } catch (error) {
            console.error('Error searching nearby people groups:', error);
            throw error;
        }
    }

    /**
     * Filter FPG results to ensure they meet criteria
     */
    filterFPGs(groups) {
        return groups.filter(group => {
            // Ensure it has coordinates
            if (!group.latitude || !group.longitude) return false;
            
            // Ensure it's a valid FPG (Frontier field is 'Y')
            return group.frontier === true || group.Frontier === 'Y';
        });
    }

    /**
     * Calculate distance between two points
     * @param {number} lat1 - Latitude of point 1
     * @param {number} lon1 - Longitude of point 1
     * @param {number} lat2 - Latitude of point 2
     * @param {number} lon2 - Longitude of point 2
     * @param {string} unit - Unit (M for miles, K for kilometers)
     * @returns {number} - Distance in specified units
     */
    calculateDistance(lat1, lon1, lat2, lon2, unit = 'M') {
        // Add validation for coordinates
        if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
            console.error('SEARCH DEBUG: Invalid coordinates in distance calculation:', { lat1, lon1, lat2, lon2 });
            return Infinity; // Return a large distance for invalid coordinates
        }
        
        if ((lat1 === lat2) && (lon1 === lon2)) {
            return 0;
        }

        const radlat1 = Math.PI * lat1 / 180;
        const radlat2 = Math.PI * lat2 / 180;
        const theta = lon1 - lon2;
        const radtheta = Math.PI * theta / 180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);

        if (dist > 1) {
            dist = 1;
        }

        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515; // Distance in miles

        if (unit === 'K') {
            dist = dist * 1.609344; // Convert to kilometers
        }

        return dist;
    }
}

export const searchService = new SearchService();
export default searchService;
