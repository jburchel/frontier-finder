// Joshua Project API configuration
export const config = {
    joshuaProjectApiKey: '080e14ad747e', // Replace with your actual API key
    apiBaseUrl: 'https://api.joshuaproject.net/v2',
    headers: {
        'Accept': 'application/json'
    }
};

// Validate API key
export function validateApiKey() {
    if (!config.joshuaProjectApiKey || config.joshuaProjectApiKey === 'YOUR_API_KEY') {
        console.error('Joshua Project API key is missing or invalid. Please add your API key in js/config.js');
        document.getElementById('fpgList').innerHTML = 
            '<p class="error">⚠️ Joshua Project API key is missing or invalid. Please add your API key in js/config.js to enable FPG search.</p>';
        return false;
    }
    return true;
}

// For backward compatibility with existing code
window.jpConfig = config;
window.validateApiKey = validateApiKey;
export default config;