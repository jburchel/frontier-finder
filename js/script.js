// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const searchButton = document.getElementById('searchButton');
    const sortOptions = document.getElementById('sortOptions');

    // Initially hide sort options
    if (sortOptions) {
        sortOptions.style.display = 'none';
    }

    // Add event listener for country selection
    countrySelect.addEventListener('change', function() {
        const selectedCountry = this.value;
        console.log('Country selected:', selectedCountry);
        updateUPGDropdown(selectedCountry);
    });

    // Function to update UPG dropdown
    function updateUPGDropdown(selectedCountry) {
        console.log('Updating UPG dropdown for country:', selectedCountry);
        upgSelect.innerHTML = '<option value="">Select a UPG</option>';
        
        if (!selectedCountry) {
            upgSelect.disabled = true;
            return;
        }

        // Get UPGs for selected country using the function from data.js
        const upgsInCountry = getUPGsByCountry(selectedCountry);
        console.log('UPGs found for country:', upgsInCountry);
        
        if (!upgsInCountry || upgsInCountry.length === 0) {
            upgSelect.innerHTML = '<option value="">No UPGs found</option>';
            upgSelect.disabled = true;
            return;
        }
        
        // Add UPGs to dropdown
        upgsInCountry.forEach(upg => {
            const option = document.createElement('option');
            option.value = upg.name;
            option.textContent = upg.name;
            upgSelect.appendChild(option);
        });

        // Enable UPG dropdown
        upgSelect.disabled = false;
    }

    // Add event listeners to sort buttons
    const sortButtons = document.querySelectorAll('.sort-button');
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            sortButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Get sort type and sort results
            const sortBy = this.getAttribute('data-sort');
            sortResults(sortBy);
        });
    });

    // Add form submit handler
    document.getElementById('searchForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const country = countrySelect.value;
        const upgName = upgSelect.value;
        const radius = document.getElementById('radius').value;
        const units = document.getElementById('units').value;
        const searchType = document.getElementById('type').value;

        if (!country || !upgName || !radius) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            // Show loading state
            document.getElementById('uupgList').innerHTML = '<p class="loading">Searching...</p>';
            document.getElementById('fpgList').innerHTML = '<p class="loading">Searching...</p>';

            // Perform search
            const results = await searchNearby(country, upgName, radius, units);

            // Show sort options
            sortOptions.style.display = 'flex';

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
    });
});

// Sorting functionality
function sortResults(sortBy) {
    ['uupg', 'fpg'].forEach(type => {
        const listElement = document.getElementById(`${type}List`);
        const items = Array.from(listElement.getElementsByClassName('result-item'));
        
        items.sort((a, b) => {
            let aValue = a.getAttribute(`data-${sortBy}`);
            let bValue = b.getAttribute(`data-${sortBy}`);
            
            // Convert to numbers for distance and population
            if (sortBy === 'distance' || sortBy === 'population') {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
                return bValue - aValue; // Descending order for numbers
            }
            
            // String comparison for other fields (country, language, religion)
            return bValue.localeCompare(aValue); // Descending order for strings
        });
        
        // Clear and re-append sorted items
        items.forEach(item => listElement.appendChild(item));
    });
}

// Function to create result item
function createResultItem(group, type, distance) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.dataset.id = group.id || `${group.name}-${group.country}`;
    div.dataset.name = group.name;
    div.dataset.country = group.country;
    div.dataset.population = group.population;
    div.dataset.language = group.language;
    div.dataset.religion = group.religion;
    div.dataset.distance = distance;

    // Create header with name and checkbox
    const header = document.createElement('div');
    header.className = 'result-header';
    
    const title = document.createElement('h3');
    title.textContent = group.name;
    
    // Add checkbox for selection
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = `${type}-${div.dataset.id}`;
    checkbox.className = 'group-checkbox';
    
    const checkboxContainer = document.createElement('label');
    checkboxContainer.className = 'checkbox-container';
    checkboxContainer.appendChild(checkbox);

    header.appendChild(checkboxContainer);
    header.appendChild(title);
    
    const content = document.createElement('div');
    content.className = 'result-content';
    content.innerHTML = `
        <p>
            <strong>Country:</strong> ${group.country}<br>
            <strong>Population:</strong> ${group.population.toLocaleString()}<br>
            <strong>Language:</strong> ${group.language}<br>
            <strong>Religion:</strong> ${group.religion}<br>
            <strong>Distance:</strong> ${distance.toFixed(1)} ${document.getElementById('units').value}
        </p>
    `;

    div.appendChild(header);
    div.appendChild(content);
    return div;
}

// Display results function
function displayResults(groups, type) {
    const listElement = document.getElementById(`${type}List`);
    listElement.innerHTML = '';
    
    if (groups.length === 0) {
        listElement.innerHTML = `<p class="no-results">No ${type.toUpperCase()}s found in this area</p>`;
        return;
    }
    
    groups.forEach(group => {
        const resultItem = createResultItem(group, type, group.distance);
        listElement.appendChild(resultItem);
    });
}
