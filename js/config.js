// Joshua Project API configuration
export const config = {
    joshuaProjectApiKey: '080e14ad747e', // Your API key
    apiBaseUrl: 'https://api.joshuaproject.net/v2', // Updated to correct v2 endpoint
    headers: {
        'Accept': 'application/json'
    }
};

// Simplified validation
export function validateApiKey() {
    if (!config.joshuaProjectApiKey) {
        console.error('Joshua Project API key is missing');
        return false;
    }
    return true;
}

window.jpConfig = config;
export default config;