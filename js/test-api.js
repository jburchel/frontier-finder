import { config } from './config.js';

// Simple test function that uses a direct JSONP request
export async function testJoshuaProjectAPI() {
    return new Promise((resolve, reject) => {
        const callbackName = 'jp_test_' + Date.now();
        
        // Add callback to window
        window[callbackName] = (data) => {
            console.log('API response received:', data);
            cleanup();
            resolve(data);
        };
        
        // Cleanup function
        const cleanup = () => {
            delete window[callbackName];
            if (script && script.parentNode) {
                document.head.removeChild(script);
            }
        };
        
        const script = document.createElement('script');
        script.src = `${config.apiBaseUrl}/people_groups/PeopleID3/1?api_key=${config.joshuaProjectApiKey}&callback=${callbackName}`;
        
        script.onerror = () => {
            console.error('Failed to load API script');
            cleanup();
            reject(new Error('Failed to connect to Joshua Project API'));
        };
        
        document.head.appendChild(script);
        
        // Set timeout
        setTimeout(() => {
            if (window[callbackName]) {
                cleanup();
                reject(new Error('API request timed out'));
            }
        }, 5000);
    });
}

// Run the test
testJoshuaProjectAPI().then(data => {
    console.log('API is working:', data);
}).catch(error => {
    console.error('API test failed:', error);
}); 