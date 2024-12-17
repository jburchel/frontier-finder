import { searchNearby, initializeUI } from './data.js';

document.addEventListener('DOMContentLoaded', async function() {
    const searchForm = document.getElementById('searchForm');
    const yearSpan = document.getElementById('year');
    const resultsSection = document.querySelector('.results-section');
    const searchParams = document.getElementById('searchParams');
    const sortOptions = document.getElementById('sortOptions');

    if (!searchForm) {
        console.error('Required elements not found');
        throw new Error('Required form elements not found');
    }

    try {
        // Update year in footer
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }

        // Handle form submission
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const country = document.getElementById('country').value;
            const upg = document.getElementById('upg').value;
            const radius = document.getElementById('radius').value;
            const units = document.getElementById('units').value;
            const searchType = document.getElementById('searchType').value;
            
            if (!country || !upg || !radius) {
                alert('Please fill in all required fields');
                return;
            }
            
            try {
                // Show loading state
                resultsSection.style.display = 'block';
                searchParams.textContent = `Searching for people groups within ${radius} ${units} of ${upg} in ${country}...`;
                sortOptions.style.display = 'none';
                document.getElementById('results').innerHTML = '<div class="loading">Loading...</div>';
                
                // Perform search
                const results = await searchNearby(country, upg, radius, units, searchType);
                
                // Display results
                if (results && results.length > 0) {
                    displayResults(results);
                    sortOptions.style.display = 'block';
                } else {
                    document.getElementById('results').innerHTML = '<p>No results found.</p>';
                    sortOptions.style.display = 'none';
                }
                
                // Update search parameters display
                searchParams.textContent = `Found ${results.length} people groups within ${radius} ${units} of ${upg} in ${country}`;
                
            } catch (error) {
                console.error('Error performing search:', error);
                document.getElementById('results').innerHTML = '<p class="error">Error performing search. Please try again.</p>';
                sortOptions.style.display = 'none';
            }
        });

        // Handle sort options
        document.getElementById('sort').addEventListener('change', function(e) {
            sortResults(e.target.value);
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
