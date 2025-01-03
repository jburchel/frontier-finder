// Joshua Project API configuration
export const config = {
    // Removed the API key from client-side code to enhance security
    apiBaseUrl: 'https://joshuaproject.net/api/v2',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
};

// Validate API key (if needed)
export function validateApiKey() {
    if (!config.JP_API_KEY) {
        console.error('Joshua Project API key is missing. Please add your API key securely.');
        document.getElementById('fpgList').innerHTML = 
            '<p class="error">⚠️ Joshua Project API key is missing. Please add your API key securely to enable FPG search.</p>';
        return false;
    }
    return true;
}

// For backward compatibility
window.jpConfig = config;
window.validateApiKey = validateApiKey;

export default config;