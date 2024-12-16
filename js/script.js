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

    // Populate country dropdown
    if (typeof upgData !== 'undefined') {
        const countries = new Set();

        upgData.forEach(group => {
            if (group.country) {
                countries.add(group.country);
            }
        });

        // Sort countries alphabetically and add to dropdown
        Array.from(countries).sort().forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });

        // Add event listener for country selection
        countrySelect.addEventListener('change', function() {
            const selectedCountry = this.value;
            updateUPGDropdown(selectedCountry);
        });
    } else {
        console.error('UPG data not loaded');
    }

    // Function to update UPG dropdown
    function updateUPGDropdown(selectedCountry) {
        upgSelect.innerHTML = '<option value="">Select a UPG</option>';
        
        if (!selectedCountry) {
            upgSelect.disabled = true;
            return;
        }

        // Filter UPGs for selected country
        const upgsInCountry = upgData.filter(group => group.country === selectedCountry);
        
        // Sort UPGs by name
        upgsInCountry.sort((a, b) => a.name.localeCompare(b.name));
        
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
            const sortBy = this.getAttribute('data-sort');
            
            // Update active button
            document.querySelectorAll('.sort-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Sort results
            sortResults(sortBy);
        });
    });

    // Add event listener for search button
    if (searchButton) {
        searchButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const country = countrySelect.value;
            const upg = upgSelect.value;
            const radius = document.getElementById('radius').value;
            const units = document.getElementById('units').value;

            if (!country || !upg || !radius) {
                alert('Please fill in all search fields');
                return;
            }

            // Show loading state
            const uupgList = document.getElementById('uupgList');
            const fpgList = document.getElementById('fpgList');
            uupgList.innerHTML = '<p class="loading">Searching for UUPGs...</p>';
            fpgList.innerHTML = '<p class="loading">Searching for FPGs...</p>';

            try {
                console.log('Searching with params:', { country, upg, radius, units });

                // Get reference UPG
                const referenceUPG = upgData.find(u => u.country === country && u.name === upg);
                if (!referenceUPG) {
                    throw new Error('Reference UPG not found');
                }

                // Search for nearby UUPGs from the CSV data
                const nearbyUUPGs = upgData
                    .filter(u => !(u.country === country && u.name === upg)) // Exclude reference UPG
                    .map(u => ({
                        ...u,
                        distance: calculateDistance(
                            referenceUPG.latitude,
                            referenceUPG.longitude,
                            u.latitude,
                            u.longitude,
                            units
                        )
                    }))
                    .filter(u => u.distance <= parseFloat(radius))
                    .sort((a, b) => a.distance - b.distance);

                // Display UUPG results
                if (nearbyUUPGs.length > 0) {
                    displayResults(nearbyUUPGs, 'uupg');
                } else {
                    uupgList.innerHTML = '<p class="no-results">No UUPGs found within the specified radius.</p>';
                }

                // For now, show same results in FPG section until we integrate Joshua Project API
                fpgList.innerHTML = '<p class="no-results">FPG search requires Joshua Project API integration.</p>';

                // Show the sort options if we have results
                if (nearbyUUPGs.length > 0) {
                    sortOptions.style.display = 'flex';
                }

            } catch (error) {
                console.error('Error during search:', error);
                uupgList.innerHTML = '<p class="error">Error searching for UUPGs. Please try again.</p>';
                fpgList.innerHTML = '<p class="error">Error searching for FPGs. Please try again.</p>';
            }
        });
    }
});

// Sorting functionality
function sortResults(sortBy) {
    const sortLists = ['uupgList', 'fpgList'];
    
    sortLists.forEach(listId => {
        const listElement = document.getElementById(listId);
        if (!listElement) return;
        
        const results = Array.from(listElement.children);
        if (results.length === 0) return;
        
        results.sort((a, b) => {
            const aValue = a.getAttribute(`data-${sortBy}`);
            const bValue = b.getAttribute(`data-${sortBy}`);
            
            if (sortBy === 'distance' || sortBy === 'population') {
                return parseFloat(aValue) - parseFloat(bValue);
            } else {
                return aValue.localeCompare(bValue);
            }
        });
        
        // Clear and re-append sorted items
        listElement.innerHTML = '';
        results.forEach(item => listElement.appendChild(item));
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

    // Add checkbox for selection
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = `${type}-${div.dataset.id}`;
    checkbox.className = 'group-checkbox';
    
    const checkboxContainer = document.createElement('label');
    checkboxContainer.className = 'checkbox-container';
    checkboxContainer.appendChild(checkbox);

    div.appendChild(checkboxContainer);
    
    const content = document.createElement('div');
    content.className = 'result-content';
    content.innerHTML = `
        <h3>${group.name}</h3>
        <p>
            <strong>Country:</strong> ${group.country}<br>
            <strong>Population:</strong> ${group.population.toLocaleString()}<br>
            <strong>Language:</strong> ${group.language}<br>
            <strong>Religion:</strong> ${group.religion}<br>
            <strong>Distance:</strong> ${distance.toFixed(1)} ${document.getElementById('units').value}
        </p>
    `;

    div.appendChild(content);
    return div;
}

// Display results function
function displayResults(groups, type) {
    const listElement = document.getElementById(`${type}List`);
    if (!listElement) return;
    
    listElement.innerHTML = '';
    
    groups.forEach(group => {
        const resultItem = createResultItem(group, type, group.distance);
        listElement.appendChild(resultItem);
    });
}
