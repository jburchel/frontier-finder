// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const searchForm = document.getElementById('searchForm');

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

    // Initialize country dropdown
    initializeCountryDropdown();
});

// Add click handler for pronunciation
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('pronunciation')) {
        speakText(e.target.textContent);
    }
});
