#!/usr/bin/env python3
import os
import sys
import pandas as pd
import csv
import re

def generate_pronunciation(name):
    """
    Generate a phonetic pronunciation for a people group name.
    This is a simple rule-based approach that can be improved over time.
    """
    if not name or pd.isna(name):
        return ""
    
    # Convert to lowercase for processing
    name = str(name).strip()
    
    # Remove any quotes or special characters for processing
    clean_name = re.sub(r'["\'\"]', '', name)
    
    # Simple pronunciation rules
    pronunciation = clean_name.lower()
    
    # Handle common digraphs and difficult sounds
    replacements = [
        # Consonant sounds
        ('ch', 'ch-'),
        ('sh', 'sh-'),
        ('th', 'th-'),
        ('ph', 'f-'),
        ('gh', 'g-'),
        ('kh', 'k-h'),
        ('zh', 'z-h'),
        ('ng', 'ng-'),
        ('dj', 'd-j'),
        ('tz', 't-z'),
        
        # Vowel combinations
        ('aa', 'a-a'),
        ('ae', 'a-e'),
        ('ai', 'ai-'),
        ('au', 'au-'),
        ('ay', 'ay-'),
        ('ea', 'e-a'),
        ('ee', 'ee-'),
        ('ei', 'ei-'),
        ('eo', 'e-o'),
        ('eu', 'e-u'),
        ('ey', 'ey-'),
        ('ie', 'i-e'),
        ('oa', 'o-a'),
        ('oe', 'o-e'),
        ('oi', 'oi-'),
        ('oo', 'oo-'),
        ('ou', 'ou-'),
        ('oy', 'oy-'),
        ('ua', 'u-a'),
        ('ue', 'u-e'),
        ('ui', 'u-i'),
        ('uo', 'u-o'),
        ('uy', 'u-y'),
        
        # Add hyphens between syllables based on consonant clusters
        ('bb', 'b-b'),
        ('cc', 'c-c'),
        ('dd', 'd-d'),
        ('ff', 'f-f'),
        ('gg', 'g-g'),
        ('hh', 'h-h'),
        ('jj', 'j-j'),
        ('kk', 'k-k'),
        ('ll', 'l-l'),
        ('mm', 'm-m'),
        ('nn', 'n-n'),
        ('pp', 'p-p'),
        ('qq', 'q-q'),
        ('rr', 'r-r'),
        ('ss', 's-s'),
        ('tt', 't-t'),
        ('vv', 'v-v'),
        ('ww', 'w-w'),
        ('xx', 'x-x'),
        ('yy', 'y-y'),
        ('zz', 'z-z'),
    ]
    
    for old, new in replacements:
        pronunciation = pronunciation.replace(old, new)
    
    # Add hyphens between consonant clusters (except for the digraphs we've already handled)
    consonant_clusters = re.finditer(r'([bcdfghjklmnpqrstvwxyz]{3,})', pronunciation)
    for match in consonant_clusters:
        cluster = match.group(1)
        if len(cluster) >= 3:
            # Insert a hyphen after the first consonant in the cluster
            replacement = cluster[0] + '-' + cluster[1:]
            pronunciation = pronunciation.replace(cluster, replacement, 1)
    
    # Clean up any double hyphens
    pronunciation = pronunciation.replace('--', '-')
    
    # Remove any hyphens at the beginning or end
    pronunciation = pronunciation.strip('-')
    
    # Replace hyphens with spaces for readability
    pronunciation = pronunciation.replace('-', ' ')
    
    # Look at the uupgs.csv file to see if we have an existing pronunciation
    # for this people group and use that instead if available
    try:
        uupgs_file = os.path.join("data", "uupgs.csv")
        if os.path.exists(uupgs_file):
            uupgs_df = pd.read_csv(uupgs_file, encoding='utf-8')
            if 'PeopleName' in uupgs_df.columns and 'pronunciation' in uupgs_df.columns:
                match = uupgs_df[uupgs_df['PeopleName'].str.lower() == clean_name.lower()]
                if not match.empty and not pd.isna(match.iloc[0]['pronunciation']):
                    existing_pronunciation = match.iloc[0]['pronunciation']
                    if existing_pronunciation and not pd.isna(existing_pronunciation):
                        return existing_pronunciation
    except Exception as e:
        print(f"Error checking existing pronunciations: {e}")
    
    return pronunciation

def update_pronunciations(input_file, limit=10):
    """
    Update the CSV file with pronunciations for each people group.
    
    Args:
        input_file: Path to the CSV file to update
        limit: Maximum number of entries to process (for testing)
    """
    if not input_file:
        # Find the most recent coordinates updated file
        try:
            input_file = sorted([
                f for f in os.listdir(os.path.join("data", "people_groups_org_data")) 
                if f.startswith("coordinates_updated_")
            ], reverse=True)[0]
            input_file = os.path.join("data", "people_groups_org_data", input_file)
        except (IndexError, FileNotFoundError):
            print("Error: Could not find a coordinates updated file.")
            return None
    
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        return None
    
    output_file = os.path.join(os.path.dirname(input_file), f"pronunciation_updated_{os.path.basename(input_file)}")
    
    print(f"Updating pronunciations in file: {input_file}")
    
    # Read the CSV file using pandas
    df = pd.read_csv(input_file, encoding='utf-8')
    
    # Get column names
    people_col = 'People Group'
    pronunciation_col = 'pronunciation'
    
    # Initialize counters
    updated_count = 0
    skipped_count = 0
    total_count = len(df)
    
    # Process each row (limited for testing)
    for index, row in df.iterrows():
        # Stop after processing the limit number of entries
        if index >= limit:
            print(f"Reached limit of {limit} entries for testing")
            break
            
        name = str(row[people_col]).strip() if not pd.isna(row[people_col]) else ''
        
        # Skip rows without a name
        if not name or name == 'nan':
            skipped_count += 1
            continue
        
        # Check if pronunciation is already present
        current_pronunciation = str(row[pronunciation_col]).strip() if not pd.isna(row[pronunciation_col]) else ''
        
        if not current_pronunciation or current_pronunciation == 'nan':
            print(f"[{index+1}/{total_count}] Generating pronunciation for {name}...")
            new_pronunciation = generate_pronunciation(name)
            
            if new_pronunciation:
                df.at[index, pronunciation_col] = new_pronunciation
                updated_count += 1
                print(f"  Generated pronunciation: {new_pronunciation}")
            else:
                print(f"  Could not generate pronunciation for {name}")
                skipped_count += 1
        else:
            # Skip if pronunciation is already present
            print(f"[{index+1}/{total_count}] Skipping {name} - pronunciation already present")
    
    # Save the updated dataframe
    df.to_csv(output_file, index=False, quoting=csv.QUOTE_ALL)
    
    print(f"\nPronunciation update complete!")
    print(f"Updated: {updated_count} entries")
    print(f"Skipped: {skipped_count} entries")
    print(f"Results saved to: {output_file}")
    
    return output_file

def main(input_file=None, limit=10):
    updated_file = update_pronunciations(input_file, limit)
    
    if updated_file:
        print("\nPart III completed successfully!")
        print(f"Updated file: {updated_file}")
        return updated_file
    
    print("\nPart III failed to complete.")
    return None

if __name__ == "__main__":
    # Check if a file path was provided as a command line argument
    input_file = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Get the limit parameter if provided, default to 10
    limit = 10
    if len(sys.argv) > 2:
        try:
            limit = int(sys.argv[2])
        except ValueError:
            print("Warning: Invalid limit parameter, using default of 10")
    
    main(input_file, limit)
