// Joshua Project API configuration
const config = {
    apiKey: '080e14ad747e', // Joshua Project API key
    apiBaseUrl: 'https://api.joshuaproject.net', // Remove /v1 as it's not in the docs
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