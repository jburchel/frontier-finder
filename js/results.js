import { searchNearby, loadUUPGData, loadExistingUPGs } from './data.js';

// Get search parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const country = urlParams.get('country');
const upgName = urlParams.get('upg');
const radius = parseFloat(urlParams.get('radius'));
const units = urlParams.get('units') || 'kilometers';
const type = urlParams.get('type') || 'both';

// Display search parameters
document.getElementById('searchParams').innerHTML = `
    <p><strong>Country:</strong> ${country}</p>
    <p><strong>UPG:</strong> ${upgName}</p>
    <p><strong>Radius:</strong> ${radius} ${units}</p>
    <p><strong>Search Type:</strong> ${type.toUpperCase()}</p>
`;

async function displayResults() {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const uupgList = document.getElementById('uupgList');
    const fpgList = document.getElementById('fpgList');
    const sortOptions = document.getElementById('sortOptions');

    try {
        console.log('Starting to display results...');
        
        if (loadingElement) {
            loadingElement.style.display = 'block';
            console.log('Showing loading indicator');
        }
        if (errorElement) errorElement.style.display = 'none';
        if (uupgList) uupgList.innerHTML = '';
        if (fpgList) fpgList.innerHTML = '';

        // Validate input parameters
        if (!country || !upgName || !radius) {
            console.error('Missing required parameters:', { country, upgName, radius });
            throw new Error('Missing required search parameters');
        }

        console.log('Loading data...');
        // Load data first
        await Promise.all([loadUUPGData(), loadExistingUPGs()]);
        console.log('Data loaded successfully');

        console.log('Searching for nearby groups...');
        const results = await searchNearby(country, upgName, radius, units, type);
        console.log('Search results:', results);
        
        // Display FPGs
        if (results.fpgs && results.fpgs.length > 0) {
            console.log(`Found ${results.fpgs.length} FPGs`);
            const fpgHtml = results.fpgs.map(fpg => createResultItem(fpg, 'fpg')).join('');
            if (fpgList) fpgList.innerHTML = fpgHtml;
        } else {
            console.log('No FPGs found');
            if (fpgList) fpgList.innerHTML = '<p class="no-results">No FPGs found in this area</p>';
        }

        // Display UUPGs
        if (results.uupgs && results.uupgs.length > 0) {
            console.log(`Found ${results.uupgs.length} UUPGs`);
            const uupgHtml = results.uupgs.map(uupg => createResultItem(uupg, 'uupg')).join('');
            if (uupgList) uupgList.innerHTML = uupgHtml;
        } else {
            console.log('No UUPGs found');
            if (uupgList) uupgList.innerHTML = '<p class="no-results">No UUPGs found in this area</p>';
        }

        // Show sort options if we have results
        if (sortOptions) {
            const hasResults = (results.fpgs?.length > 0 || results.uupgs?.length > 0);
            console.log('Has results:', hasResults);
            sortOptions.style.display = hasResults ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Error displaying results:', error);
        if (errorElement) {
            errorElement.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            errorElement.style.display = 'block';
        }
        if (uupgList) uupgList.innerHTML = '';
        if (fpgList) fpgList.innerHTML = '';
    } finally {
        if (loadingElement) {
            loadingElement.style.display = 'none';
            console.log('Hiding loading indicator');
        }
    }
}

function createResultItem(group, type) {
    const item = document.createElement('div');
    item.className = 'result-item';
    
    // Create data-info attribute with all sortable information
    const dataInfo = {
        distance: group.distance || 0,
        country: group.country || '',
        population: group.population || 0,
        language: group.language || '',
        religion: group.religion || ''
    };
    item.dataset.info = JSON.stringify(dataInfo);

    const html = `
        <div class="checkbox-wrapper">
            <input type="checkbox" class="group-select" data-group-id="${group.id || ''}" data-group-type="${type}">
        </div>
        <div class="content-wrapper">
            <h3>${group.name}</h3>
            <div class="result-details">
                <span><strong>Country:</strong> ${group.country}</span>
                <span><strong>Distance:</strong> ${group.distance !== null ? `${group.distance.toFixed(1)} ${units}` : 'Unknown'}</span>
                <span><strong>Population:</strong> ${group.population.toLocaleString()}</span>
                <span><strong>Language:</strong> ${group.language || 'Unknown'}</span>
                <span><strong>Religion:</strong> ${group.religion || 'Unknown'}</span>
                <span><strong>JP Scale:</strong> ${group.jpScale || 'Unknown'}</span>
            </div>
        </div>
    `;
    item.innerHTML = html;
    return item.outerHTML;
}

// Initialize Firebase
import { db, collection, addDoc } from './firebase-config.js';

// Handle checkbox selection and Add to Top 100 button
document.addEventListener('DOMContentLoaded', () => {
    const addToTop100Button = document.getElementById('addToTop100');
    const errorElement = document.getElementById('error');
    
    // Enable/disable Add to Top 100 button based on selections
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('group-select')) {
            const checkedBoxes = document.querySelectorAll('.group-select:checked');
            addToTop100Button.disabled = checkedBoxes.length === 0;
        }
    });

    // Handle Add to Top 100 button click
    addToTop100Button.addEventListener('click', async () => {
        try {
            // Disable button and show loading state
            addToTop100Button.disabled = true;
            addToTop100Button.textContent = 'Adding to Top 100...';
            errorElement.style.display = 'none';

            const selectedGroups = [];
            const checkedBoxes = document.querySelectorAll('.group-select:checked');
            
            checkedBoxes.forEach(checkbox => {
                const groupItem = checkbox.closest('.result-item');
                const groupData = JSON.parse(groupItem.dataset.info);
                const groupType = checkbox.dataset.groupType;
                const groupId = checkbox.dataset.groupId;
                
                selectedGroups.push({
                    ...groupData,
                    id: groupId,
                    type: groupType,
                    name: groupItem.querySelector('h3').textContent,
                    dateAdded: new Date().toISOString()
                });
            });

            // Add selected groups to Firebase
            const top100Collection = collection(db, 'top100');
            const promises = selectedGroups.map(group => 
                addDoc(top100Collection, group)
            );
            
            await Promise.all(promises);
            console.log('Successfully added groups to Top 100');
            
            // Redirect to top100.html
            window.location.href = 'top100.html';
        } catch (error) {
            console.error('Error adding groups to Top 100:', error);
            errorElement.textContent = 'Error adding groups to Top 100. Please check your connection and try again.';
            errorElement.style.display = 'block';
            
            // Reset button state
            addToTop100Button.disabled = false;
            addToTop100Button.textContent = 'Add Selected to Top 100';
        }
    });
});

// Add sort functionality
function sortResults(sortBy, order = 'asc') {
    const lists = ['fpgList', 'uupgList'];
    
    lists.forEach(listId => {
        const list = document.getElementById(listId);
        if (!list) return;

        const items = Array.from(list.getElementsByClassName('result-item'));
        items.sort((a, b) => {
            const aValue = JSON.parse(a.dataset.info)[sortBy];
            const bValue = JSON.parse(b.dataset.info)[sortBy];
            
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return order === 'asc' ? aValue - bValue : bValue - aValue;
            }
            
            return order === 'asc' 
                ? String(aValue).localeCompare(String(bValue))
                : String(bValue).localeCompare(String(aValue));
        });

        items.forEach(item => list.appendChild(item));
    });
}

// Add event listeners for sort buttons
document.querySelectorAll('.sort-button').forEach(button => {
    button.addEventListener('click', () => {
        const sortBy = button.dataset.sort;
        sortResults(sortBy);
    });
});

// Initialize the page when the DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing results page...');
    console.log('Search parameters:', { country, upgName, radius, units, type });
    displayResults();
});
