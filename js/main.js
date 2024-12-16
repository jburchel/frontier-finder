import { getUniqueCountries, loadAllData, getUpgsForCountry, searchNearby } from './data.js';

document.addEventListener('DOMContentLoaded', async function() {
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const searchForm = document.getElementById('searchForm');
    const yearSpan = document.getElementById('year');

    try {
        // Load all data first
        await loadAllData();

        // Set current year in footer
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }

        // Populate countries dropdown
        const countries = await getUniqueCountries();
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });

        // Update UPGs when country is selected
        countrySelect.addEventListener('change', async function() {
            upgSelect.innerHTML = '<option value="">Choose a UPG...</option>';
            upgSelect.disabled = true;

            if (this.value) {
                const upgs = await getUpgsForCountry(this.value);
                upgs.forEach(upg => {
                    const option = document.createElement('option');
                    option.value = upg.id;
                    option.textContent = upg.name;
                    upgSelect.appendChild(option);
                });
                upgSelect.disabled = false;
            }
        });

        // Handle form submission
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const searchData = {
                country: countrySelect.value,
                upg: upgSelect.value,
                radius: document.getElementById('radius').value,
                units: document.getElementById('units').value,
                type: document.getElementById('type').value
            };

            const results = await searchNearby(
                searchData.country,
                searchData.upg,
                parseFloat(searchData.radius),
                searchData.units,
                searchData.type
            );

            displayResults(results);
        });
    } catch (error) {
        console.error('Error initializing form:', error);
        alert('There was an error loading the form. Please try refreshing the page.');
    }
});

function displayResults(results) {
    const fpgList = document.getElementById('fpgList');
    const uupgList = document.getElementById('uupgList');

    // Clear previous results
    if (fpgList) fpgList.innerHTML = '';
    if (uupgList) uupgList.innerHTML = '';

    // Display FPGs
    if (results.fpgs && fpgList) {
        results.fpgs.forEach(fpg => {
            const card = createResultCard(fpg);
            fpgList.appendChild(card);
        });

        // Show "No results" message if needed
        if (results.fpgs.length === 0) {
            fpgList.innerHTML = '<p>No Frontier People Groups found within the specified radius.</p>';
        }
    }

    // Display UUPGs
    if (results.uupgs && uupgList) {
        results.uupgs.forEach(uupg => {
            const card = createResultCard(uupg);
            uupgList.appendChild(card);
        });

        // Show "No results" message if needed
        if (results.uupgs.length === 0) {
            uupgList.innerHTML = '<p>No Unreached Unengaged People Groups found within the specified radius.</p>';
        }
    }
}

function createResultCard(group) {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    card.innerHTML = `
        <h3>${group.name}</h3>
        <p><strong>Country:</strong> ${group.country}</p>
        <p><strong>Population:</strong> ${group.population.toLocaleString()}</p>
        <p><strong>Distance:</strong> ${group.distance.toFixed(1)} ${document.getElementById('units').value}</p>
        ${group.language ? `<p><strong>Language:</strong> ${group.language}</p>` : ''}
        ${group.religion ? `<p><strong>Religion:</strong> ${group.religion}</p>` : ''}
    `;

    return card;
}
