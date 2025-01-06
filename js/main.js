import { searchNearby, initializeUI } from './data.js';

document.addEventListener('DOMContentLoaded', async function() {
    const searchForm = document.getElementById('searchForm');
    const yearSpan = document.getElementById('year');
    const resultsSection = document.getElementById('results-section');
    const searchParams = document.getElementById('searchParams');
    const sortOptions = document.getElementById('sortOptions');

    if (!searchForm) {
        console.error('Required elements not found');
        throw new Error('Required form elements not found');
    }

    try {
        // Initialize UI components
        await initializeUI();

        // Update year in footer
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }

        // Handle form submission
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const country = document.getElementById('country').value;
                const upg = document.getElementById('upg').value;
                const radius = document.getElementById('radius').value;
                const units = document.querySelector('input[name="units"]:checked').value;
                const type = document.querySelector('input[name="type"]:checked').value;
                
                if (!country || !upg || !radius) {
                    alert('Please fill in all required fields');
                    return;
                }

                const searchButton = searchForm.querySelector('button[type="submit"]');
                searchButton.disabled = true;
                searchButton.textContent = 'Searching...';
                
                try {
                    const results = await searchNearby(country, upg, radius, units, type);
                    console.log('Search results:', results);
                    
                    // Store results in sessionStorage
                    sessionStorage.setItem('searchResults', JSON.stringify(results));
                    
                    // Redirect to results page
                    const params = new URLSearchParams({
                        country, upg, radius, units, type
                    });
                    window.location.href = `results.html?${params.toString()}`;
                    
                } catch (error) {
                    console.error('Search failed:', error);
                    showError(`Search failed: ${error.message}`);
                    searchButton.disabled = false;
                    searchButton.textContent = 'Search';
                }
                
            } catch (error) {
                console.error('Form error:', error);
                showError(error.message);
            }
        });

    } catch (error) {
        console.error('Error initializing form:', error);
        alert('There was an error loading the form. Please try refreshing the page.');
    }
});

function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';
    
    results.forEach(group => {
        const card = createResultCard(group);
        resultsContainer.appendChild(card);
    });
}

function createResultCard(group) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.dataset.distance = group.distance;
    card.dataset.population = group.Population || 0;
    
    const content = `
        <h3>${group.PeopleName || group.name}</h3>
        <p><strong>Distance:</strong> ${group.distance.toFixed(2)} ${group.units}</p>
        ${group.Population ? `<p><strong>Population:</strong> ${group.Population.toLocaleString()}</p>` : ''}
        ${group.pronunciation ? `<p><strong>Pronunciation:</strong> ${group.pronunciation} <button onclick="speakText('${group.pronunciation}')" aria-label="Listen to pronunciation">🔊</button></p>` : ''}
        ${group.Language ? `<p><strong>Language:</strong> ${group.Language}</p>` : ''}
        ${group.Religion ? `<p><strong>Religion:</strong> ${group.Religion}</p>` : ''}
    `;
    
    card.innerHTML = content;
    return card;
}

function sortResults(sortBy) {
    const resultsContainer = document.getElementById('results');
    const cards = Array.from(resultsContainer.children);
    
    cards.sort((a, b) => {
        const aValue = getValueFromCard(a, sortBy);
        const bValue = getValueFromCard(b, sortBy);
        
        if (sortBy === 'distance') {
            return aValue - bValue;
        } else if (sortBy === 'population') {
            return bValue - aValue;
        } else {
            return 0;
        }
    });
    
    resultsContainer.innerHTML = '';
    cards.forEach(card => resultsContainer.appendChild(card));
}

function getValueFromCard(card, sortBy) {
    switch (sortBy) {
        case 'distance':
            return parseFloat(card.dataset.distance) || Infinity;
        case 'population':
            return parseInt(card.dataset.population) || 0;
        default:
            return 0;
    }
}

// Add this to handle the results page
if (window.location.pathname.includes('results.html')) {
    const results = JSON.parse(sessionStorage.getItem('searchResults'));
    const params = new URLSearchParams(window.location.search);
    
    // Display results
    if (results) {
        document.getElementById('searchParams').innerHTML = `
            <p>Country: ${params.get('country')}</p>
            <p>UPG: ${params.get('upg')}</p>
            <p>Radius: ${params.get('radius')} ${params.get('units')}</p>
            <p>Search Type: ${params.get('type')}</p>
        `;
        
        // Show results section
        document.querySelector('.results-section').style.display = 'block';
    }
}
