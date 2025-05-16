import { config } from './config.js';

/**
 * Joshua Project API wrapper
 */
class JoshuaProjectAPI {
    constructor(config) {
        if (!config?.joshuaProject?.apiKey) {
            throw new Error('Joshua Project API key is missing from configuration');
        }
        this.apiKey = config.joshuaProject.apiKey;
        this.apiUrl = config.joshuaProject.apiUrl || 'https://joshuaproject.net';
        console.log('JoshuaProjectAPI initialized with:', {
            apiUrl: this.apiUrl,
            hasApiKey: !!this.apiKey
        });
    }

    /**
     * Search for Frontier People Groups near a location
     * @param {number} latitude - Center latitude
     * @param {number} longitude - Center longitude
     * @param {number} radius - Search radius
     * @param {string} units - Units (M for miles, K for kilometers)
     * @returns {Promise<Array>} - Array of FPGs
     */
    async searchNearbyFPGs(latitude, longitude, radius, units = 'M') {
        try {
            // Get all people groups in a single request
            // Using the exact format from the Joshua Project documentation
            const fields = [
                'PeopNameInCountry',
                'Population',
                'Ctry',
                'PrimaryReligion',
                'PrimaryLanguageName',
                'Latitude',
                'Longitude',
                'PercentEvangelical',
                'JPScale',
                'Frontier'
            ].join('|');

            // Build the URL according to the documentation
            const url = `${this.apiUrl}/api/v2/people_groups?api_key=${this.apiKey}&fields=${fields}&Frontier=Y`;
            
            console.log('Making JP API request for FPGs:', url);
            console.log('Search parameters:', {
                center: { lat: latitude, lon: longitude },
                radius: radius,
                units: units
            });

            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('JP API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                    url: url
                });
                throw new Error(`API request failed: ${response.status}`);
            }

            // Parse the JSON response
            const responseText = await response.text();
            console.log('Raw API response text (first 500 chars):', responseText.substring(0, 500));
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
                console.log('Parsed response type:', typeof responseData);
                console.log('Response structure:', Object.keys(responseData));
            } catch (error) {
                console.error('Failed to parse JSON response:', error);
                throw new Error('Failed to parse API response');
            }
            
            // Handle different response formats
            let peopleGroups = [];
            
            if (Array.isArray(responseData)) {
                peopleGroups = responseData;
            } else if (responseData && typeof responseData === 'object') {
                // Check if it's a paginated response with a data property
                if (Array.isArray(responseData.data)) {
                    peopleGroups = responseData.data;
                } else {
                    // If it's a single object, wrap it in an array
                    peopleGroups = [responseData];
                }
            }
            
            console.log('People groups extracted:', peopleGroups.length);
            if (peopleGroups.length > 0) {
                console.log('Sample people group:', peopleGroups[0]);
            }

            // Filter results based on geographic proximity
            const filtered = peopleGroups
                .filter(pg => {
                    // Skip entries without coordinates
                    if (!pg.Latitude || !pg.Longitude) {
                        console.log('Skipping entry without coordinates:', pg.PeopNameInCountry);
                        return false;
                    }
                    
                    // Calculate distance
                    const distance = this.calculateDistance(
                        latitude,
                        longitude,
                        parseFloat(pg.Latitude),
                        parseFloat(pg.Longitude),
                        units
                    );
                    pg.Distance = distance;

                    // Keep only results within radius
                    const withinRadius = distance <= parseFloat(radius);
                    console.log(`${pg.PeopNameInCountry}: distance=${distance.toFixed(1)}${units}, within radius=${withinRadius}`);
                    return withinRadius;
                })
                .map(pg => ({
                    name: pg.PeopNameInCountry || 'Unknown',
                    population: parseInt(pg.Population) || 0,
                    country: pg.Ctry || 'Unknown',
                    religion: pg.PrimaryReligion || 'Unknown',
                    language: pg.PrimaryLanguageName || 'Unknown',
                    evangelical: parseFloat(pg.PercentEvangelical) || 0,
                    jpScale: pg.JPScale || '',
                    Frontier: pg.Frontier,
                    latitude: parseFloat(pg.Latitude) || 0,
                    longitude: parseFloat(pg.Longitude) || 0,
                    distance: parseFloat(pg.Distance.toFixed(1))
                }));

            console.log(`Found ${filtered.length} FPGs within ${radius} ${units}`);
            return filtered;

        } catch (error) {
            console.error('JP API request failed:', error);
            throw error;
        }
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
        if ((lat1 === lat2) && (lon1 === lon2)) return 0;
        
        const radlat1 = Math.PI * lat1/180;
        const radlat2 = Math.PI * lat2/180;
        const theta = lon1-lon2;
        const radtheta = Math.PI * theta/180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + 
                   Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        
        if (dist > 1) {
            dist = 1;
        }
        
        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515; // Distance in miles
        
        if (unit === "K") {
            dist = dist * 1.609344; // Convert to kilometers
        }
        
        return dist;
    }
}

// Create and export API instance
export const jpApi = new JoshuaProjectAPI(config);
export default jpApi;
