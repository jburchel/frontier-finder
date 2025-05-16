import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { pronunciationService } from './services/pronunciationService.js';
import { pronunciationMap } from './data/pronunciations.js';
import { pronunciationData } from './data/peopleGroupPronunciations.js';
import path from 'path';

async function updateCurrentUPGPronunciations() {
    const csvPath = path.join(process.cwd(), 'data', 'current_upgs.csv');
    console.log('Reading current UPGs from:', csvPath);

    try {
        // Read the CSV file
        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        const records = parse(fileContent, { columns: true });
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Process each record
        const updatedRecords = records.map(record => {
            try {
                // Skip if already has pronunciation
                if (record.pronunciation) {
                    console.log(`Skipping ${record.name}: Already has pronunciation ${record.pronunciation}`);
                    skippedCount++;
                    return record;
                }

                // Try to find pronunciation in our mappings first
                let pronunciation = pronunciationMap[record.name];
                if (pronunciation) {
                    console.log(`Found mapped pronunciation for ${record.name}: ${pronunciation}`);
                }
                
                // Check peopleGroupPronunciations.js data
                if (!pronunciation && pronunciationData.peoples[record.name?.toLowerCase()]) {
                    pronunciation = pronunciationData.peoples[record.name.toLowerCase()].pronunciation;
                    console.log(`Found detailed pronunciation for ${record.name}: ${pronunciation}`);
                }

                // If still no pronunciation, generate one
                if (!pronunciation) {
                    pronunciation = pronunciationService.generatePronunciation(record.name);
                    if (pronunciation) {
                        console.log(`Generated pronunciation for ${record.name}: ${pronunciation}`);
                    }
                }

                if (pronunciation) {
                    updatedCount++;
                    return { ...record, pronunciation };
                }

                console.log(`Could not generate pronunciation for ${record.name}`);
                errorCount++;
                return record;
            } catch (err) {
                console.error(`Error processing record ${record.name}:`, err);
                errorCount++;
                return record;
            }
        });

        // Write back to CSV
        const output = stringify(updatedRecords, { header: true });
        fs.writeFileSync(csvPath, output);

        console.log(`
Update complete:
- ${updatedCount} pronunciations updated
- ${skippedCount} records skipped
- ${errorCount} records had errors
- ${records.length} total records processed
        `);

    } catch (error) {
        console.error('Failed to update pronunciations:', error);
        process.exit(1);
    }
}

// Run the update
updateCurrentUPGPronunciations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});