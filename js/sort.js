// Track sort state for each column
const sortState = {
    distance: { ascending: true, active: false },
    country: { ascending: true, active: false },
    population: { ascending: true, active: false },
    language: { ascending: true, active: false },
    religion: { ascending: true, active: false }
};

// Sort function for different data types
function compareValues(a, b, key, ascending) {
    let comparison = 0;
    
    // Handle numeric values
    if (key === 'distance' || key === 'population') {
        comparison = parseFloat(a[key]) - parseFloat(b[key]);
    }
    // Handle string values
    else {
        const valueA = (a[key] || '').toLowerCase();
        const valueB = (b[key] || '').toLowerCase();
        if (valueA < valueB) comparison = -1;
        if (valueA > valueB) comparison = 1;
    }

    return ascending ? comparison : -comparison;
}

// Sort both UUPG and FPG lists
function sortResults(key) {
    // Toggle sort direction if the same key is clicked
    if (sortState[key].active) {
        sortState[key].ascending = !sortState[key].ascending;
    } else {
        // Reset all states
        Object.keys(sortState).forEach(k => {
            sortState[k].active = false;
        });
        sortState[key].active = true;
    }

    const ascending = sortState[key].ascending;

    // Update button states
    document.querySelectorAll('.sort-button').forEach(button => {
        button.classList.remove('active', 'ascending', 'descending');
        if (button.dataset.sort === key) {
            button.classList.add('active');
            button.classList.add(ascending ? 'ascending' : 'descending');
        }
    });

    // Sort UUPG list
    const uupgList = document.getElementById('uupgList');
    const uupgItems = Array.from(uupgList.children);
    uupgItems.sort((a, b) => {
        const aData = JSON.parse(a.dataset.info);
        const bData = JSON.parse(b.dataset.info);
        return compareValues(aData, bData, key, ascending);
    });
    uupgItems.forEach(item => uupgList.appendChild(item));

    // Sort FPG list
    const fpgList = document.getElementById('fpgList');
    const fpgItems = Array.from(fpgList.children);
    fpgItems.sort((a, b) => {
        const aData = JSON.parse(a.dataset.info);
        const bData = JSON.parse(b.dataset.info);
        return compareValues(aData, bData, key, ascending);
    });
    fpgItems.forEach(item => fpgList.appendChild(item));
}

// Initialize sort buttons
document.addEventListener('DOMContentLoaded', () => {
    const sortButtons = document.querySelectorAll('.sort-button');
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sortKey = button.dataset.sort;
            sortResults(sortKey);
        });
    });
});
