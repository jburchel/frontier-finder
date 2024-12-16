// Sorting functionality
function sortResults(sortBy) {
    const sortLists = ['uupgList', 'fpgList'];
    
    sortLists.forEach(listId => {
        const listElement = document.getElementById(listId);
        if (!listElement) return;
        
        const results = Array.from(listElement.children);
        
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

// Populate country dropdown
document.addEventListener('DOMContentLoaded', function() {
    const countrySelect = document.getElementById('country');
    const countries = new Set();

    // Collect all unique countries from UPG data
    if (typeof upgData !== 'undefined') {
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
            const upgSelect = document.getElementById('upg');
            upgSelect.innerHTML = '<option value="">Select a UPG</option>';

            // Filter UPGs for selected country
            const upgsInCountry = upgData.filter(group => group.country === selectedCountry);
            
            // Populate UPG dropdown
            upgsInCountry.forEach(upg => {
                const option = document.createElement('option');
                option.value = upg.name;
                option.textContent = upg.name;
                upgSelect.appendChild(option);
            });
        });
    } else {
        console.error('UPG data not loaded');
    }
});

// Add event listeners to sort buttons
document.addEventListener('DOMContentLoaded', function() {
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
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const country = document.getElementById('country').value;
            const upg = document.getElementById('upg').value;
            const radius = document.getElementById('radius').value;
            const units = document.getElementById('units').value;

            if (!country || !upg || !radius) {
                alert('Please fill in all search fields');
                return;
            }

            // Search for nearby groups
            const nearbyGroups = searchNearby(country, upg, radius, units);
            
            // Display results
            if (nearbyGroups.uupgs) {
                displayResults(nearbyGroups.uupgs, 'uupg');
            }
            if (nearbyGroups.fpgs) {
                displayResults(nearbyGroups.fpgs, 'fpg');
            }
        });
    }
});

// Update displayResults function to include data attributes
function displayResults(groups, type) {
    const listElement = document.getElementById(`${type}List`);
    if (!listElement) return;
    
    listElement.innerHTML = '';
    
    // Show sort options when results are displayed
    const sortOptions = document.getElementById('sortOptions');
    if (sortOptions) {
        sortOptions.style.display = 'flex';
    }
    
    groups.forEach(group => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.setAttribute('data-distance', group.distance || '9999');
        resultItem.setAttribute('data-country', group.country || '');
        resultItem.setAttribute('data-population', group.population || '0');
        resultItem.setAttribute('data-language', group.language || '');
        resultItem.setAttribute('data-religion', group.religion || '');
        
        resultItem.innerHTML = `
            <h3>${group.name}</h3>
            <p><strong>Country:</strong> ${group.country}</p>
            <p><strong>Population:</strong> ${group.population.toLocaleString()}</p>
            <p><strong>Language:</strong> ${group.language}</p>
            <p><strong>Religion:</strong> ${group.religion}</p>
            <p><strong>Distance:</strong> ${group.distance ? Math.round(group.distance) + ' km' : 'N/A'}</p>
        `;
        
        listElement.appendChild(resultItem);
    });
}
