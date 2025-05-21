// Script to count UUPGs in the data file

async function countUUPGs() {
    try {
        console.log('Loading UUPG data file...');
        
        // Load the UUPG data file
        const response = await fetch('data/uupgs.csv');
        if (!response.ok) {
            throw new Error(`Failed to load UUPG data: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        const rows = text.split('\n');
        
        if (rows.length < 2) {
            throw new Error('UUPG data file is empty or malformed');
        }
        
        console.log(`Total rows in UUPG data file: ${rows.length}`);
        
        // Count UUPGs with valid data
        let validUUPGs = 0;
        let withCoordinates = 0;
        let withPopulation = 0;
        
        // Skip header row
        for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;
            
            const values = rows[i].split(',');
            if (values.length < 3) continue;
            
            validUUPGs++;
            
            // Check if it has coordinates
            const lat = parseFloat(values[3]); // Assuming Latitude is in column 4
            const lng = parseFloat(values[4]); // Assuming Longitude is in column 5
            
            if (!isNaN(lat) && !isNaN(lng)) {
                withCoordinates++;
            }
            
            // Check if it has population
            const population = parseInt(values[2]); // Assuming Population is in column 3
            if (!isNaN(population) && population > 0) {
                withPopulation++;
            }
        }
        
        console.log('UUPG Count Results:');
        console.log(`Total valid UUPGs: ${validUUPGs}`);
        console.log(`UUPGs with valid coordinates: ${withCoordinates}`);
        console.log(`UUPGs with population data: ${withPopulation}`);
        
        return {
            total: validUUPGs,
            withCoordinates,
            withPopulation
        };
    } catch (error) {
        console.error('Error counting UUPGs:', error);
        throw error;
    }
}

// Execute the count function
countUUPGs().then(results => {
    document.getElementById('uupgCount').textContent = results.total;
    document.getElementById('uupgWithCoordinates').textContent = results.withCoordinates;
    document.getElementById('uupgWithPopulation').textContent = results.withPopulation;
}).catch(error => {
    console.error('Failed to count UUPGs:', error);
});
