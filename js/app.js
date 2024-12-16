import { getUniqueCountries, loadAllData, populateCountryDropdown } from './data.js';

// Initialize the form when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load all data first
        await loadAllData();
        
        // Get the form elements
        const countrySelect = document.getElementById('country');
        const upgSelect = document.getElementById('upg');
        const searchForm = document.getElementById('searchForm');
        
        // Populate the country dropdown
        await populateCountryDropdown(countrySelect);
        
        // Add event listener for country selection
        countrySelect.addEventListener('change', async (e) => {
            const selectedCountry = e.target.value;
            upgSelect.disabled = !selectedCountry;
            
            if (selectedCountry) {
                // Clear current UPG options
                upgSelect.innerHTML = '<option value="">Select a UPG</option>';
                
                // Get UPGs for selected country and populate dropdown
                const upgs = await getUpgsForCountry(selectedCountry);
                upgs.forEach(upg => {
                    const option = document.createElement('option');
                    option.value = upg.id;
                    option.textContent = upg.name;
                    upgSelect.appendChild(option);
                });
            }
        });
        
        // Add form submit handler
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(searchForm);
            const searchParams = new URLSearchParams();
            
            for (const [key, value] of formData.entries()) {
                searchParams.append(key, value);
            }
            
            // Redirect to results page with search parameters
            window.location.href = `results.html?${searchParams.toString()}`;
        });
        
    } catch (error) {
        console.error('Error initializing form:', error);
        alert('There was an error loading the form. Please try refreshing the page.');
    }
});
