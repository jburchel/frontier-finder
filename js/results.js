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

        // Get results from sessionStorage
        const results = JSON.parse(sessionStorage.getItem('searchResults'));

        if (!results) {
            showError('No results found. Please try your search again.');
            return;
        }

        // Display search parameters
        displaySearchParams(searchParams);

        // Display results
        displayResults(results);

    } catch (error) {
        console.error('Error displaying results:', error);
        showError('Error displaying results: ' + error.message);
    }
});

function displaySearchParams(params) {
    const searchParamsDiv = document.getElementById('searchParams');
    searchParamsDiv.innerHTML = `
        <p><strong>Country:</strong> ${params.country}</p>
        <p><strong>UPG:</strong> ${params.upg}</p>
        <p><strong>Search Radius:</strong> ${params.radius} ${params.units}</p>
        <p><strong>Search Type:</strong> ${params.type}</p>
    `;
}

function displayResults(results) {
    const { baseUPG, results: peopleGroups } = results;

    // Display UUPGs
    const uupgList = document.getElementById('uupgList');
    const fpgList = document.getElementById('fpgList');

    if (!peopleGroups || peopleGroups.length === 0) {
        uupgList.innerHTML = '<p class="no-results">No people groups found within the specified radius.</p>';
        fpgList.innerHTML = '<p class="no-results">No people groups found within the specified radius.</p>';
        return;
    }

    // Separate UUPGs and FPGs
    const uupgs = peopleGroups.filter(group => group.is_uupg);
    const fpgs = peopleGroups.filter(group => group.is_frontier);

    // Display UUPGs
    uupgList.innerHTML = uupgs.length ? 
        uupgs.map(group => createResultCard(group, baseUPG)).join('') :
        '<p class="no-results">No UUPGs found within the specified radius.</p>';

    // Display FPGs
    fpgList.innerHTML = fpgs.length ?
        fpgs.map(group => createResultCard(group, baseUPG)).join('') :
        '<p class="no-results">No FPGs found within the specified radius.</p>';
}

function createResultCard(group, baseUPG) {
    return `
        <div class="result-card">
            <h3>${group.PeopleName}</h3>
            <p><strong>Distance:</strong> ${calculateDistance(baseUPG, group).toFixed(2)} km</p>
            <p><strong>Population:</strong> ${group.Population?.toLocaleString() || 'Unknown'}</p>
            <p><strong>Language:</strong> ${group.PrimaryLanguageName || 'Unknown'}</p>
            <p><strong>Religion:</strong> ${group.PrimaryReligion || 'Unknown'}</p>
            ${group.JPScale ? `<p><strong>JP Scale:</strong> ${group.JPScale}</p>` : ''}
        </div>
    `;
}

function calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in kilometers
    const lat1 = parseFloat(point1.latitude);
    const lon1 = parseFloat(point1.longitude);
    const lat2 = parseFloat(point2.Latitude);
    const lon2 = parseFloat(point2.Longitude);

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function showError(message) {
    const container = document.querySelector('.container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    container.insertBefore(errorDiv, container.firstChild);
}
