/**
 * Configuration for Frontier Finder application
 * Using Joshua Project API v2
 */

export const config = {
    // Joshua Project API configuration
    joshuaProjectApiKey: '080e14ad747e',
    apiBaseUrl: 'https://joshuaproject.net/api/v2',
    
    // CSV data file paths
    dataFiles: {
        currentUPGs: 'data/current_upgs.csv',
        uupgs: 'data/uupgs.csv'
    },
    
    // Search parameters
    search: {
        maxRadius: 1000, // Maximum search radius
        defaultRadius: 100, // Default radius value
        defaultUnits: 'kilometers', // Default distance units
        maxResults: 100
    }
};

// Validate configuration
export function validateConfig() {
    if (!config.joshuaProjectApiKey) {
        console.error('Joshua Project API key is missing');
        return false;
    }
    return true;
}

export default config; 