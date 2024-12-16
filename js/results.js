import { searchNearby } from './data.js';

// Get search parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const country = urlParams.get('country');
const upgName = urlParams.get('upg');
const radius = parseFloat(urlParams.get('radius'));
const units = urlParams.get('units') || 'kilometers';
const type = urlParams.get('type') || 'both';

// Display search parameters
document.getElementById('search-params').innerHTML = `
    <h3>Search Parameters:</h3>
    <p>Country: ${country}</p>
    <p>UPG: ${upgName}</p>
    <p>Radius: ${radius} ${units}</p>
    <p>Type: ${type}</p>
`;

async function displayResults() {
    const resultsContainer = document.getElementById('results-container');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');

    try {
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        resultsContainer.style.display = 'none';

        // Validate input parameters
        if (!country || !upgName || !radius) {
            throw new Error('Missing required search parameters');
        }

        const results = await searchNearby(country, upgName, radius, units, type);
        
        // Create results HTML
        let html = '';
        
        if (results.fpgs.length > 0) {
            html += '<h3>Frontier People Groups:</h3>';
            html += '<div class="results-grid">';
            results.fpgs.forEach(fpg => {
                html += `
                    <div class="result-card">
                        <h4>${fpg.name}</h4>
                        <p>Country: ${fpg.country}</p>
                        <p>Distance: ${fpg.distance.toFixed(2)} ${units}</p>
                        <p>Population: ${fpg.population.toLocaleString()}</p>
                        <p>Language: ${fpg.language}</p>
                        <p>Religion: ${fpg.religion}</p>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        if (results.uupgs.length > 0) {
            html += '<h3>Unreached Unengaged People Groups:</h3>';
            html += '<div class="results-grid">';
            results.uupgs.forEach(uupg => {
                html += `
                    <div class="result-card">
                        <h4>${uupg.name}</h4>
                        <p>Country: ${uupg.country}</p>
                        <p>Distance: ${uupg.distance.toFixed(2)} ${units}</p>
                        <p>Population: ${uupg.population.toLocaleString()}</p>
                        <p>Language: ${uupg.language}</p>
                        <p>Religion: ${uupg.religion}</p>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (!results.fpgs.length && !results.uupgs.length) {
            html = '<p>No people groups found within the specified radius.</p>';
        }

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
    } catch (error) {
        console.error('Error displaying results:', error);
        errorElement.innerHTML = `<p>Error: ${error.message}</p>`;
        errorElement.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
    }
}

// Call displayResults when the page loads
displayResults();
