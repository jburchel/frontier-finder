document.addEventListener('DOMContentLoaded', function() {
    const countrySelect = document.getElementById('country');
    const upgSelect = document.getElementById('upg');
    const searchForm = document.getElementById('searchForm');
    const resultsDiv = document.getElementById('results');
    const fpgTable = document.getElementById('fpgTable');
    const uupgTable = document.getElementById('uupgTable');

    // Load countries on page load
    fetch('/api/countries')
        .then(response => response.json())
        .then(countries => {
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error loading countries:', error));

    // Load UPGs when country is selected
    countrySelect.addEventListener('change', function() {
        upgSelect.innerHTML = '<option value="">Choose a UPG...</option>';
        upgSelect.disabled = true;

        if (this.value) {
            fetch(`/api/upgs/${encodeURIComponent(this.value)}`)
                .then(response => response.json())
                .then(upgs => {
                    upgs.forEach(upg => {
                        const option = document.createElement('option');
                        option.value = upg;
                        option.textContent = upg;
                        upgSelect.appendChild(option);
                    });
                    upgSelect.disabled = false;
                })
                .catch(error => console.error('Error loading UPGs:', error));
        }
    });

    // Handle form submission
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const searchData = {
            country: countrySelect.value,
            upg: upgSelect.value,
            radius: document.getElementById('radius').value,
            units: document.getElementById('units').value,
            type: document.querySelector('input[name="searchType"]:checked').value
        };

        fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchData)
        })
        .then(response => response.json())
        .then(data => {
            // Clear previous results
            fpgTable.innerHTML = '';
            uupgTable.innerHTML = '';

            // Display FPG results
            data.fpgs.forEach(fpg => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${fpg.name}</td>
                    <td>${fpg.country}</td>
                    <td>${fpg.population.toLocaleString()}</td>
                    <td>${fpg.distance} ${searchData.units}</td>
                `;
                fpgTable.appendChild(row);
            });

            // Display UUPG results
            data.uupgs.forEach(uupg => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${uupg.name}</td>
                    <td>${uupg.country}</td>
                    <td>${uupg.population.toLocaleString()}</td>
                    <td>${uupg.distance} ${searchData.units}</td>
                `;
                uupgTable.appendChild(row);
            });

            // Show results section
            resultsDiv.style.display = 'block';
        })
        .catch(error => console.error('Error searching:', error));
    });
});
