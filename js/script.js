// Sorting functionality
function sortResults(sortBy) {
    const sortLists = ['uupgList', 'fpgList'];
    
    sortLists.forEach(listId => {
        const listElement = document.getElementById(listId);
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

    // Collect all unique countries from both UPGs and FPGs
    upgsData.forEach(group => {
        if (group.country) {
            countries.add(group.country);
        }
    });

    fpgsData.forEach(group => {
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
});

// Update displayResults function to include data attributes
function displayResults(groups, type) {
    const listElement = document.getElementById(`${type}List`);
    listElement.innerHTML = '';
    
    // Show sort options when results are displayed
    document.getElementById('sortOptions').style.display = 'flex';
    
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
