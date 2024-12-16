import { getUniqueCountries, loadAllData, getUpgsForCountry, searchNearby } from './data.js';

document.addEventListener('DOMContentLoaded', async function() {
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const searchForm = document.getElementById('searchForm');
    const yearSpan = document.getElementById('year');
    const resultsSection = document.querySelector('.results-section');
    const searchParams = document.getElementById('searchParams');
    const sortOptions = document.getElementById('sortOptions');

    if (!countrySelect || !upgSelect || !searchForm) {
        console.error('Required elements not found:', {
            countrySelect: !!countrySelect,
            upgSelect: !!upgSelect,
            searchForm: !!searchForm
        });
        throw new Error('Required form elements not found');
    }

    try {
        // Load all data first
        console.log('Loading data...');
        await loadAllData();
        console.log('Data loaded successfully');

        // Set current year in footer
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }

        // Populate countries dropdown
        console.log('Getting unique countries...');
        const countries = await getUniqueCountries();
        console.log('Countries received:', countries);
        
        if (!countries || countries.length === 0) {
            console.error('No countries found in the data');
            throw new Error('No countries found in the data');
        }
        
        countrySelect.innerHTML = '<option value="">Select a country</option>';
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
        console.log('Countries dropdown populated');

        // Update UPGs when country is selected
        countrySelect.addEventListener('change', async function() {
            console.log('Country selected:', this.value);
            upgSelect.innerHTML = '<option value="">Select a UPG</option>';
            upgSelect.disabled = true;

            if (this.value) {
                console.log('Getting UPGs for country:', this.value);
                const upgs = await getUpgsForCountry(this.value);
                console.log('UPGs received:', upgs);
                
                if (!upgs || upgs.length === 0) {
                    console.log('No UPGs found for country:', this.value);
                    upgSelect.innerHTML = '<option value="">No UPGs found for this country</option>';
                    return;
                }
                
                upgs.forEach(upg => {
                    const option = document.createElement('option');
                    option.value = upg.name;
                    option.textContent = upg.name;
                    upgSelect.appendChild(option);
                });
                upgSelect.disabled = false;
                console.log('UPGs dropdown populated');
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

            // Validate form data
            if (!searchData.country || !searchData.upg) {
                console.error('Invalid form data:', searchData);
                alert('Please select both a country and a UPG');
                return;
            }

            if (!searchData.radius || isNaN(searchData.radius) || searchData.radius <= 0) {
                console.error('Invalid radius:', searchData.radius);
                alert('Please enter a valid radius greater than 0');
                return;
            }

            // Create URL search parameters
            const searchParams = new URLSearchParams({
                country: searchData.country,
                upg: searchData.upg,
                radius: searchData.radius,
                units: searchData.units,
                type: searchData.type
            });

            // Redirect to results page
            console.log('Redirecting to results page...');
            window.location.href = `results.html?${searchParams.toString()}`;
        });

        // Handle sort buttons
        document.querySelectorAll('.sort-button').forEach(button => {
            button.addEventListener('click', function() {
                const sortBy = this.dataset.sort;
                console.log('Sorting by:', sortBy);
                sortResults(sortBy);
            });
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
        if (results.fpgs.length === 0) {
            fpgList.innerHTML = '<p>No Frontier People Groups found within the specified radius.</p>';
        } else {
            results.fpgs.forEach(fpg => {
                const card = createResultCard(fpg);
                fpgList.appendChild(card);
            });
        }
    }

    // Display UUPGs
    if (results.uupgs && uupgList) {
        if (results.uupgs.length === 0) {
            uupgList.innerHTML = '<p>No Unreached Unengaged People Groups found within the specified radius.</p>';
        } else {
            results.uupgs.forEach(uupg => {
                const card = createResultCard(uupg);
                uupgList.appendChild(card);
            });
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
        ${group.distance ? `<p><strong>Distance:</strong> ${group.distance.toFixed(1)} ${document.getElementById('units').value}</p>` : ''}
        ${group.language ? `<p><strong>Language:</strong> ${group.language}</p>` : ''}
        ${group.religion ? `<p><strong>Religion:</strong> ${group.religion}</p>` : ''}
    `;

    return card;
}

function sortResults(sortBy) {
    const fpgList = document.getElementById('fpgList');
    const uupgList = document.getElementById('uupgList');

    [fpgList, uupgList].forEach(list => {
        if (!list) return;

        const cards = Array.from(list.getElementsByClassName('result-card'));
        if (cards.length === 0) return;

        cards.sort((a, b) => {
            const aValue = getValueFromCard(a, sortBy);
            const bValue = getValueFromCard(b, sortBy);
            return aValue.localeCompare(bValue);
        });

        // Clear and re-append sorted cards
        list.innerHTML = '';
        cards.forEach(card => list.appendChild(card));
    });
}

function getValueFromCard(card, sortBy) {
    const text = card.textContent;
    switch (sortBy) {
        case 'distance':
            const distanceMatch = text.match(/Distance: ([\d.]+)/);
            return distanceMatch ? distanceMatch[1].padStart(10, '0') : '9999999999';
        case 'country':
            const countryMatch = text.match(/Country: (.+?)(?=Population|$)/);
            return countryMatch ? countryMatch[1].trim() : '';
        case 'population':
            const popMatch = text.match(/Population: ([\d,]+)/);
            return popMatch ? popMatch[1].replace(/,/g, '').padStart(12, '0') : '000000000000';
        case 'language':
            const langMatch = text.match(/Language: (.+?)(?=Religion|$)/);
            return langMatch ? langMatch[1].trim() : 'ZZZZZ';
        case 'religion':
            const relMatch = text.match(/Religion: (.+?)$/);
            return relMatch ? relMatch[1].trim() : 'ZZZZZ';
        default:
            return '';
    }
}
