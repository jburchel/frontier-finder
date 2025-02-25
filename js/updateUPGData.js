import { config } from './config.js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fetch from 'node-fetch';

class UPGDataUpdater {
    constructor(config) {
        this.apiKey = config.joshuaProject.apiKey;
        this.apiUrl = config.joshuaProject.apiUrl;
        this.currentUPGsPath = config.dataFiles.currentUPGs;
    }

    async fetchPeopleGroupData(name, country) {
        const queryParams = new URLSearchParams({
            api_key: this.apiKey,
            fields: 'PeopNameInCountry,Latitude,Longitude,Population,PercentEvangelical,PrimaryLanguageName,PrimaryReligion',
            filter: `PeopNameInCountry=${encodeURIComponent(name)} AND Ctry=${encodeURIComponent(country)}`
        });

        const url = `${this.apiUrl}/v1/people_groups.json?${queryParams}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data[0]; // Return the first match
    }

    async updateUPGData() {
        // Read current CSV file
        const fileContent = fs.readFileSync(this.currentUPGsPath, 'utf-8');
        const records = parse(fileContent, { columns: true });

        // Process each record
        const updatedRecords = await Promise.all(records.map(async (record) => {
            // Skip if record is already complete
            if (record.latitude && record.longitude && record.population) {
                return record;
            }

            try {
                const jpData = await this.fetchPeopleGroupData(record.name, record.country);
                if (jpData) {
                    return {
                        name: record.name,
                        country: record.country,
                        pronunciation: record.pronunciation || '',
                        latitude: jpData.Latitude || '',
                        longitude: jpData.Longitude || '',
                        population: jpData.Population || '',
                        evangelical: jpData.PercentEvangelical || '',
                        language: jpData.PrimaryLanguageName || '',
                        religion: jpData.PrimaryReligion || '',
                        description: record.description || ''
                    };
                }
            } catch (error) {
                console.error(`Error updating ${record.name}: ${error.message}`);
            }
            return record;
        }));

        // Write updated data back to CSV
        const output = stringify(updatedRecords, { header: true });
        fs.writeFileSync(this.currentUPGsPath, output);
        console.log('UPG data update complete');
    }
}

// Run the update
const updater = new UPGDataUpdater(config);
updater.updateUPGData().catch(console.error);