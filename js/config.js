// Joshua Project API configuration
const config = {
    apiKey: '', // Get your API key from https://api.joshuaproject.net/
    apiBaseUrl: 'https://api.joshuaproject.net/v1',
    headers: {
        'Accept': 'application/json'
    }
};

// Validate API key
function validateApiKey() {
    if (!config.apiKey) {
        console.error('Joshua Project API key is missing. Please add your API key in js/config.js');
        document.getElementById('fpgList').innerHTML = 
            '<p class="error">⚠️ Joshua Project API key is missing. Please add your API key in js/config.js to enable FPG search.</p>';
        return false;
    }
    return true;
}

// Export configuration
window.jpConfig = config;
window.validateApiKey = validateApiKey;
