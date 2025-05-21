/**
 * JavaScript for the homepage map
 * Non-module implementation for better compatibility
 */

console.log('home-map.js loaded');

// Global variables for map access
let mapInitialized = false;
window.homeMap = null; // Make the map globally accessible

// Initialize the map when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking for Leaflet...');
    // Don't initialize immediately, wait for a small delay
    setTimeout(() => {
        // Make sure Leaflet is loaded before initializing the map
        if (typeof L !== 'undefined' && !mapInitialized) {
            console.log('Leaflet is defined, initializing map...');
            initializeHomeMap();
        } else if (typeof L === 'undefined') {
            console.error('Leaflet library not loaded');
            const mapContainer = document.querySelector('.map-container');
            if (mapContainer) {
                mapContainer.innerHTML = 
                    '<div style="color: red; padding: 10px;">Error: Leaflet library not loaded</div>';
            } else {
                console.error('Map container element not found');
            }
        } else {
            console.log('Map already initialized, skipping DOMContentLoaded initialization');
        }
    }, 500); // Small delay to ensure all resources are loaded
});

// We'll use a simpler approach that doesn't rely on any modules
// This will store the UPG data loaded from the CSV
// Make it available globally so the search function can use it
window.upgData = [];

// Load the UPG data directly
document.addEventListener('DOMContentLoaded', () => {
    console.log('Loading UPG data directly from CSV...');
    
    // Load the CSV data directly
    fetch('data/current_upgs.csv')
        .then(response => response.text())
        .then(csvText => {
            const rows = csvText.trim().split('\n');
            const headers = rows[0].split(',').map(h => h.trim());
            
            // Find column indices
            const nameIndex = headers.indexOf('Name');
            const countryIndex = headers.indexOf('Country');
            const latIndex = headers.indexOf('Latitude');
            const lngIndex = headers.indexOf('Longitude');
            
            if (nameIndex === -1 || countryIndex === -1) {
                console.error('Required columns not found in CSV');
                return;
            }
            
            // Process the CSV data
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;
                
                const columns = rows[i].split(',').map(c => c.trim());
                
                if (columns.length > Math.max(nameIndex, countryIndex, latIndex, lngIndex)) {
                    const name = columns[nameIndex];
                    const country = columns[countryIndex];
                    const lat = parseFloat(columns[latIndex]);
                    const lng = parseFloat(columns[lngIndex]);
                    
                    if (name && country) {
                        // Create UPG object with coordinates
                        const upgObj = { 
                            name, 
                            country,
                            // Use the property names expected by the search function
                            latitude: lat,
                            longitude: lng
                        };
                        
                        // Also store as lat/lng for compatibility with map functions
                        upgObj.lat = lat;
                        upgObj.lng = lng;
                        
                        window.upgData.push(upgObj);
                    }
                }
            }
            
            console.log(`Loaded ${upgData.length} UPGs directly from CSV`);
        })
        .catch(error => {
            console.error('Error loading UPG data from CSV:', error);
        });
});

// We'll remove the window load event handler since it's causing the double initialization
// The DOMContentLoaded event is sufficient and more reliable for this purpose

/**
 * Initialize the homepage map
 */
function initializeHomeMap() {
    console.log('Initializing homepage map...');
    
    // If map is already initialized, don't try to initialize it again
    if (mapInitialized) {
        console.warn('Map already initialized, skipping initialization');
        return null;
    }
    
    // Find the map container
    const mapContainer = document.querySelector('.map-container');
    
    if (!mapContainer) {
        console.error('Map container not found');
        return null;
    }
    
    // Check if the container already has a Leaflet map initialized
    if (mapContainer._leaflet_id) {
        console.warn('Map container already has a Leaflet instance, skipping initialization');
        mapInitialized = true;
        return null;
    }
    
    // Ensure the map container has a height
    if (mapContainer.offsetHeight < 10) {
        console.warn('Map container has insufficient height, setting explicit height');
        mapContainer.style.height = '300px';
    }
    
    try {
        console.log('Creating Leaflet map instance...');
        // Clear any existing content in the container
        mapContainer.innerHTML = '';
        
        // Initialize map with explicit ID to avoid conflicts
        const mapId = 'home-map-' + Date.now();
        mapContainer.id = mapId;
        
        // Initialize map
        const map = L.map(mapId, {
            // Disable automatic initialization to prevent conflicts
            preferCanvas: true
        }).setView([20, 0], 2);
        
        // Use OpenStreetMap tiles which work better in local environments
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        
        console.log('Homepage map initialized');
        
        // Add a simple marker to verify the map is working
        L.marker([0, 0]).addTo(map)
            .bindPopup('Center of the map')
            .openPopup();
        
        // Load and display UPG clusters
        loadUPGClusters(map);
        
        // Force a resize event to ensure the map renders correctly
        setTimeout(() => {
            map.invalidateSize();
            console.log('Map size invalidated to force redraw');
        }, 100);
        
        // Set the initialization flag to prevent double initialization
        mapInitialized = true;
        
        // Store the map instance globally for access from other modules
        window.homeMap = map;
        
        return map;
    } catch (error) {
        console.error('Error initializing homepage map:', error);
        mapContainer.innerHTML = `<div style="color: red; padding: 10px;">
            Error initializing map: ${error.message}<br>
            Check browser console for details.
        </div>`;
        return null;
    }
}

