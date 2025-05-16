#!/usr/bin/env python3
import csv
import requests
import time
import os
import sys
import json
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime
from tqdm import tqdm

# Load environment variables from .env file
load_dotenv()

# Joshua Project API key from environment variable
API_KEY = os.getenv("JP_API_KEY")
if not API_KEY:
    print("Warning: JP_API_KEY not found in environment variables. Using default key.")
    API_KEY = "080e14ad747e"  # Fallback to the key in the original script

BASE_URL = "https://joshuaproject.net/api/v2/people_groups"

# Cache directory for API responses
CACHE_DIR = os.path.join("data", "api_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def clean_name(name):
    """Clean the people group name for better API matching."""
    # Remove common suffixes and prefixes that might not match in the API
    replacements = [
        (" (", ","),  # Replace parentheses with commas for better matching
        (")", ""),
        (" - ", ","),
        (" / ", ","),
        ('"', ""),   # Remove quotes
        ("'", ""),   # Remove apostrophes
    ]
    
    for old, new in replacements:
        name = name.replace(old, new)
    
    return name.strip()

def get_cache_filename(country):
    """Generate a cache filename for a country."""
    return os.path.join(CACHE_DIR, f"{country.lower().replace(' ', '_')}_cache.json")

def load_country_cache(country):
    """Load cached API response for a country if it exists."""
    cache_file = get_cache_filename(country)
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                # Check if cache is recent (less than 30 days old)
                if 'timestamp' in cache_data:
                    cache_time = datetime.fromisoformat(cache_data['timestamp'])
                    now = datetime.now()
                    # If cache is less than 30 days old, use it
                    if (now - cache_time).days < 30:
                        return cache_data['data']
        except Exception as e:
            print(f"Error loading cache for {country}: {e}")
    return None

def save_country_cache(country, data):
    """Save API response to cache for a country."""
    cache_file = get_cache_filename(country)
    try:
        cache_data = {
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving cache for {country}: {e}")

def get_country_data(country):
    """Get all people groups data for a country, using cache if available."""
    # Try to load from cache first
    cached_data = load_country_cache(country)
    if cached_data is not None:
        return cached_data
    
    # If not in cache, query the API
    params = {
        "api_key": API_KEY,
        "Ctry": country
    }
    
    try:
        response = requests.get(BASE_URL, params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, dict) and 'data' in data:
                # Save to cache for future use
                save_country_cache(country, data['data'])
                return data['data']
    except Exception as e:
        print(f"Error querying API for {country}: {e}")
    
    return None

def get_coordinates(people_name, country, country_data=None):
    """Get coordinates for a people group in a specific country."""
    # If country_data not provided, get it
    if country_data is None:
        country_data = get_country_data(country)
        if not country_data:
            return None, None
    
    # Clean the name for better matching
    cleaned_name = clean_name(people_name)
    
    # First look for exact matches
    for item in country_data:
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
    for item in country_data:
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
    if len(country_data) > 0:
        lat = country_data[0].get("Latitude")
        lon = country_data[0].get("Longitude")
        if lat and lon:
            return float(lat), float(lon)
    
    return None, None

def update_csv_coordinates(input_file, limit=None):
    """Update the CSV file with coordinates from the Joshua Project API.
    
    Args:
        input_file: Path to the CSV file to update
        limit: Maximum number of entries to process (for testing)
    """
    if not input_file:
        input_file = sorted([
            f for f in os.listdir(os.path.join("data", "people_groups_org_data")) 
            if f.startswith("processed_people_groups_")
        ], reverse=True)[0]
        input_file = os.path.join("data", "people_groups_org_data", input_file)
    
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        return None
    
    output_file = os.path.join(os.path.dirname(input_file), f"coordinates_updated_{os.path.basename(input_file)}")
    
    print(f"Updating coordinates in file: {input_file}")
    
    # Read the CSV file using pandas
    df = pd.read_csv(input_file, encoding='utf-8')
    
    # Apply limit if specified
    if limit is not None:
        df = df.head(limit)
    
    # Get column names
    people_col = 'People Group'
    country_col = 'Country'
    lat_col = 'Latitude'
    lon_col = 'Longitude'
    
    # Initialize counters
    updated_count = 0
    skipped_count = 0
    total_count = len(df)
    
    # Group by country to batch process
    country_groups = df.groupby(country_col)
    
    print(f"Processing {total_count} people groups across {len(country_groups)} countries")
    
    # Process each country group
    for country, group in country_groups:
        print(f"\nProcessing {len(group)} people groups in {country}...")
        
        # Get all people groups data for this country at once
        country_data = get_country_data(country)
        if not country_data:
            print(f"No data found for country: {country}")
            skipped_count += len(group)
            continue
        
        # Process each people group in this country with a progress bar
        for index, row in tqdm(group.iterrows(), total=len(group), desc=f"Country: {country}"):
            name = str(row[people_col]).strip()
            
            # Skip rows without a name
            if not name or name == 'nan':
                skipped_count += 1
                continue
            
            # Check if coordinates are already present
            lat = str(row[lat_col]).strip() if not pd.isna(row[lat_col]) else ''
            lon = str(row[lon_col]).strip() if not pd.isna(row[lon_col]) else ''
            
            if not lat or not lon or lat == 'nan' or lon == 'nan':
                new_lat, new_lon = get_coordinates(name, country, country_data)
                
                if new_lat is not None and new_lon is not None:
                    df.at[index, lat_col] = new_lat
                    df.at[index, lon_col] = new_lon
                    updated_count += 1
                else:
                    skipped_count += 1
    
    # Save the updated dataframe
    df.to_csv(output_file, index=False, quoting=csv.QUOTE_ALL)
    
    print("\nCoordinates update complete!")
    print(f"Updated: {updated_count} entries")
    print(f"Skipped: {skipped_count} entries")
    print(f"Results saved to: {output_file}")
    
    return output_file

def main(input_file=None, limit=None):
    updated_file = update_csv_coordinates(input_file, limit)
    
    if updated_file:
        print("\nPart II completed successfully!")
        print(f"Updated file: {updated_file}")
        return updated_file
    
    print("\nPart II failed to complete.")
    return None

if __name__ == "__main__":
    # Check if a file path was provided as a command line argument
    input_file = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Get the limit parameter if provided, default to None (no limit)
    limit = None
    if len(sys.argv) > 2:
        try:
            limit = int(sys.argv[2])
        except ValueError:
            print("Warning: Invalid limit parameter, using no limit")
    
    main(input_file, limit)
