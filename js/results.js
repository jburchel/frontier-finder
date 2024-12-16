import { loadAllData, searchNearby } from './data.js';

// Function to display search parameters
function displaySearchParams(country, upgName, radius, units, searchType) {
    const searchParams = document.getElementById('searchParams');
    searchParams.innerHTML = `
        <p><strong>Country:</strong> ${country}</p>
        <p><strong>UPG:</strong> ${upgName}</p>
        <p><strong>Radius:</strong> ${radius} ${units}</p>
        <p><strong>Search Type:</strong> ${searchType.toUpperCase()}</p>
    `;
}

// Function to display results
function displayResults(results, type, units) {
    const listElement = document.getElementById(`${type}List`);
    if (!listElement) {
        console.error(`Element with id "${type}List" not found`);
        return;
    }

    if (!results || results.length === 0) {
        listElement.innerHTML = `<p class="no-results">No ${type.toUpperCase()}s found in this area</p>`;
        return;
    }

    try {
        const resultHtml = results.map((group, index) => {
            if (!group) {
                console.error(`Invalid group at index ${index}`);
                return '';
            }

            return `
                <div class="result-item" data-index="${index}">
                    <h3>${group.name || 'Unknown'}</h3>
                    <div class="result-details">
                        <span><strong>Country:</strong> ${group.country || 'Unknown'}</span>
                        <span><strong>Population:</strong> ${(group.population || 0).toLocaleString()}</span>
                        <span><strong>Language:</strong> ${group.language || 'Unknown'}</span>
                        <span><strong>Religion:</strong> ${group.religion || 'Unknown'}</span>
                        <span><strong>Distance:</strong> ${(group.distance || 0).toFixed(1)} ${units}</span>
                    </div>
                </div>
            `;
        }).filter(Boolean).join('');

        listElement.innerHTML = resultHtml || '<p class="no-results">Error displaying results</p>';
    } catch (error) {
        console.error('Error displaying results:', error);
        listElement.innerHTML = '<p class="no-results">Error displaying results</p>';
    }
}

// Function to sort results
function sortResults(sortBy, order = 'asc') {
    const fpgList = document.getElementById('fpgList');
    const uupgList = document.getElementById('uupgList');
    
    [fpgList, uupgList].forEach(list => {
        if (!list) return;

        const items = Array.from(list.getElementsByClassName('result-item'));
        items.sort((a, b) => {
            const aValue = getValueFromCard(a, sortBy);
            const bValue = getValueFromCard(b, sortBy);
            
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

function getValueFromCard(card, sortBy) {
    const text = card.textContent;
    switch (sortBy.toLowerCase()) {
        case 'distance':
            const distanceMatch = text.match(/Distance:\s*([\d.]+)/);
            return distanceMatch ? parseFloat(distanceMatch[1]) : Infinity;
        case 'population':
            const popMatch = text.match(/Population:\s*([\d,]+)/);
            return popMatch ? parseInt(popMatch[1].replace(/,/g, '')) : 0;
        case 'country':
            const countryMatch = text.match(/Country:\s*([^\n]+)/);
            return countryMatch ? countryMatch[1].trim() : '';
        case 'language':
            const langMatch = text.match(/Language:\s*([^\n]+)/);
            return langMatch ? langMatch[1].trim() : '';
        case 'religion':
            const relMatch = text.match(/Religion:\s*([^\n]+)/);
            return relMatch ? relMatch[1].trim() : '';
        default:
            return '';
    }
}

// Initialize the results page
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Get search parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const country = urlParams.get('country');
        const upg = urlParams.get('upg');
        const radius = urlParams.get('radius');
        const units = urlParams.get('units');
        const type = urlParams.get('type');

        if (!country || !upg || !radius) {
            throw new Error('Missing required search parameters');
        }

        // Display search parameters
        displaySearchParams(country, upg, radius, units, type);

        // Load data
        console.log('Loading data...');
        await loadAllData();
        console.log('Data loaded successfully');

        // Perform search
        console.log('Performing search with params:', { country, upg, radius, units, type });
        const results = await searchNearby(
            country,
            upg,
            parseFloat(radius),
            units,
            type
        );

        if (!results) {
            throw new Error('No results returned from search');
        }

        // Show sort options
        document.getElementById('sortOptions').style.display = 'block';

        // Display results
        if (type === 'fpg' || type === 'both') {
            displayResults(results.fpgs, 'fpg', units);
        }
        if (type === 'uupg' || type === 'both') {
            displayResults(results.uupgs, 'uupg', units);
        }

        // Add sort button listeners
        document.querySelectorAll('.sort-button').forEach(button => {
            button.addEventListener('click', () => {
                const sortBy = button.dataset.sort;
                sortResults(sortBy);
            });
        });

    } catch (error) {
        console.error('Error initializing results page:', error);
        document.querySelector('main').innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>${error.message}</p>
                <a href="index.html" class="button">Back to Search</a>
            </div>
        `;
    }
});
