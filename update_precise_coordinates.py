import csv
import os

# Dictionary of people group coordinates based on their primary regions
PEOPLE_GROUP_COORDS = {
    'Arab Algerian': (36.7538, 3.0588),      # Algiers region
    'Amazigh': (31.5084, -5.2681),           # Atlas Mountains region, Morocco
    'Arab Bedoin': (31.7261, 36.0322),       # Eastern Desert region, Jordan
    'Azerbaijani': {
        'Russia': (43.2551, 46.8737),        # Dagestan region
        'Azerbaijan': (40.4093, 47.5769),     # Central Azerbaijan
        'Georgia': (41.6168, 45.0154)         # Southeastern Georgia
    },
    'Budug': (41.1853, 48.3662),             # Quba region, Azerbaijan
    'Budukh': (41.1853, 48.3662),            # Quba region, Azerbaijan
    'Cumbalacu': (-3.9706, 122.5947),        # Southeast Sulawesi, Indonesia
    "Da'a Tribe": (-1.4547, 120.1807),       # Central Sulawesi, Indonesia
    'Dargin': (42.1462, 47.1315),            # Dagestan mountains, Azerbaijan
    'Hartani': (18.0735, -15.9582),          # Southern Mauritania
    'Iranians': (35.6892, 51.3890),          # Tehran region
    'Lezgin': {
        'Azerbaijan': (41.4776, 48.4653),     # Northeastern Azerbaijan
        'Russia': (41.4776, 48.4653)          # Same region, crosses border
    },
    'Moors': (18.0735, -15.9582),            # Mauritania (primarily in Nouakchott)
    'Muna': (-5.2734, 122.8984),             # Muna Island, Indonesia
    'Berbers': (31.7917, -7.0926),           # Atlas Mountains region, Morocco
    'Bedouin': (20.7927, -12.6090)           # Mauritanian desert regions
}

def get_coordinates(people_group: str, country: str) -> tuple:
    """Get coordinates for a specific people group and country."""
    if people_group in PEOPLE_GROUP_COORDS:
        coords = PEOPLE_GROUP_COORDS[people_group]
        if isinstance(coords, dict):
            # Handle cases where a people group has different coordinates per country
            return coords.get(country, (None, None))
        return coords
    return (None, None)

def update_coordinates(input_file: str) -> None:
    """Update the CSV file with precise coordinates for entries missing them."""
    temp_file = input_file + '.temp'
    updated_count = 0
    
    try:
        # Read all data first
        with open(input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            rows = list(reader)
            fieldnames = reader.fieldnames
        
        # Process and write data
        with open(temp_file, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for row in rows:
                # Check if coordinates are missing
                if (not row.get('latitude') or not row.get('longitude')) and row.get('name'):
                    lat, lon = get_coordinates(row['name'], row.get('country', ''))
                    if lat is not None and lon is not None:
                        row['latitude'] = lat
                        row['longitude'] = lon
                        updated_count += 1
                        print(f"Updated coordinates for {row['name']} ({row.get('country', 'Unknown')})")
                
                writer.writerow(row)
        
        # Replace original file with updated file
        os.replace(temp_file, input_file)
        print(f"\nSuccessfully updated {input_file}")
        print(f"Added coordinates for {updated_count} entries")
        
    except Exception as e:
        print(f"Error processing {input_file}: {str(e)}")
        # Clean up temp file if it exists
        if os.path.exists(temp_file):
            os.remove(temp_file)

if __name__ == "__main__":
    # Process the file
    file_to_process = 'data/existing_upgs_updated.csv'
    print(f"\nUpdating coordinates in {file_to_process}...")
    update_coordinates(file_to_process)