/**
 * Load and display UPG clusters on the map
 * @param {Object} map - Leaflet map instance
 */
/**
 * Select a UPG from the map and populate the form fields
 * @param {Object} upg - The UPG object with country and name
 */
function selectUPGFromMap(upg) {
    console.log('Selecting UPG from map:', upg);
    
    // DIRECT APPROACH: Manually set the country dropdown
    const countrySelect = document.getElementById('countrySelect');
    if (!countrySelect) {
        console.error('Country select element not found');
        return;
    }
    
    // First, check if the country is in the dropdown
    let countryExists = false;
    for (let i = 0; i < countrySelect.options.length; i++) {
        if (countrySelect.options[i].value === upg.country) {
            countryExists = true;
            break;
        }
    }
    
    // If the country doesn't exist in the dropdown, add it
    if (!countryExists) {
        console.log(`Country ${upg.country} not found in dropdown, adding it`);
        const option = document.createElement('option');
        option.value = upg.country;
        option.textContent = upg.country;
        countrySelect.appendChild(option);
    }
    
    // Set the country value
    console.log(`Setting country dropdown to: ${upg.country}`);
    countrySelect.value = upg.country;
    
    // DIRECT APPROACH: Manually set the UPG dropdown
    const upgSelect = document.getElementById('upgSelect');
    if (!upgSelect) {
        console.error('UPG select element not found');
        return;
    }
    
    // First, ensure the UPG dropdown is enabled
    upgSelect.disabled = false;
    
    // Clear and add the default option
    upgSelect.innerHTML = '<option value="" selected>Select a UPG...</option>';
    
    // Use the already loaded UPG data to populate the dropdown
    if (upgData.length === 0) {
        console.error('No UPG data available. Loading data first...');
        
        // If data isn't loaded yet, load it now
        fetch('data/current_upgs.csv')
            .then(response => response.text())
            .then(csvText => {
                processCSVAndPopulateDropdown(csvText, upg, upgSelect);
            })
            .catch(error => {
                console.error('Error loading UPG data:', error);
            });
    } else {
        console.log(`Using ${upgData.length} pre-loaded UPGs to populate dropdown`);
        
        // Filter UPGs for the selected country
        const upgsForCountry = upgData.filter(item => item.country === upg.country);
        console.log(`Found ${upgsForCountry.length} UPGs for country ${upg.country}`);
        
        // Add options to the UPG dropdown
        let matchingUpgOption = null;
        
        upgsForCountry.forEach(item => {
            // Create an option for this UPG
            const option = document.createElement('option');
            option.value = item.name;
            option.textContent = item.name;
            upgSelect.appendChild(option);
                        
            // If this is the UPG we clicked on, save the option
            if (item.name === upg.name) {
                matchingUpgOption = option;
            }
        });
                    
        // Select the matching UPG if found
        if (matchingUpgOption) {
            console.log(`Selecting UPG: ${upg.name}`);
            upgSelect.value = matchingUpgOption.value;
                        
            // Enable the search button
            const searchButton = document.getElementById('searchButton');
            if (searchButton) {
                searchButton.disabled = false;
            }
        }
    }
}

/**
 * Process CSV data and populate the UPG dropdown
 */
