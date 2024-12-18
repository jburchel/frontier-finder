// Joshua Project API configuration
export const config = {
    joshuaProjectApiKey: '080e14ad747e', // Joshua Project API key
    apiBaseUrl: 'https://api.joshuaproject.net', // Base URL for Joshua Project API
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
};

// Validate API key
export function validateApiKey() {
    if (!config.joshuaProjectApiKey) {
        console.error('Joshua Project API key is missing. Please add your API key in js/config.js');
        document.getElementById('fpgList').innerHTML = 
            '<p class="error">⚠️ Joshua Project API key is missing. Please add your API key in js/config.js to enable FPG search.</p>';
        return false;
    }
    return true;
}

// For backward compatibility with existing code
window.jpConfig = config;
window.validateApiKey = validateApiKey;
export default config;