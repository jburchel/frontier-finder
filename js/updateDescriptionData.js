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
 * Fetch description data from Joshua Project API
 */
async function fetchDescriptionData(name, country) {
    try {
        console.log(`Searching for "${name}" in "${country}"...`);
        
        // Clean up the name and country for searching
        const searchName = name.replace(/[()[\]"]/g, '').split(',')[0].trim();
        const primaryCountry = country.split(' ')[0].trim();
        
        // Build the URL with more comprehensive fields for a better description
        const fields = [
            'PeopNameInCountry',
            'Ctry',
            'ReligionSubdivision',
            'LocationInCountry',
            'PrimaryReligion',
            'JPScale',
            'Frontier',
            'LeastReached',
            'PercentEvangelical',
            'PercentAdherents',
            'Population',
            'PrimaryLanguageName',
            'CasteClass',
            'IndigenousCode',
            'Progress'
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
            ReligionSubdivision: bestMatch.ReligionSubdivision,
            LocationInCountry: bestMatch.LocationInCountry
        });

        // Create a comprehensive description using multiple fields
        let descriptionParts = [];
        
        // Add population information
        if (bestMatch.Population) {
            descriptionParts.push(`Population of approximately ${bestMatch.Population.toLocaleString()}.`);
        }
        
        // Add location information
        if (bestMatch.LocationInCountry) {
            descriptionParts.push(`Located in ${bestMatch.LocationInCountry}.`);
        }
        
        // Add language information
        if (bestMatch.PrimaryLanguageName) {
            descriptionParts.push(`Primary language is ${bestMatch.PrimaryLanguageName}.`);
        }
        
        // Add religion information
        if (bestMatch.PrimaryReligion) {
            let religionInfo = `Primary religion is ${bestMatch.PrimaryReligion}`;
            if (bestMatch.ReligionSubdivision) {
                religionInfo += ` (${bestMatch.ReligionSubdivision})`;
            }
            religionInfo += '.';
            descriptionParts.push(religionInfo);
        }
        
        // Add evangelical percentage
        if (bestMatch.PercentEvangelical !== undefined) {
            descriptionParts.push(`Evangelical Christian: ${bestMatch.PercentEvangelical}%.`);
        }
        
        // Add Christian adherents percentage
        if (bestMatch.PercentAdherents !== undefined) {
            descriptionParts.push(`Christian Adherents: ${bestMatch.PercentAdherents}%.`);
        }
        
        // Add status information
        let statusInfo = [];
        if (bestMatch.Frontier === 'Y') {
            statusInfo.push('a Frontier People Group (less than 0.1% Christian)');
        }
        if (bestMatch.LeastReached === 'Y') {
            statusInfo.push('Least-Reached (less than 2% Evangelical Christian)');
        }
        if (statusInfo.length > 0) {
            descriptionParts.push(`This group is ${statusInfo.join(' and ')}.`);
        }
        
        // Add JPScale information
        if (bestMatch.JPScale) {
            const jpScaleDescriptions = {
                '1': 'Unreached',
                '2': 'Minimally Reached',
                '3': 'Somewhat Reached',
                '4': 'Significantly Reached',
                '5': 'Reached'
            };
            const jpScaleDescription = jpScaleDescriptions[bestMatch.JPScale] || `JPScale ${bestMatch.JPScale}`;
            descriptionParts.push(`Joshua Project Progress Scale: ${jpScaleDescription}.`);
        }
        
        // Add caste information for South Asian groups
        if (bestMatch.CasteClass) {
            descriptionParts.push(`Caste/Class: ${bestMatch.CasteClass}.`);
        }
        
        // Add indigenous status
        if (bestMatch.IndigenousCode === 'Y') {
            descriptionParts.push('This group is indigenous to this country.');
        }
        
        // Add progress information
        if (bestMatch.Progress) {
            descriptionParts.push(`Current progress: ${bestMatch.Progress}.`);
        }
        
        // Join all parts into a comprehensive description
        const description = descriptionParts.join(' ');
        
        return description || 'No detailed information available.';
    } catch (error) {
        console.error(`Error fetching data for ${name} in ${country}:`, error);
        return null;
    }
}

/**
 * Process the CSV file and update missing description data
 */
async function updateDescriptionData() {
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
        const descIndex = headers.indexOf('Description');
        
        console.log('Column indices:', {
            Name: nameIndex,
            Country: countryIndex,
            Description: descIndex
        });
        
        if (nameIndex === -1 || countryIndex === -1 || descIndex === -1) {
            console.error('Required columns not found in CSV file');
            return;
        }
        
        // Convert all rows to arrays for easier manipulation
        const rowsAsArrays = rows.map(row => row.split(',').map(v => v.trim()));
        const headerRowArray = rowsAsArrays[0];
        
        // Count how many rows need description data
        const rowsNeedingDescription = rowsAsArrays.slice(1).filter(row => 
            row.length > nameIndex && 
            row.length > countryIndex && 
            row[nameIndex] && 
            row[countryIndex] && 
            (row.length <= descIndex || !row[descIndex])
        );
        
        console.log(`Found ${rowsNeedingDescription.length} rows with missing description data`);
        
        // Ask how many rows to process
        const processLimit = process.env.PROCESS_LIMIT ? 
            Math.min(parseInt(process.env.PROCESS_LIMIT), rowsNeedingDescription.length) : 
            rowsNeedingDescription.length;
        
        console.log(`Will process up to ${processLimit} rows`);
        
        let updatedCount = 0;
        let processedCount = 0;
        
        // Process each row that needs description data
        for (let i = 1; i < rowsAsArrays.length && processedCount < processLimit; i++) {
            const rowValues = rowsAsArrays[i];
            
            // Skip rows that already have description data or don't have name/country
            if (rowValues.length <= nameIndex || 
                rowValues.length <= countryIndex || 
                !rowValues[nameIndex] || 
                !rowValues[countryIndex] ||
                (rowValues.length > descIndex && rowValues[descIndex])) {
                continue;
            }
            
            processedCount++;
            
            const name = rowValues[nameIndex];
            const country = rowValues[countryIndex];
            
            console.log(`Row ${i}/${rowsAsArrays.length-1}: Processing ${name} in ${country}...`);
            const description = await fetchDescriptionData(name, country);
            
            if (description) {
                // Ensure rowValues has enough elements
                while (rowValues.length <= descIndex) {
                    rowValues.push('');
                }
                
                // Update description value
                rowValues[descIndex] = description;
                console.log(`Updated description for ${name} in ${country}: ${description}`);
                updatedCount++;
            } else {
                console.log(`No description data found for ${name} in ${country}`);
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
        console.log(`CSV file has been updated successfully! Updated description data for ${updatedCount} rows.`);
        
    } catch (error) {
        console.error('Error processing CSV:', error);
    }
}

// Run the script
console.log('Starting Description data update process...');
updateDescriptionData().then(() => {
    console.log('Description update process completed.');
}).catch(error => {
    console.error('Error in description update process:', error);
}); 