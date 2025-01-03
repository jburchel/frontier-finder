import { searchNearby } from './data.js';
import { db, collection, addDoc } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async function() {
    const resultsSection = document.querySelector('.results-section');
    const searchParams = document.getElementById('searchParams');
    const sortOptions = document.getElementById('sortOptions');
    const uupgList = document.getElementById('uupgList');
    const fpgList = document.getElementById('fpgList');
    const addToTop100Button = document.getElementById('addToTop100');
    const errorElement = document.getElementById('error');

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

        // Enable/disable Add to Top 100 button based on selections
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('group-select')) {
                const checkedBoxes = document.querySelectorAll('.group-select:checked');
                addToTop100Button.disabled = checkedBoxes.length === 0;
            }
        });

        // Handle Add to Top 100 button click
        addToTop100Button.addEventListener('click', async () => {
            try {
                // Disable button and show loading state
                addToTop100Button.disabled = true;
                addToTop100Button.textContent = 'Adding to Top 100...';
                errorElement.style.display = 'none';

                const selectedGroups = [];
                const checkedBoxes = document.querySelectorAll('.group-select:checked');
                
                checkedBoxes.forEach(checkbox => {
                    const groupItem = checkbox.closest('.result-item');
                    const groupData = JSON.parse(groupItem.dataset.info);
                    const groupType = checkbox.dataset.groupType;
                    
                    selectedGroups.push({
                        ...groupData,
                        type: groupType,
                        dateAdded: new Date().toISOString()
                    });
                });

                // Add selected groups to Firebase
                console.log('Adding groups to Top 100:', selectedGroups);
                const top100Collection = collection(db, 'top100');
                
                const addResults = await Promise.all(
                    selectedGroups.map(group => addDoc(top100Collection, group))
                );

                console.log('Successfully added groups to Top 100');
                
                // Redirect to top100.html
                window.location.href = 'top100.html';
                
            } catch (error) {
                console.error('Error adding groups to Top 100:', error);
                errorElement.textContent = 'Error adding groups to Top 100. Please try again.';
                errorElement.style.display = 'block';
                
                // Reset button state
                addToTop100Button.disabled = false;
                addToTop100Button.textContent = 'Add Selected to Top 100';
            }
        });

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
    card.className = `result-item ${type} ministry-card`;
    
    const content = `
        <div class="content-wrapper">
            <h3 class="cronos-pro">${group.name}</h3>
            <div class="gospel-access-stats">
                <span class="stat-label">Evangelical Presence:</span>
                <span class="stat-value">${group.evangelical}%</span>
            </div>
            <div class="result-details">
                <span class="ministry-focus">
                    ${group.type === 'fpg' ? 'Frontier People Group' : 'Unengaged Unreached People Group'}
                </span>
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
                ${group.evangelical ? `<span><strong>Evangelical:</strong> ${group.evangelical}%</span>` : ''}
            </div>
            <div class="ministry-potential">
                <span>Population without Gospel access: ${calculateGospelAccess(group.population, group.evangelical)}</span>
            </div>
        </div>
    `;
    return card;
}

function calculateGospelAccess(population, evangelicalPercentage) {
    const withoutAccess = population * (1 - (evangelicalPercentage / 100));
    return withoutAccess.toLocaleString();
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

function handleError(error, component) {
    const errorMessages = {
        'RATE_LIMIT_EXCEEDED': 'Daily API limit reached. Please try again tomorrow.',
        'INVALID_COORDINATES': 'Invalid location coordinates provided.',
        'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
        'DEFAULT': 'An unexpected error occurred. Please try again.'
    };

    const message = errorMessages[error.code] || errorMessages.DEFAULT;
    console.error(`${component} error:`, error);
    
    return {
        message,
        code: error.code,
        component
    };
}
