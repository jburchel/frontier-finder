import { config } from './config.js';
import fs from 'fs/promises';
import fetch from 'node-fetch';

const JP_API_KEY = config.joshuaProject.apiKey;
const JP_API_URL = config.joshuaProject.apiUrl;
const CSV_FILE = 'data/current_upgs.csv';

// Helper function to delay between API calls
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Normalize a string for comparison
 */
function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')        // Normalize spaces
        .trim();
}

/**
 * Calculate similarity between two strings
 */
function calculateSimilarity(str1, str2) {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);
    
    if (!s1 || !s2) return 0;
    
    // Check for exact match after normalization
    if (s1 === s2) return 1;
    
    // Check if one is contained within the other
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Calculate word overlap
    const words1 = new Set(s1.split(' '));
    const words2 = new Set(s2.split(' '));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
}

/**
 * Make an API request with retry logic
 */
async function makeApiRequest(url, retries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`API request attempt ${attempt}/${retries}: ${url}`);
            const response = await fetch(url);
            
            if (response.ok) {
                return response;
            }
            
            console.error(`API error (attempt ${attempt}/${retries}): ${response.status} ${response.statusText}`);
            
            // If we have retries left, wait and try again
            if (attempt < retries) {
                const waitTime = delayMs * attempt; // Exponential backoff
                console.log(`Waiting ${waitTime}ms before retry...`);
                await delay(waitTime);
            }
        } catch (error) {
            console.error(`Network error (attempt ${attempt}/${retries}):`, error.message);
            
            // If we have retries left, wait and try again
            if (attempt < retries) {
                const waitTime = delayMs * attempt; // Exponential backoff
                console.log(`Waiting ${waitTime}ms before retry...`);
                await delay(waitTime);
            }
        }
    }
    
    // If we get here, all retries failed
    return null;
}

/**
 * Fetch location data from Joshua Project API
 */
async function fetchLocationData(name, country) {
    try {
        console.log(`Searching for "${name}" in "${country}"...`);
        
        // Clean up the name and country for searching
        const searchName = name.replace(/[()[\]"]/g, '').split(',')[0].trim();
        const primaryCountry = country.split(' ')[0].trim();
        
        // Build the URL with only the fields we need
        const fields = [
            'PeopNameInCountry',
            'Ctry',
            'Latitude',
            'Longitude'
        ].join('|');
        
        // First try with both name and country
        let url = `${JP_API_URL}/api/v2/people_groups?api_key=${JP_API_KEY}&fields=${fields}&PeopNameInCountry=${encodeURIComponent(searchName)}&Ctry=${encodeURIComponent(primaryCountry)}`;
        
        let response = await makeApiRequest(url);
        
        if (!response) {
            console.error(`Failed to get response after retries for ${name} in ${country}`);
            return null;
        }
        
        let responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (error) {
            console.error('Failed to parse API response:', error);
            console.log('Response text:', responseText.substring(0, 500) + '...');
            return null;
        }
        
        // Handle different response formats
        let peopleGroups = [];
        
        if (Array.isArray(data)) {
            peopleGroups = data;
        } else if (data && typeof data === 'object') {
            if (Array.isArray(data.data)) {
                peopleGroups = data.data;
            } else {
                peopleGroups = [data];
            }
        }
        
        if (!peopleGroups || peopleGroups.length === 0) {
            console.log(`No results found for "${searchName}" in "${primaryCountry}". Trying broader search...`);
            
            // Wait before making another request
            await delay(3000);
            
            // Try just the country
            url = `${JP_API_URL}/api/v2/people_groups?api_key=${JP_API_KEY}&fields=${fields}&Ctry=${encodeURIComponent(primaryCountry)}`;
            
            response = await makeApiRequest(url);
            
            if (!response) {
                console.error(`Failed to get response after retries for broader search in ${country}`);
                return null;
            }
            
            responseText = await response.text();
            
            try {
                data = JSON.parse(responseText);
            } catch (error) {
                console.error('Failed to parse API response:', error);
                return null;
            }
            
            // Handle different response formats again
            if (Array.isArray(data)) {
                peopleGroups = data;
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.data)) {
                    peopleGroups = data.data;
                } else {
                    peopleGroups = [data];
                }
            }
        }

        if (!peopleGroups || peopleGroups.length === 0) {
            console.warn(`No data found for ${name} in ${primaryCountry}`);
            return null;
        }

        console.log(`Found ${peopleGroups.length} potential matches for "${searchName}" in "${primaryCountry}"`);

        // Find best match using similarity scoring
        let bestMatch = null;
        let bestScore = 0;

        for (const pg of peopleGroups) {
            const nameToCompare = pg.PeopNameInCountry || '';
            const score = calculateSimilarity(searchName, nameToCompare);
            
            console.log(`Comparing "${searchName}" with "${nameToCompare}": similarity score ${score.toFixed(2)}`);
            
            if (score > bestScore && score > 0.5) { // Require at least 50% similarity
                bestScore = score;
                bestMatch = pg;
            }
        }

        if (!bestMatch) {
            console.warn(`No close match found for ${name} in ${primaryCountry}`);
            return null;
        }

        // Validate the match
        console.log(`Match found for ${name} in ${primaryCountry}:`, {
            RequestedName: name,
            MatchedName: bestMatch.PeopNameInCountry,
            Similarity: bestScore,
            Latitude: bestMatch.Latitude,
            Longitude: bestMatch.Longitude
        });

        // Return just the location data
        return {
            latitude: bestMatch.Latitude || '',
            longitude: bestMatch.Longitude || ''
        };
    } catch (error) {
        console.error(`Error fetching data for ${name} in ${country}:`, error);
        return null;
    }
}

