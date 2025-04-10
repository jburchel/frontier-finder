// Map functionality for Frontier Finder
class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.markerClusterGroup = null;
        this.selectedMarker = null;
        this.upgData = [];
        this.loadingIndicator = null;
        this.searchInput = null;
    }

    async initialize() {
        // Initialize the map
        this.map = L.map('map').setView([20, 0], 2);
        
        // Add the OpenStreetMap tiles with English labels
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors',
            subdomains: 'abc',
            // Add language parameter for English labels
            lang: 'en'
        }).addTo(this.map);

        // Add a second layer for English labels
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors, © CARTO',
            subdomains: 'abcd',
            pane: 'shadowPane'
        }).addTo(this.map);

        // Create marker cluster group
        this.markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        this.map.addLayer(this.markerClusterGroup);

        // Add loading indicator
        this.addLoadingIndicator();

        // Initialize search input
        this.searchInput = document.getElementById('map-search');
        this.searchInput.addEventListener('input', this.handleSearch.bind(this));

        // Load UPG data
        await this.loadUPGData();
        
        // Add markers for all UPGs
        this.addMarkers();
    }

    addLoadingIndicator() {
        // Create a loading indicator
        this.loadingIndicator = L.divIcon({
            className: 'loading-indicator',
            html: '<div class="spinner"></div><div>Loading UPG data...</div>',
            iconSize: [100, 100],
            iconAnchor: [50, 50]
        });

        // Add it to the map
        L.marker([20, 0], { icon: this.loadingIndicator }).addTo(this.map);
    }

    async loadUPGData() {
        try {
            const response = await fetch('data/current_upgs.csv');
            const csvText = await response.text();
            
            // Parse CSV data
            const lines = csvText.split('\n');
            const headers = lines[0].split(',');
            
            this.upgData = lines.slice(1).map(line => {
                const values = line.split(',');
                return {
                    name: values[1],
                    country: values[2],
                    latitude: parseFloat(values[3]),
                    longitude: parseFloat(values[4]),
                    population: parseInt(values[5]),
                    evangelical: values[6],
                    language: values[7],
                    religion: values[8]
                };
            }).filter(upg => upg.latitude && upg.longitude); // Filter out entries without coordinates
        } catch (error) {
            console.error('Error loading UPG data:', error);
            this.showError('Failed to load UPG data. Please try again later.');
        }
    }

    showError(message) {
        // Create an error message
        const errorDiv = L.divIcon({
            className: 'error-message',
            html: `<div class="error">${message}</div>`,
            iconSize: [300, 50],
            iconAnchor: [150, 25]
        });

        // Add it to the map
        L.marker([20, 0], { icon: errorDiv }).addTo(this.map);
    }

    addMarkers() {
        // Remove loading indicator if it exists
        if (this.loadingIndicator) {
            this.map.eachLayer(layer => {
                if (layer instanceof L.Marker && layer.getIcon() === this.loadingIndicator) {
                    this.map.removeLayer(layer);
                }
            });
        }

        // Clear existing markers
        this.markers = [];
        this.markerClusterGroup.clearLayers();

        // Add new markers
        this.upgData.forEach(upg => {
            const marker = L.marker([upg.latitude, upg.longitude])
                .bindPopup(`
                    <div class="marker-popup">
                        <strong>${upg.name}</strong><br>
                        Country: ${upg.country}<br>
                        Population: ${upg.population.toLocaleString()}<br>
                        Language: ${upg.language || 'N/A'}<br>
                        Religion: ${upg.religion || 'N/A'}
                    </div>
                `);

            marker.on('click', () => this.handleMarkerClick(upg));
            this.markers.push(marker);
            this.markerClusterGroup.addLayer(marker);
        });
    }

    handleMarkerClick(upg) {
        // Update the form with the selected UPG
        const countrySelect = document.getElementById('countrySelect');
        const upgSelect = document.getElementById('upgSelect');
        
        // Set the country
        countrySelect.value = upg.country;
        
        // Trigger the country change event to populate UPGs
        const event = new Event('change');
        countrySelect.dispatchEvent(event);
        
        // Wait for UPGs to populate then select the correct one
        setTimeout(() => {
            upgSelect.value = upg.name;
            // Enable the search button
            document.getElementById('searchButton').disabled = false;
            // Scroll to the form
            document.querySelector('.search-section').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    // Method to highlight a specific UPG
    highlightUPG(upgName) {
        // Remove previous highlight
        if (this.selectedMarker) {
            this.selectedMarker.setIcon(L.Icon.Default);
        }

        // Find and highlight the new marker
        const marker = this.markers.find(m => 
            m.getPopup().getContent().includes(upgName)
        );

        if (marker) {
            // Create a custom icon for the selected marker
            const selectedIcon = L.Icon.Default.extend({
                options: {
                    iconUrl: 'images/marker-selected.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                }
            });

            marker.setIcon(new selectedIcon());
            this.selectedMarker = marker;
            
            // Center map on the marker
            this.map.setView(marker.getLatLng(), 5);
        }
    }

    // Method to filter markers by country
    filterByCountry(country) {
        if (!country) {
            // If no country selected, show all markers
            this.markers.forEach(marker => {
                this.markerClusterGroup.addLayer(marker);
            });
            return;
        }

        // Clear all markers
        this.markerClusterGroup.clearLayers();

        // Add only markers for the selected country
        this.markers.forEach(marker => {
            const popupContent = marker.getPopup().getContent();
            if (popupContent.includes(`Country: ${country}`)) {
                this.markerClusterGroup.addLayer(marker);
            }
        });
    }

    // Method to search for a UPG by name
    searchUPG(query) {
        if (!query) {
            // If no query, show all markers
            this.markers.forEach(marker => {
                this.markerClusterGroup.addLayer(marker);
            });
            return;
        }

        // Clear all markers
        this.markerClusterGroup.clearLayers();

        // Add only markers that match the query
        this.markers.forEach(marker => {
            const popupContent = marker.getPopup().getContent();
            if (popupContent.toLowerCase().includes(query.toLowerCase())) {
                this.markerClusterGroup.addLayer(marker);
            }
        });
    }

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        this.filterMarkers(searchTerm);
    }

    filterMarkers(searchTerm) {
        // Clear existing markers
        this.markerClusterGroup.clearLayers();
        
        // Filter and add markers based on search term
        const filteredData = this.upgData.filter(upg => 
            upg.name.toLowerCase().includes(searchTerm) || 
            upg.country.toLowerCase().includes(searchTerm)
        );
        
        this.addMarkers(filteredData);
    }
}

// Export the MapManager class
export const mapManager = new MapManager(); 