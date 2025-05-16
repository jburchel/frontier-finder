#!/usr/bin/env python3
import csv
import requests
import time
import os
import sys

# Joshua Project API key
API_KEY = "080e14ad747e"
BASE_URL = "https://joshuaproject.net/api/v2/people_groups"

def clean_name(name):
    """Clean the people group name for better API matching."""
    # Remove common suffixes and prefixes that might not match in the API
    replacements = [
        (" (", ","),  # Replace parentheses with commas for better matching
        (")", ""),
        (" - ", ","),
        (" / ", ","),
    ]
    
    for old, new in replacements:
        name = name.replace(old, new)
    
    return name.strip()

def get_coordinates(people_name, country):
    """Query the Joshua Project API to get coordinates for a people group in a specific country."""
    params = {
        "api_key": API_KEY,
        "Ctry": country
    }
    
    # Clean the name for better matching
    cleaned_name = clean_name(people_name)
    
    try:
        # First try to get all people groups in the country
        response = requests.get(BASE_URL, params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, dict) and 'data' in data:
                items = data['data']
                
                # First look for exact matches
                for item in items:
                    api_name = item.get("PeopNameInCountry", "")
                    api_country = item.get("Ctry", "")
                    
                    # Check for exact match
                    if (api_name.lower() == people_name.lower() or 
                        api_name.lower() == cleaned_name.lower()) and api_country.lower() == country.lower():
                        lat = item.get("Latitude")
                        lon = item.get("Longitude")
                        if lat and lon:
                            return float(lat), float(lon)
                
                # If no exact match, try partial matching
                for item in items:
                    api_name = item.get("PeopNameInCountry", "")
                    api_country = item.get("Ctry", "")
                    
                    # Check if the API name contains our name or vice versa
                    name_match = (people_name.lower() in api_name.lower() or 
                                 api_name.lower() in people_name.lower() or
                                 cleaned_name.lower() in api_name.lower() or
                                 api_name.lower() in cleaned_name.lower())
                    
                    if name_match and api_country.lower() == country.lower():
                        lat = item.get("Latitude")
                        lon = item.get("Longitude")
                        if lat and lon:
                            return float(lat), float(lon)
                
                # If still no match, just return coordinates for the first people group in the country
                # This is a fallback to at least have some coordinates for the country
                if len(items) > 0:
                    lat = items[0].get("Latitude")
                    lon = items[0].get("Longitude")
                    if lat and lon:
                        print(f"  Using fallback coordinates from '{items[0].get('PeopNameInCountry')}' in {country}")
                        return float(lat), float(lon)
    except Exception as e:
        print(f"  Error querying API for {people_name} in {country}: {e}")
    
    return None, None

def update_csv_coordinates():
    """Update the CSV file with coordinates from the Joshua Project API."""
    input_file = "data/current_upgs.csv"
    output_file = "data/current_upgs_updated.csv"
    
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        sys.exit(1)
    
    rows = []
    updated_count = 0
    skipped_count = 0
    
    # Read the CSV file
    with open(input_file, 'r', newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        headers = next(reader)  # Get the headers
        rows.append(headers)
        
        for row in reader:
            if len(row) < 5:  # Ensure the row has enough columns
                rows.append(row)
                continue
                
            name = row[1].strip()
            country = row[2].strip()
            
            # Skip rows without a name or country
            if not name or not country:
                rows.append(row)
                skipped_count += 1
                continue
                
            # Check if coordinates are already present
            lat = row[3].strip()
            lon = row[4].strip()
            
            if not lat or not lon:
                print(f"Looking up coordinates for {name} in {country}...")
                new_lat, new_lon = get_coordinates(name, country)
                
                if new_lat and new_lon:
                    row[3] = str(new_lat)
                    row[4] = str(new_lon)
                    updated_count += 1
                    print(f"  Found coordinates: {new_lat}, {new_lon}")
                else:
                    print(f"  No coordinates found for {name} in {country}")
                    skipped_count += 1
                
                # Add a small delay to avoid hitting API rate limits
                time.sleep(0.5)
            
            rows.append(row)
    
    # Write the updated data to a new CSV file
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerows(rows)
    
    print(f"\nCoordinates update complete!")
    print(f"Updated: {updated_count} entries")
    print(f"Skipped: {skipped_count} entries")
    print(f"Results saved to: {output_file}")
    
    # If everything went well, replace the original file
    if updated_count > 0:
        response = input("Do you want to replace the original file with the updated one? (y/n): ")
        if response.lower() == 'y':
            import shutil
            shutil.move(output_file, input_file)
            print(f"Original file replaced with updated data.")

if __name__ == "__main__":
    update_csv_coordinates() 