/**
 * Process the CSV file and update missing location data
 */
async function updateLocationData() {
    try {
        // Read the CSV file
        const csvContent = await fs.readFile(CSV_FILE, 'utf-8');
        let rows = csvContent.split('\n')
            .map(row => row.trim())
            .filter(row => row); // Remove empty rows

        // Parse the header row
        const headerRow = rows[0];
        const headers = headerRow.split(',').map(h => h.trim());
        
        // Get indices of columns we need
        const nameIndex = headers.indexOf('Name');
        const countryIndex = headers.indexOf('Country');
        const latIndex = headers.indexOf('Latitude');
        const lngIndex = headers.indexOf('Longitude');
        
        console.log('Column indices:', {
            Name: nameIndex,
            Country: countryIndex,
            Latitude: latIndex,
            Longitude: lngIndex
        });
        
        if (nameIndex === -1 || countryIndex === -1 || latIndex === -1 || lngIndex === -1) {
            console.error('Required columns not found in CSV file');
            return;
        }
        
        // Convert all rows to arrays for easier manipulation
        const rowsAsArrays = rows.map(row => row.split(',').map(v => v.trim()));
        const headerRowArray = rowsAsArrays[0];
        
        // Count how many rows need location data
        const rowsNeedingLocation = rowsAsArrays.slice(1).filter(row => 
            row.length > nameIndex && 
            row.length > countryIndex && 
            row[nameIndex] && 
            row[countryIndex] && 
            ((row.length <= latIndex || !row[latIndex]) || 
             (row.length <= lngIndex || !row[lngIndex]))
        );
        
        console.log(`Found ${rowsNeedingLocation.length} rows with missing location data`);
        
        // Ask how many rows to process
        const processLimit = process.env.PROCESS_LIMIT ? 
            Math.min(parseInt(process.env.PROCESS_LIMIT), rowsNeedingLocation.length) : 
            rowsNeedingLocation.length;
        
        console.log(`Will process up to ${processLimit} rows`);
        
        let updatedCount = 0;
        let processedCount = 0;
        
        // Process each row that needs location data
        for (let i = 1; i < rowsAsArrays.length && processedCount < processLimit; i++) {
            const rowValues = rowsAsArrays[i];
            
            // Skip rows that already have location data or don't have name/country
            if (rowValues.length <= nameIndex || 
                rowValues.length <= countryIndex || 
                !rowValues[nameIndex] || 
                !rowValues[countryIndex] ||
                (rowValues.length > latIndex && rowValues[latIndex] && 
                 rowValues.length > lngIndex && rowValues[lngIndex])) {
                continue;
            }
            
            processedCount++;
            
            const name = rowValues[nameIndex];
            const country = rowValues[countryIndex];
            
            console.log(`Row ${i}/${rowsAsArrays.length-1}: Processing ${name} in ${country}...`);
            const locationData = await fetchLocationData(name, country);
            
            if (locationData) {
                // Ensure rowValues has enough elements
                while (rowValues.length <= Math.max(latIndex, lngIndex)) {
                    rowValues.push('');
                }
                
                // Update location values
                if (locationData.latitude && (!rowValues[latIndex] || rowValues[latIndex] === '')) {
                    rowValues[latIndex] = locationData.latitude;
                }
                if (locationData.longitude && (!rowValues[lngIndex] || rowValues[lngIndex] === '')) {
                    rowValues[lngIndex] = locationData.longitude;
                }
                
                console.log(`Updated location for ${name} in ${country}: Lat=${locationData.latitude}, Lng=${locationData.longitude}`);
                updatedCount++;
            } else {
                console.log(`No location data found for ${name} in ${country}`);
            }
            
            // Add delay between API calls to prevent rate limiting
            console.log(`Waiting 3 seconds before next request...`);
            await delay(3000);
            
            // Save progress every 5 rows
            if (processedCount % 5 === 0 || processedCount === processLimit) {
                console.log(`Saving progress after processing ${processedCount}/${processLimit} rows...`);
                // Convert all rows back to CSV strings
                const updatedCsvContent = rowsAsArrays.map(row => row.join(',')).join('\n');
                await fs.writeFile(CSV_FILE, updatedCsvContent, 'utf-8');
            }
        }
        
        // Write the final updated content back to the file
        const finalCsvContent = rowsAsArrays.map(row => row.join(',')).join('\n');
        await fs.writeFile(CSV_FILE, finalCsvContent, 'utf-8');
        console.log(`CSV file has been updated successfully! Updated location data for ${updatedCount} rows.`);
        
    } catch (error) {
        console.error('Error processing CSV:', error);
    }
}

// Run the script
console.log('Starting Location data update process...');
updateLocationData().then(() => {
    console.log('Location update process completed.');
}).catch(error => {
    console.error('Error in location update process:', error);
}); 