import { config } from './config.js';

/**
 * API handling for Joshua Project interactions
 */
class JoshuaProjectAPI {
    constructor() {
        this.baseUrl = 'https://joshuaproject.net/api/v2';
        this.apiKey = config.joshuaProjectApiKey;
    }

    /**
     * Make a JSONP request to Joshua Project API
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise} - Resolves with API response
     */
    async makeRequest(endpoint, params = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jp_callback_' + Date.now();
            
            // Set timeout to handle failed loads
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Request timed out'));
            }, 10000);
            
            // Add callback to window
            window[callbackName] = (data) => {
                cleanup();
                clearTimeout(timeout);
                resolve(data);
            };
            
            // Cleanup function
            const cleanup = () => {
                delete window[callbackName];
                if (script && script.parentNode) {
                    document.head.removeChild(script);
                }
            };

            // Create script element
            const script = document.createElement('script');
            
            // Build URL with parameters
            const queryParams = new URLSearchParams({
                api_key: this.apiKey,
                callback: callbackName,
                ...params
            });

            script.src = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
            
            // Handle errors
            script.onerror = () => {
                cleanup();
                clearTimeout(timeout);
                reject(new Error('Failed to load data from Joshua Project API'));
            };

            // Add script to page
            document.head.appendChild(script);
        });
    }

    /**
     * Search for people groups within radius of coordinates
     * @param {Object} params - Search parameters
     * @returns {Promise} - Resolves with search results
     */
    async searchPeopleGroups({ latitude, longitude, radius, units = 'km' }) {
        try {
            const params = {
                latitude,
                longitude,
                radius,
                rad_units: units.toLowerCase(),
                limit: 100
            };

            const response = await this.makeRequest('/people_groups', params);
            return response;
        } catch (error) {
            console.error('People groups search failed:', error);
            throw error;
        }
    }

    /**
     * Get details for a specific people group
     * @param {string} peopleId - Joshua Project people ID
     * @returns {Promise} - Resolves with people group details
     */
    async getPeopleGroup(peopleId) {
        try {
            const response = await this.makeRequest(`/people_groups/${peopleId}`);
            return response;
        } catch (error) {
            console.error('Failed to get people group details:', error);
            throw error;
        }
    }
}

// Create and export API instance
export const jpApi = new JoshuaProjectAPI();
export default jpApi;
