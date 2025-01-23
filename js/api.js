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
     * Search for people groups near a location
     */
    async searchPeopleGroups(params) {
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
                    'JPScale'
                ].join(','),
                // Simpler filter to start with
                filter: `latitude>${params.latitude-5} AND latitude<${params.latitude+5} AND longitude>${params.longitude-5} AND longitude<${params.longitude+5}`,
                limit: '5000'  // Request maximum number of results
            });

            const url = `${this.apiUrl}/v1/people_groups.json?${queryParams}`;
            console.log('Making JP API request:', url);
            console.log('Search parameters:', {
                center: { lat: params.latitude, lon: params.longitude },
                radius: params.radius,
                units: params.units,
                boundingBox: {
                    lat: { min: params.latitude-5, max: params.latitude+5 },
                    lon: { min: params.longitude-5, max: params.longitude+5 }
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
                        params.latitude,
                        params.longitude,
                        pg.Latitude,
                        pg.Longitude,
                        params.units
                    );
                    pg.Distance = distance;

                    // Keep only results within radius and with low evangelical percentage
                    const withinRadius = distance <= parseFloat(params.radius);
                    const evangelical = parseFloat(pg.PercentEvangelical || 0);
                    const isFrontier = evangelical < 0.1;

                    console.log(`Filtering ${pg.PeopNameInCountry}:`, {
                        distance,
                        withinRadius,
                        evangelical,
                        isFrontier
                    });

                    return withinRadius && isFrontier;
                })
                .map(pg => ({
                    type: 'FPG',
                    name: pg.PeopNameInCountry || 'Unknown',
                    population: parseInt(pg.Population) || 0,
                    country: pg.Ctry || 'Unknown',
                    religion: pg.PrimaryReligion || 'Unknown',
                    language: pg.PrimaryLanguageName || 'Unknown',
                    distance: `${pg.Distance} ${params.units}`,
                    evangelical: parseFloat(pg.PercentEvangelical) || 0,
                    jpScale: pg.JPScale || '',
                    coordinates: {
                        latitude: parseFloat(pg.Latitude) || 0,
                        longitude: parseFloat(pg.Longitude) || 0
                    }
                }));

            console.log(`Found ${filtered.length} FPGs within ${params.radius} ${params.units}`);
            return filtered;

        } catch (error) {
            console.error('JP API request failed:', error);
            throw error;
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2, unit = 'M') {
        if ((lat1 === lat2) && (lon1 === lon2)) return 0;
        
        const radlat1 = Math.PI * lat1/180;
        const radlat2 = Math.PI * lat2/180;
        const theta = lon1-lon2;
        const radtheta = Math.PI * theta/180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + 
                   Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(Math.min(1, Math.max(-1, dist)));
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515; // Distance in miles
        if (unit === "K") dist = dist * 1.609344; // Convert to kilometers
        return Math.round(dist);
    }
}

// Create and export API instance
export const jpApi = new JoshuaProjectAPI(config);
export default jpApi;
