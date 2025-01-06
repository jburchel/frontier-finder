import { config } from './config.js';

// Test the API with a simple request
async function testAPI() {
    const testURL = `https://api.joshuaproject.net/v2/people_groups.php?api_key=${config.joshuaProjectApiKey}&limit=1`;
    
    try {
        const response = await fetch(testURL);
        const data = await response.json();
        console.log('API Test Response:', data);
        return data;
    } catch (error) {
        console.error('API Test Error:', error);
        throw error;
    }
}

// Run the test
testAPI().then(data => {
    console.log('API is working:', data);
}).catch(error => {
    console.error('API test failed:', error);
}); 