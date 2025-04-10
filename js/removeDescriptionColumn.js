import fs from 'fs/promises';

const CSV_FILE = 'data/current_upgs.csv';

/**
 * Remove the Description column from the CSV file
 */
async function removeDescriptionColumn() {
    try {
        // Read the CSV file
        console.log(`Reading CSV file: ${CSV_FILE}`);
        const csvContent = await fs.readFile(CSV_FILE, 'utf-8');
        let rows = csvContent.split('\n')
            .map(row => row.trim())
            .filter(row => row); // Remove empty rows

        // Parse the header row
        const headerRow = rows[0];
        const headers = headerRow.split(',').map(h => h.trim());
        
        // Find the index of the Description column
        const descIndex = headers.indexOf('Description');
        
        if (descIndex === -1) {
            console.log('Description column not found in the CSV file.');
            return;
        }
        
        console.log(`Found Description column at index ${descIndex}`);
        
        // Process each row to remove the Description column
        const updatedRows = rows.map(row => {
            const columns = row.split(',').map(col => col.trim());
            // Remove the Description column
            columns.splice(descIndex, 1);
            return columns.join(',');
        });
        
        // Write the updated content back to the file
        console.log('Writing updated CSV without Description column...');
        await fs.writeFile(CSV_FILE, updatedRows.join('\n'), 'utf-8');
        
        console.log('Description column has been successfully removed from the CSV file.');
    } catch (error) {
        console.error('Error removing Description column:', error);
    }
}

// Run the script
console.log('Starting process to remove Description column...');
removeDescriptionColumn().then(() => {
    console.log('Process completed.');
}).catch(error => {
    console.error('Error in process:', error);
}); 