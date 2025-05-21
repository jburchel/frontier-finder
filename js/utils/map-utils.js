/**
 * Map utilities for Frontier Finder
 * Provides consistent map configuration across the application
 */

/**
 * Get the appropriate tile layer URL based on the current environment
 * @returns {Object} Configuration object with URL and attribution
 */
export function getTileLayerConfig() {
    // Detect if we're running locally
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    // Return appropriate tile configuration
    if (isLocalhost) {
        // Use OpenStreetMap for local development (better CORS support)
        return {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            options: {
                maxZoom: 19
            }
        };
    } else {
        // Use Carto tiles for production (better visual style)
        return {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            options: {
                subdomains: 'abcd',
                maxZoom: 19,
                crossOrigin: true
            }
        };
    }
}

/**
 * Create a standard Leaflet map with the appropriate tile layer
 * @param {string} containerId - ID of the container element
 * @param {Array} initialView - Initial [lat, lng] coordinates
 * @param {number} initialZoom - Initial zoom level
 * @returns {Object} Leaflet map instance
 */
export function createMap(containerId, initialView = [20, 0], initialZoom = 2) {
    const container = document.getElementById(containerId) || 
                     document.querySelector(containerId);
    
    if (!container) {
        console.error(`Map container '${containerId}' not found`);
        return null;
    }
    
    try {
        // Initialize map
        const map = L.map(container).setView(initialView, initialZoom);
        
        // Get tile configuration
        const tileConfig = getTileLayerConfig();
        
        // Add tile layer
        L.tileLayer(tileConfig.url, {
            attribution: tileConfig.attribution,
            ...tileConfig.options
        }).addTo(map);
        
        return map;
    } catch (error) {
        console.error('Error creating map:', error);
        container.innerHTML = `<div style="color: red; padding: 10px;">
            Error creating map: ${error.message}
        </div>`;
        return null;
    }
}
