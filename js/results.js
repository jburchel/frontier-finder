import { searchNearby } from './data.js';

document.addEventListener('DOMContentLoaded', async function() {
    const resultsSection = document.querySelector('.results-section');
    const searchParams = document.getElementById('searchParams');
    const sortOptions = document.getElementById('sortOptions');
    const uupgList = document.getElementById('uupgList');
    const fpgList = document.getElementById('fpgList');

    try {
        // Get search parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const country = urlParams.get('country');
        const upg = urlParams.get('upg');
        const radius = urlParams.get('radius');
        const units = urlParams.get('units') || 'kilometers';
        const type = urlParams.get('type') || 'both';

        if (!country || !upg || !radius) {
            throw new Error('Missing required search parameters');
        }

        // Update search parameters display
        searchParams.innerHTML = `
            <p><strong>Country:</strong> ${country}</p>
            <p><strong>UPG:</strong> ${upg}</p>
            <p><strong>Radius:</strong> ${radius} ${units}</p>
            <p><strong>Search Type:</strong> ${type.toUpperCase()}</p>
        `;

        // Show loading state
        uupgList.innerHTML = '<div class="loading">Loading...</div>';
        fpgList.innerHTML = '<div class="loading">Loading...</div>';

        // Perform search
        const results = await searchNearby(country, upg, radius, units, type);

        // Display results based on type
        if (type === 'both' || type === 'uupg') {
            if (results.uupgs && results.uupgs.length > 0) {
                displayUUPGResults(results.uupgs);
            } else {
                uupgList.innerHTML = '<p class="no-results">No UUPGs found in this area</p>';
            }
        }

        if (type === 'both' || type === 'fpg') {
            if (results.fpgs && results.fpgs.length > 0) {
                displayFPGResults(results.fpgs);
            } else {
                fpgList.innerHTML = '<p class="no-results">No FPGs found in this area</p>';
            }
        }

        // Show sort options if we have results
        sortOptions.style.display = (results.uupgs?.length > 0 || results.fpgs?.length > 0) ? 'block' : 'none';

    } catch (error) {
        console.error('Error loading results:', error);
        searchParams.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        uupgList.innerHTML = '';
        fpgList.innerHTML = '';
    }
});

function displayUUPGResults(uupgs) {
    const uupgList = document.getElementById('uupgList');
    uupgList.innerHTML = '';

    uupgs.forEach(uupg => {
        const card = createResultCard(uupg, 'uupg');
        uupgList.appendChild(card);
    });
}

function displayFPGResults(fpgs) {
    const fpgList = document.getElementById('fpgList');
    fpgList.innerHTML = '';

    fpgs.forEach(fpg => {
        const card = createResultCard(fpg, 'fpg');
        fpgList.appendChild(card);
    });
}

function createResultCard(group, type) {
    const card = document.createElement('div');
    card.className = `result-item ${type}`;
    card.dataset.info = JSON.stringify(group);

    const content = `
        <div class="checkbox-wrapper">
            <input type="checkbox" class="group-select" data-group-type="${type}">
        </div>
        <div class="content-wrapper">
            <h3>${group.name || group.PeopleName}</h3>
            <div class="result-details">
                <span class="type-badge ${type}">${type.toUpperCase()}</span>
                <span><strong>Distance:</strong> ${group.distance.toFixed(2)} ${group.units}</span>
                ${group.population ? `<span><strong>Population:</strong> ${Number(group.population).toLocaleString()}</span>` : ''}
                ${group.pronunciation ? `
                    <span>
                        <strong>Pronunciation:</strong> ${group.pronunciation}
                        <button onclick="speakText('${group.pronunciation}')" aria-label="Listen to pronunciation">🔊</button>
                    </span>
                ` : ''}
                ${group.language ? `<span><strong>Language:</strong> ${group.language}</span>` : ''}
                ${group.religion ? `<span><strong>Religion:</strong> ${group.religion}</span>` : ''}
            </div>
        </div>
    `;

    card.innerHTML = content;
    return card;
}

// Handle sort options
document.querySelectorAll('.sort-button').forEach(button => {
    button.addEventListener('click', () => {
        const sortBy = button.dataset.sort;
        sortResults(sortBy);
    });
});

// Add sort functionality
function sortResults(sortBy, order = 'asc') {
    const lists = ['fpgList', 'uupgList'];
    
    lists.forEach(listId => {
        const list = document.getElementById(listId);
        if (!list) return;

        const items = Array.from(list.getElementsByClassName('result-item'));
        items.sort((a, b) => {
            const aValue = JSON.parse(a.dataset.info)[sortBy];
            const bValue = JSON.parse(b.dataset.info)[sortBy];
            
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