function processCSVAndPopulateDropdown(csvText, upg, upgSelect) {
    const rows = csvText.trim().split('\n');
    const headers = rows[0].split(',').map(h => h.trim());
    
    // Find column indices
    const nameIndex = headers.indexOf('Name');
    const countryIndex = headers.indexOf('Country');
    const latIndex = headers.indexOf('Latitude');
    const lngIndex = headers.indexOf('Longitude');
    
    if (nameIndex === -1 || countryIndex === -1) {
        console.error('Required columns not found in CSV');
        return;
    }
    
    // Clear the global upgData array and repopulate it
    window.upgData = [];
    
    // Process the CSV data
    for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const columns = rows[i].split(',').map(c => c.trim());
        
        if (columns.length > Math.max(nameIndex, countryIndex, latIndex, lngIndex)) {
            const name = columns[nameIndex];
            const country = columns[countryIndex];
            const lat = parseFloat(columns[latIndex]);
            const lng = parseFloat(columns[lngIndex]);
            
            if (name && country) {
                // Create UPG object with coordinates
                const upgObj = { 
                    name, 
                    country,
                    // Use the property names expected by the search function
                    latitude: lat,
                    longitude: lng
                };
                
                // Also store as lat/lng for compatibility with map functions
                upgObj.lat = lat;
                upgObj.lng = lng;
                
                window.upgData.push(upgObj);
            }
        }
    }
    
    console.log(`Loaded ${upgData.length} UPGs from CSV`);
    
    // Now populate the dropdown with UPGs for the selected country
    const upgsForCountry = upgData.filter(item => item.country === upg.country);
    console.log(`Found ${upgsForCountry.length} UPGs for country ${upg.country}`);
    
    // Add options to the UPG dropdown
    let matchingUpgOption = null;
    
    upgsForCountry.forEach(item => {
        // Create an option for this UPG
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        upgSelect.appendChild(option);
        
        // If this is the UPG we clicked on, save the option
        if (item.name === upg.name) {
            matchingUpgOption = option;
        }
    });
    
    // Select the matching UPG if found
    if (matchingUpgOption) {
        console.log(`Selecting UPG: ${upg.name}`);
        
        // In the UI.js file, the UPG dropdown options have the UPG name as their value
        // But when searching, it looks for a UPG with that name in the currentUPGs array
        // So we need to set the value to just the UPG name
        upgSelect.value = upg.name;
        
        console.log('UPG dropdown value set to:', upgSelect.value);
    }
}

/**
 * Zoom to a specific UPG on the map
 * @param {string} country - The country name
 * @param {string} upgName - The UPG name
 */
function zoomToUPG(country, upgName) {
    console.log(`Zooming to UPG: ${upgName} in ${country}`);
    
    // Make sure the map is initialized
    if (!window.homeMap) {
        console.error('Map not initialized, cannot zoom');
        return;
    }
    
    // Find the UPG in the data
    const upg = window.upgData.find(item => 
        item.country === country && item.name === upgName
    );
    
    if (!upg || !upg.latitude || !upg.longitude) {
        console.error(`UPG ${upgName} in ${country} not found or has no coordinates`);
        return;
    }
    
    console.log(`Found UPG coordinates: ${upg.latitude}, ${upg.longitude}`);
    
    // Zoom to the UPG location
    window.homeMap.setView([upg.latitude, upg.longitude], 8);
    
    // Create a temporary marker with a popup to highlight the selected UPG
    const tempMarker = L.marker([upg.latitude, upg.longitude])
        .addTo(window.homeMap)
        .bindPopup(`<strong>${upgName}</strong><br>${country}`)
        .openPopup();
    
    // Remove the marker after 5 seconds
    setTimeout(() => {
        window.homeMap.removeLayer(tempMarker);
    }, 5000);
}

// Make the function globally accessible
window.zoomToUPG = zoomToUPG;

/**
 * Zoom to a specific country on the map
 * @param {string} country - The country name
 */
