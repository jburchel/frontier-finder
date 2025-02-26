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
        console.log('Starting UPG data update...');
        
        // Read current CSV file
        const fileContent = fs.readFileSync(this.currentUPGsPath, 'utf-8');
        const records = parse(fileContent, {
            columns: ['name', 'country', 'latitude', 'longitude', 'population', 'evangelical', 'language', 'religion', 'pronunciation'],
            skip_empty_lines: true,
            trim: true
        });

        console.log(`Processing ${records.length} records`);

        // Process each record
        const updatedRecords = [];
        for (const record of records) {
            console.log(`Processing record: ${record.name} (${record.country})`);
            
            // Only update records with missing data
            if (!record.latitude || !record.longitude || !record.population) {
                try {
                    const jpData = await this.fetchPeopleGroupData(record.name, record.country);
                    if (jpData) {
                        // Update only missing fields
                        record.latitude = record.latitude || jpData.Latitude || '';
                        record.longitude = record.longitude || jpData.Longitude || '';
                        record.population = record.population || jpData.Population || '';
                        record.evangelical = record.evangelical || jpData.PercentEvangelical || '';
                        record.language = record.language || jpData.PrimaryLanguageName || '';
                        record.religion = record.religion || jpData.PrimaryReligion || '';
                        // Preserve pronunciation column as-is
                        record.pronunciation = record.pronunciation || '';
                    }
                } catch (error) {
                    console.error(`Error updating ${record.name}: ${error.message}`);
                }
            }
            updatedRecords.push(record);
        }

        // Write updated data back to CSV
        const output = stringify(updatedRecords, { header: true });
        fs.writeFileSync(this.currentUPGsPath, output);
        console.log('UPG data update complete');
    }
}

// Run the update
const updater = new UPGDataUpdater(config);
updater.updateUPGData().catch(console.error);
