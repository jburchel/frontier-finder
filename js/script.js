// Sorting functionality
function sortResults(type, sortBy) {
    const listElement = document.getElementById(`${type}List`);
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
}

// Add event listeners to sort buttons
document.addEventListener('DOMContentLoaded', function() {
    const sortButtons = document.querySelectorAll('.sort-button');
    
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            const sortBy = this.getAttribute('data-sort');
            
            // Update active button
            document.querySelectorAll(`.sort-button[data-type="${type}"]`).forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Sort results
            sortResults(type, sortBy);
        });
    });
});

// Update displayResults function to include data attributes
function displayResults(groups, type) {
    const listElement = document.getElementById(`${type}List`);
    listElement.innerHTML = '';
    
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
