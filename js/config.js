// Joshua Project API configuration
export const config = {
    joshuaProjectApiKey: '080e14ad747e',
    apiBaseUrl: 'https://api.joshuaproject.net/v2', // v2 API endpoint
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