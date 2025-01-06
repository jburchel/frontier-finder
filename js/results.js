import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Get search parameters from URL
        const params = new URLSearchParams(window.location.search);
        const searchParams = {
            country: params.get('country'),
            upg: params.get('upg'),
            radius: params.get('radius'),
            units: params.get('units'),
            type: params.get('type')
        };

        // Display search parameters
        const searchParamsDiv = document.getElementById('searchParams');
        if (searchParamsDiv) {
            searchParamsDiv.innerHTML = `
                <p><strong>Country:</strong> ${searchParams.country}</p>
                <p><strong>UPG:</strong> ${searchParams.upg}</p>
                <p><strong>Search Radius:</strong> ${searchParams.radius} ${searchParams.units}</p>
                <p><strong>Search Type:</strong> ${searchParams.type}</p>
            `;
        }

        // Get results from sessionStorage
        const results = JSON.parse(sessionStorage.getItem('searchResults'));
        console.log('Retrieved results:', results); // Debug log

        if (!results) {
            throw new Error('No results found. Please try your search again.');
        }

        // Display results
        const uupgList = document.getElementById('uupgList');
        const fpgList = document.getElementById('fpgList');

        if (!uupgList || !fpgList) {
            throw new Error('Results containers not found');
        }

        // Clear existing results
        uupgList.innerHTML = '';
        fpgList.innerHTML = '';

        // Function to create result card
        function createResultCard(group) {
            const card = document.createElement('div');
            card.className = 'result-card';
            
            card.innerHTML = `
                <h3>${group.PeopleName || group.name}</h3>
                <p><strong>Distance:</strong> ${group.distance?.toFixed(2) || 'N/A'} ${searchParams.units}</p>
                ${group.Population ? `<p><strong>Population:</strong> ${group.Population.toLocaleString()}</p>` : ''}
                ${group.Language ? `<p><strong>Language:</strong> ${group.Language}</p>` : ''}
                ${group.Religion ? `<p><strong>Religion:</strong> ${group.Religion}</p>` : ''}
            `;
            
            return card;
        }

        // Sort results by distance
        const sortByDistance = (a, b) => (a.distance || 0) - (b.distance || 0);

        // Filter and display results
        if (results.results && Array.isArray(results.results)) {
            console.log('Processing results array:', results.results.length); // Debug log

            const uupgs = results.results.filter(group => group.IsUUPG);
            const fpgs = results.results.filter(group => group.IsFPG);

            // Sort by distance
            uupgs.sort(sortByDistance);
            fpgs.sort(sortByDistance);

            // Display UUPGs
            if (uupgs.length > 0) {
                uupgs.forEach(uupg => {
                    uupgList.appendChild(createResultCard(uupg));
                });
            } else {
                uupgList.innerHTML = '<p class="no-results">No UUPGs found in this area.</p>';
            }

            // Display FPGs
            if (fpgs.length > 0) {
                fpgs.forEach(fpg => {
                    fpgList.appendChild(createResultCard(fpg));
                });
            } else {
                fpgList.innerHTML = '<p class="no-results">No FPGs found in this area.</p>';
            }

            console.log(`Displayed ${uupgs.length} UUPGs and ${fpgs.length} FPGs`); // Debug log
        } else {
            throw new Error('Invalid results format');
        }

    } catch (error) {
        console.error('Error displaying results:', error);
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = error.message;
            container.insertBefore(errorDiv, container.firstChild);
        }
    }
});
