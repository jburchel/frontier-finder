// Joshua Project API configuration
export const config = {
    joshuaProjectApiKey: '080e14ad747e', // Your API key
    apiBaseUrl: 'https://joshuaproject.net/api/v1', // Change to v1 API
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
window.validateApiKey = validateApiKey;
export default config;