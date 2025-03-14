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
        this.apiUrl = config.joshuaProject.apiUrl || 'https://api.joshuaproject.net';
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
            // Get all people groups in a single request with a geographic filter
            const queryParams = new URLSearchParams({
                api_key: this.apiKey,
                // Request only the fields we need
                fields: [
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
                ].join(','),
                // Simpler filter to start with
                filter: `latitude>${latitude-5} AND latitude<${latitude+5} AND longitude>${longitude-5} AND longitude<${longitude+5}`,
                limit: '5000'  // Request maximum number of results
            });

            const url = `${this.apiUrl}/v1/people_groups.json?${queryParams}`;
            console.log('Making JP API request for FPGs:', url);
            console.log('Search parameters:', {
                center: { lat: latitude, lon: longitude },
                radius: radius,
                units: units,
                boundingBox: {
                    lat: { min: latitude-5, max: latitude+5 },
                    lon: { min: longitude-5, max: longitude+5 }
                }
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

            const data = await response.json();
            console.log('Raw API response length:', data.length);
            if (data.length > 0) {
                console.log('Sample response item:', {
                    first: data[0],
                    fields: Object.keys(data[0])
                });
            }

            // Filter and process results
            const filtered = data
                .filter(pg => {
                    // Calculate distance
                    const distance = this.calculateDistance(
                        latitude,
                        longitude,
                        pg.Latitude,
                        pg.Longitude,
                        units
                    );
                    pg.Distance = distance;

                    // Keep only results within radius and that are Frontier People Groups
                    const withinRadius = distance <= parseFloat(radius);
                    const isFrontier = pg.Frontier === 'Y';

                    console.log(`Filtering ${pg.PeopNameInCountry}:`, {
                        distance,
                        withinRadius,
                        isFrontier
                    });

                    return withinRadius && isFrontier;
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
                    longitude: parseFloat(pg.Longitude) || 0
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
