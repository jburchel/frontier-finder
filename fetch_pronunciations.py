import csv
import requests
import time
import os
from typing import Optional, Dict, List

class JoshuaProjectAPI:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.joshuaproject.net/v1"
        self.cache: Dict[str, Optional[str]] = {}
        
    def get_people_group_data(self, people_name: str) -> Optional[str]:
        """
        Query the Joshua Project API for a people group and return their pronunciation.
        Returns None if no pronunciation is found or if the API request fails.
        """
        # Check cache first
        if people_name in self.cache:
            return self.cache[people_name]
            
        try:
            # Remove quotes from people name
            clean_name = people_name.replace('"', '')
            
            # Make API request
            params = {
                'api_key': self.api_key,
                'people_name': clean_name
            }
            response = requests.get(f"{self.base_url}/peoples", params=params)
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    # Get pronunciation from the first matching result
                    pronunciation = data[0].get('Pronunciation', '')
                    self.cache[people_name] = pronunciation
                    return pronunciation
                    
            # If we get here, no pronunciation was found
            self.cache[people_name] = None
            return None
            
        except Exception as e:
            print(f"Error fetching data for {people_name}: {str(e)}")
            return None

def process_csv_file(input_file: str, jp_api: JoshuaProjectAPI, name_column: str) -> None:
    """Process a CSV file and update pronunciations."""
    temp_file = input_file + '.temp'
    
    try:
        # First, read all the data and get the correct fieldnames
        with open(input_file, 'r', encoding='utf-8') as infile:
            # Read the header line
            header = next(csv.reader(infile))
            
            # Create a list to store all rows
            rows = []
            for row in csv.reader(infile):
                # Ensure row has enough columns
                while len(row) < len(header):
                    row.append('')
                rows.append(row)
        
        # Now process the data and write to temp file
        with open(temp_file, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.writer(outfile)
            writer.writerow(header)
            
            total_rows = len(rows)
            processed = 0
            
            # Find the indices for the name and pronunciation columns
            name_idx = header.index(name_column)
            pron_idx = header.index('pronunciation')
            
            for row in rows:
                if row and len(row) > name_idx:
                    people_name = row[name_idx]
                    if people_name:
                        pronunciation = jp_api.get_people_group_data(people_name)
                        # Ensure row has enough columns
                        while len(row) <= pron_idx:
                            row.append('')
                        row[pron_idx] = pronunciation if pronunciation else ''
                
                writer.writerow(row)
                
                processed += 1
                if processed % 10 == 0:  # Show progress every 10 rows
                    print(f"Processed {processed}/{total_rows} rows")
                
                # Add a small delay to avoid hitting API rate limits
                time.sleep(0.5)
        
        # Replace original file with updated file
        os.replace(temp_file, input_file)
        print(f"Successfully updated {input_file}")
        
    except Exception as e:
        print(f"Error processing {input_file}: {str(e)}")
        # Clean up temp file if it exists
        if os.path.exists(temp_file):
            os.remove(temp_file)

def main():
    # Replace with your Joshua Project API key
    API_KEY = "080e14ad747e"
    jp_api = JoshuaProjectAPI(API_KEY)
    
    # Process both files
    files_to_process = [
        {
            'file': 'data/existing_upgs_updated.csv',
            'name_column': 'name'
        },
        {
            'file': 'data/updated_uupg.csv',
            'name_column': 'PeopleName'
        }
    ]
    
    for file_info in files_to_process:
        print(f"\nProcessing {file_info['file']}...")
        process_csv_file(file_info['file'], jp_api, file_info['name_column'])

if __name__ == "__main__":
    main()
