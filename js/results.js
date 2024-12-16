import { searchNearby, loadUUPGData, loadExistingUPGs } from './data.js';

// Get search parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const country = urlParams.get('country');
const upgName = urlParams.get('upg');
const radius = parseFloat(urlParams.get('radius'));
const units = urlParams.get('units') || 'kilometers';
const type = urlParams.get('type') || 'both';

// Display search parameters
document.getElementById('searchParams').innerHTML = `
    <p><strong>Country:</strong> ${country}</p>
    <p><strong>UPG:</strong> ${upgName}</p>
    <p><strong>Radius:</strong> ${radius} ${units}</p>
    <p><strong>Search Type:</strong> ${type.toUpperCase()}</p>
`;

async function displayResults() {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const uupgList = document.getElementById('uupgList');
    const fpgList = document.getElementById('fpgList');
    const sortOptions = document.getElementById('sortOptions');

    try {
        if (loadingElement) loadingElement.style.display = 'block';
        if (errorElement) errorElement.style.display = 'none';
        if (uupgList) uupgList.innerHTML = '';
        if (fpgList) fpgList.innerHTML = '';

        // Validate input parameters
        if (!country || !upgName || !radius) {
            throw new Error('Missing required search parameters');
        }

        // Load data first
        await Promise.all([loadUUPGData(), loadExistingUPGs()]);

        const results = await searchNearby(country, upgName, radius, units, type);
        
        // Display FPGs
        if (results.fpgs && results.fpgs.length > 0) {
            const fpgHtml = results.fpgs.map(fpg => `
                <div class="result-item">
                    <h3>${fpg.name}</h3>
                    <div class="result-details">
                        <span><strong>Country:</strong> ${fpg.country}</span>
                        <span><strong>Distance:</strong> ${fpg.distance.toFixed(1)} ${units}</span>
                        <span><strong>Population:</strong> ${fpg.population.toLocaleString()}</span>
                        <span><strong>Language:</strong> ${fpg.language || 'Unknown'}</span>
                        <span><strong>Religion:</strong> ${fpg.religion || 'Unknown'}</span>
                    </div>
                </div>
            `).join('');
            if (fpgList) fpgList.innerHTML = fpgHtml;
        } else {
            if (fpgList) fpgList.innerHTML = '<p class="no-results">No FPGs found in this area</p>';
        }

        // Display UUPGs
        if (results.uupgs && results.uupgs.length > 0) {
            const uupgHtml = results.uupgs.map(uupg => `
                <div class="result-item">
                    <h3>${uupg.name}</h3>
                    <div class="result-details">
                        <span><strong>Country:</strong> ${uupg.country}</span>
                        <span><strong>Distance:</strong> ${uupg.distance.toFixed(1)} ${units}</span>
                        <span><strong>Population:</strong> ${uupg.population.toLocaleString()}</span>
                        <span><strong>Language:</strong> ${uupg.language || 'Unknown'}</span>
                        <span><strong>Religion:</strong> ${uupg.religion || 'Unknown'}</span>
                    </div>
                </div>
            `).join('');
            if (uupgList) uupgList.innerHTML = uupgHtml;
        } else {
            if (uupgList) uupgList.innerHTML = '<p class="no-results">No UUPGs found in this area</p>';
        }

        // Show sort options if we have results
        if (sortOptions) {
            sortOptions.style.display = (results.fpgs?.length > 0 || results.uupgs?.length > 0) ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Error displaying results:', error);
        if (errorElement) {
            errorElement.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            errorElement.style.display = 'block';
        }
        if (uupgList) uupgList.innerHTML = '';
        if (fpgList) fpgList.innerHTML = '';
    } finally {
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

// Add sort functionality
function sortResults(sortBy, order = 'asc') {
    const lists = ['fpgList', 'uupgList'];
    
    lists.forEach(listId => {
        const list = document.getElementById(listId);
        if (!list) return;

        const items = Array.from(list.getElementsByClassName('result-item'));
        items.sort((a, b) => {
            const aValue = getValueFromItem(a, sortBy);
            const bValue = getValueFromItem(b, sortBy);
            
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return order === 'asc' ? aValue - bValue : bValue - aValue;
            }
            
            return order === 'asc' 
                ? String(aValue).localeCompare(String(bValue))
                : String(bValue).localeCompare(String(aValue));
        });

        items.forEach(item => list.appendChild(item));
    });
}

function getValueFromItem(item, sortBy) {
    const detailsDiv = item.querySelector('.result-details');
    if (!detailsDiv) return '';

    const spans = Array.from(detailsDiv.getElementsByTagName('span'));
    const span = spans.find(s => s.textContent.toLowerCase().includes(sortBy.toLowerCase()));
    if (!span) return '';

    const value = span.textContent.split(':')[1].trim();
    
    switch (sortBy.toLowerCase()) {
        case 'distance':
            return parseFloat(value) || Infinity;
        case 'population':
            return parseInt(value.replace(/,/g, '')) || 0;
        default:
            return value;
    }
}

// Add event listeners for sort buttons
document.querySelectorAll('.sort-button').forEach(button => {
    button.addEventListener('click', () => {
        const sortBy = button.dataset.sort;
        sortResults(sortBy);
    });
});

// Call displayResults when the page loads
displayResults();
