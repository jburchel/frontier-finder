import { config } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const JP_API_KEY = config.joshuaProject.apiKey;
const JP_API_URL = config.joshuaProject.apiUrl;
const CSV_FILE = 'data/current_upgs.csv';

// Helper function to delay between API calls
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeString(str) {
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')        // Normalize spaces
        .trim();
}

function calculateSimilarity(str1, str2) {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);
    
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

async function fetchJPData(name, country) {
    try {
        // Clean up the name and country for searching
        const searchName = name.replace(/[()[\]]/g, '').split(',')[0].trim();
        const primaryCountry = country.split(' ')[0].trim();
        
        // First try with both name and country
        let url = `${JP_API_URL}/v1/people_groups.json?api_key=${JP_API_KEY}&name=${encodeURIComponent(searchName)}&country=${encodeURIComponent(primaryCountry)}`;
        let response = await fetch(url);
        let data = await response.json();
        
        // If no results, try just the country
        if (!data || data.length === 0) {
            url = `${JP_API_URL}/v1/people_groups.json?api_key=${JP_API_KEY}&country=${encodeURIComponent(primaryCountry)}`;
            response = await fetch(url);
            data = await response.json();
        }

        if (!data || data.length === 0) {
            console.warn(`No data found for ${name} in ${primaryCountry}`);
            return null;
        }

        // Find best match using similarity scoring
        let bestMatch = null;
        let bestScore = 0;

        for (const pg of data) {
            const score = calculateSimilarity(searchName, pg.PeopleName);
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
            MatchedName: bestMatch.PeopleName,
            Similarity: bestScore,
            Population: bestMatch.Population,
            Language: bestMatch.PrimaryLanguageName
        });

        // Return only if we have at least some key data
        if (!bestMatch.Latitude || !bestMatch.Longitude) {
            console.warn(`Incomplete data for ${name} - missing coordinates`);
            return null;
        }

        return {
            latitude: bestMatch.Latitude,
            longitude: bestMatch.Longitude,
            population: bestMatch.Population || '',
            evangelical: bestMatch.PercentEvangelical || '',
            language: bestMatch.PrimaryLanguageName || '',
            religion: bestMatch.PrimaryReligion || '',
            description: bestMatch.Summary || ''
        };
    } catch (error) {
        console.error(`Error fetching data for ${name} in ${country}:`, error);
        return null;
    }
}

async function processCSV() {
    try {
        // Read the CSV file
        const csvContent = await fs.readFile(CSV_FILE, 'utf-8');
        let rows = csvContent.split('\n')
            .map(row => row.trim())
            .filter(row => row); // Remove empty rows

        // Store original headers
        const originalHeaders = rows[0];
        
        // Process each row
        const updatedRows = [originalHeaders];
        
        // Process rows with a delay between API calls
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].split(',').map(v => v.trim());
            const name = values[0];
            const country = values[1];
            
            // Only update if we have a name and country
            if (name && country) {
                // Check if row needs update (has missing data)
                const hasAllData = values.length >= 9 && 
                                 values.slice(2).every(val => val && val !== '');
                
                if (!hasAllData) {
                    console.log(`Processing ${name} in ${country} (row ${i})...`);
                    const jpData = await fetchJPData(name, country);
                    
                    if (jpData) {
                        // Ensure values array has enough elements
                        while (values.length < 9) {
                            values.push('');
                        }
                        
                        // Only update empty or missing values
                        if (!values[2]) values[2] = jpData.latitude;
                        if (!values[3]) values[3] = jpData.longitude;
                        if (!values[4]) values[4] = jpData.population;
                        if (!values[5]) values[5] = jpData.evangelical;
                        if (!values[6]) values[6] = jpData.language;
                        if (!values[7]) values[7] = jpData.religion;
                        if (!values[8]) values[8] = jpData.description;
                        
                        console.log(`Updated data for ${name} in ${country}`);
                    } else {
                        console.log(`No updates made for ${name} in ${country}`);
                    }
                    
                    // Add delay between API calls to prevent rate limiting
                    await delay(1000);
                }
            }
            
            // Add the row (updated or not) to our results
            updatedRows.push(values.join(','));
        }
        
        // Write the updated content back to the file
        await fs.writeFile(CSV_FILE, updatedRows.join('\n'), 'utf-8');
        console.log('CSV file has been updated successfully!');
        
    } catch (error) {
        console.error('Error processing CSV:', error);
    }
}

// Run the script
processCSV().catch(console.error);
