import { config } from './config.js';

// Simple test function that uses a direct script tag
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
        
        // Use a simpler endpoint format
        const url = new URL(`${config.apiBaseUrl}/people_groups`);
        url.searchParams.append('api_key', config.joshuaProjectApiKey);
        url.searchParams.append('limit', '1');
        url.searchParams.append('callback', callbackName);
        
        console.log('Testing API with URL:', url.toString());
        script.src = url.toString();
        
        script.onerror = (error) => {
            console.error('Failed to load API script:', error);
            cleanup();
            reject(new Error('Failed to connect to Joshua Project API'));
        };
        
        // Add load handler
        script.onload = () => {
            console.log('Script loaded successfully');
        };
        
        document.head.appendChild(script);
        
        // Set timeout
        setTimeout(() => {
            if (window[callbackName]) {
                cleanup();
                reject(new Error('API request timed out'));
            }
        }, 10000); // 10 second timeout
    });
}

// Add event listener for the test button
document.addEventListener('DOMContentLoaded', () => {
    const testButton = document.getElementById('testApiButton');
    if (testButton) {
        testButton.addEventListener('click', async () => {
            try {
                const result = await testJoshuaProjectAPI();
                console.log('API Test successful:', result);
                alert('API Test Successful! Check console for details.');
            } catch (error) {
                console.error('API Test Failed:', error);
                alert('API Test Failed: ' + error.message);
            }
        });
    }
}); 