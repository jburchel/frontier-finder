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
    if (!results || results.length === 0) {
        listElement.innerHTML = `<p class="no-results">No ${type.toUpperCase()}s found in this area</p>`;
        return;
    }

    const resultHtml = results.map((group, index) => `
        <div class="result-item" data-index="${index}">
            <h3>${group.name}</h3>
            <div class="result-details">
                <span><strong>Country:</strong> ${group.country}</span>
                <span><strong>Population:</strong> ${group.population.toLocaleString()}</span>
                <span><strong>Language:</strong> ${group.language}</span>
                <span><strong>Religion:</strong> ${group.religion}</span>
                <span><strong>Distance:</strong> ${group.distance.toFixed(1)} ${units}</span>
            </div>
            <button class="add-to-list-button" onclick="addToTop100('${type}', ${index})">
                Add to Top 100
            </button>
        </div>
    `).join('');

    listElement.innerHTML = resultHtml;
}

// Function to sort results
function sortResults(sortBy, order) {
    ['uupg', 'fpg'].forEach(type => {
        const listElement = document.getElementById(`${type}List`);
        const items = Array.from(listElement.getElementsByClassName('result-item'));
        
        if (items.length === 0) return;

        items.sort((a, b) => {
            const aValue = a.querySelector(`[data-${sortBy}]`)?.dataset[sortBy];
            const bValue = b.querySelector(`[data-${sortBy}]`)?.dataset[sortBy];
            
            if (sortBy === 'distance' || sortBy === 'population') {
                return order === 'asc' 
                    ? parseFloat(aValue) - parseFloat(bValue)
                    : parseFloat(bValue) - parseFloat(aValue);
            }
            
            return order === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        });

        listElement.innerHTML = '';
        items.forEach(item => listElement.appendChild(item));
    });
}

// Initialize the results page
document.addEventListener('DOMContentLoaded', async function() {
    // Get search parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const country = urlParams.get('country');
    const upgName = urlParams.get('upg');
    const radius = urlParams.get('radius');
    const units = urlParams.get('units');
    const searchType = urlParams.get('type');

    // Display search parameters
    displaySearchParams(country, upgName, radius, units, searchType);

    // Perform search if we have all required parameters
    if (country && upgName && radius) {
        try {
            // Show loading state
            document.getElementById('uupgList').innerHTML = '<p class="loading">Searching...</p>';
            document.getElementById('fpgList').innerHTML = '<p class="loading">Searching...</p>';

            // Show sort options
            document.getElementById('sortOptions').style.display = 'flex';

            // Perform search
            const results = await searchNearby(country, upgName, radius, units);

            // Display results based on search type
            if (searchType === 'both' || searchType === 'uupg') {
                displayResults(results.uupgs, 'uupg', units);
            } else {
                document.getElementById('uupgList').innerHTML = '<p class="no-results">UUPG search disabled</p>';
            }

            if (searchType === 'both' || searchType === 'fpg') {
                displayResults(results.fpgs, 'fpg', units);
            } else {
                document.getElementById('fpgList').innerHTML = '<p class="no-results">FPG search disabled</p>';
            }

        } catch (error) {
            console.error('Search error:', error);
            document.getElementById('uupgList').innerHTML = '<p class="error">Error performing search</p>';
            document.getElementById('fpgList').innerHTML = '<p class="error">Error performing search</p>';
        }
    } else {
        // Handle case where parameters are missing
        document.getElementById('uupgList').innerHTML = '<p class="error">Missing search parameters</p>';
        document.getElementById('fpgList').innerHTML = '<p class="error">Missing search parameters</p>';
    }

    // Add event listeners to sort buttons
    document.querySelectorAll('.sort-button').forEach(button => {
        button.addEventListener('click', function() {
            const sortBy = this.dataset.sort;
            const currentOrder = this.dataset.order || 'asc';
            const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
            
            // Update all buttons
            document.querySelectorAll('.sort-button').forEach(btn => {
                btn.classList.remove('active', 'asc', 'desc');
            });
            
            // Update clicked button
            this.classList.add('active', newOrder);
            this.dataset.order = newOrder;
            
            // Sort results
            sortResults(sortBy, newOrder);
        });
    });
});
