// Joshua Project API configuration
export const config = {
    joshuaProjectApiKey: '080e14ad747e',
    apiBaseUrl: 'https://api.joshuaproject.net/v2', // v2 API endpoint
    headers: {
        'Accept': 'application/json'
    }
};

// Test the API key
export async function testApiKey() {
    const testUrl = `${config.apiBaseUrl}/people_groups.php?api_key=${config.joshuaProjectApiKey}&limit=1`;
    try {
        const response = await fetch(testUrl);
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        const data = await response.json();
        return true;
    } catch (error) {
        console.error('API key validation failed:', error);
        return false;
    }
}

window.jpConfig = config;
export default config;