function zoomToCountry(country) {
    console.log(`Zooming to country: ${country}`);
    
    // Make sure the map is initialized
    if (!window.homeMap) {
        console.error('Map not initialized, cannot zoom');
        return;
    }
    
    // Find all UPGs in this country to determine its bounds
    const upgsInCountry = window.upgData.filter(item => item.country === country);
    
    if (!upgsInCountry || upgsInCountry.length === 0) {
        console.error(`No UPGs found for country: ${country}`);
        return;
    }
    
    console.log(`Found ${upgsInCountry.length} UPGs in ${country}`);
    
    // Create a bounds object to encompass all UPGs in the country
    const bounds = L.latLngBounds(
        upgsInCountry.map(upg => [upg.latitude || 0, upg.longitude || 0])
    );
    
    // Fit the map to these bounds with some padding
    window.homeMap.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 7  // Limit zoom level to avoid zooming too close
    });
}

// Make the function globally accessible
window.zoomToCountry = zoomToCountry;

async function loadUPGClusters(map) {
    try {
        // Load UPG data from CSV
        const response = await fetch('data/current_upgs.csv');
        if (!response.ok) {
            throw new Error(`Failed to load UPG data: ${response.status}`);
        }
        
        const csvData = await response.text();
        const rows = csvData.trim().split('\n');
        const headers = rows[0].split(',').map(h => h.trim());
        
        // Find column indices
        const nameIndex = headers.indexOf('Name');
        const countryIndex = headers.indexOf('Country');
        const latIndex = headers.indexOf('Latitude');
        const lngIndex = headers.indexOf('Longitude');
        
        if (nameIndex === -1 || countryIndex === -1 || latIndex === -1 || lngIndex === -1) {
            throw new Error('Required columns not found in CSV');
        }
        
        // Find additional column indices for enhanced popup
        const populationIndex = headers.indexOf('Population');
        const languageIndex = headers.indexOf('Language');
        const religionIndex = headers.indexOf('Religion');
        const evangelicalIndex = headers.indexOf('% Evangelical');
        
        // Process UPG data
        const upgs = [];
        for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;
            
            const columns = rows[i].split(',').map(c => c.trim());
            
            if (columns.length > Math.max(nameIndex, countryIndex, latIndex, lngIndex)) {
                const name = columns[nameIndex];
                const country = columns[countryIndex];
                const lat = parseFloat(columns[latIndex]);
                const lng = parseFloat(columns[lngIndex]);
                
                // Get additional data for enhanced popup
                const population = populationIndex !== -1 ? columns[populationIndex] : '';
                const language = languageIndex !== -1 ? columns[languageIndex] : '';
                const religion = religionIndex !== -1 ? columns[religionIndex] : '';
                const evangelical = evangelicalIndex !== -1 ? columns[evangelicalIndex] : '';
                
                if (name && country && !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
                    upgs.push({ 
                        name, 
                        country, 
                        lat, 
                        lng, 
                        population, 
                        language, 
                        religion,
                        evangelical
                    });
                }
            }
        }
        
        console.log(`Loaded ${upgs.length} UPGs for clustering`);
        
        // Create markers with clustering
        const markers = L.markerClusterGroup();
        
        upgs.forEach(upg => {
            const marker = L.marker([upg.lat, upg.lng]);
            
            // Format population with commas
            const formattedPopulation = upg.population ? parseInt(upg.population).toLocaleString() : 'Unknown';
            
            // Create enhanced popup content with more information
            const popupContent = `
                <div class="marker-popup">
                    <h3>${upg.name}</h3>
                    <p><strong>Country:</strong> ${upg.country}</p>
                    <p><strong>Population:</strong> ${formattedPopulation}</p>
                    <p><strong>Language:</strong> ${upg.language || 'Unknown'}</p>
                    <p><strong>Religion:</strong> ${upg.religion || 'Unknown'}</p>
                    <p><strong>Evangelical:</strong> ${upg.evangelical || 'Unknown'}</p>
                </div>
            `;
            
            const popup = L.popup({
                closeButton: true,
                autoClose: false,
                closeOnEscapeKey: false,
                closeOnClick: false
            }).setContent(popupContent);
            
            marker.bindPopup(popup);
            
            // Add click event to the marker - automatically select without a button
            marker.on('click', function(e) {
                // Open the popup first
                marker.openPopup();
                
                // Then select the UPG (with a slight delay to avoid conflicts)
                setTimeout(() => {
                    selectUPGFromMap(upg);
                }, 100);
            });
            
            markers.addLayer(marker);
        });
        
        map.addLayer(markers);
        console.log('UPG clusters added to map');
        
    } catch (error) {
        console.error('Error loading UPG clusters:', error);
    }
}
