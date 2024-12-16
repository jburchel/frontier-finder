// Initialize the results page when the DOM is loaded
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
                displayResults(results.uupgs, 'uupg');
            } else {
                document.getElementById('uupgList').innerHTML = '<p class="no-results">UUPG search disabled</p>';
            }

            if (searchType === 'both' || searchType === 'fpg') {
                displayResults(results.fpgs, 'fpg');
            } else {
                document.getElementById('fpgList').innerHTML = '<p class="no-results">FPG search disabled</p>';
            }

            // Show no results message if needed
            if (results.uupgs.length === 0 && results.fpgs.length === 0) {
                document.getElementById('uupgList').innerHTML = '<p class="no-results">No UUPGs found in this area</p>';
                document.getElementById('fpgList').innerHTML = '<p class="no-results">No FPGs found in this area</p>';
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
    const sortButtons = document.querySelectorAll('.sort-button');
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sortBy = this.getAttribute('data-sort');
            const currentOrder = this.getAttribute('data-order') || 'desc';
            
            // Toggle sort order
            const newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
            this.setAttribute('data-order', newOrder);
            
            // Update button appearance
            sortButtons.forEach(btn => {
                btn.classList.remove('active', 'asc', 'desc');
                if (btn === this) {
                    btn.classList.add('active', newOrder);
                }
            });
            
            // Sort results with new order
            sortResults(sortBy, newOrder);
        });
    });
});

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
