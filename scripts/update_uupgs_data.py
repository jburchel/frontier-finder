#!/usr/bin/env python3
import os
import sys
import pandas as pd
import csv
from datetime import datetime

def update_uupgs_data(input_file, limit=None):
    """
    Update the uupgs.csv file with the latest data from the processed file.
    
    Args:
        input_file: Path to the processed file with the latest data
        limit: Maximum number of entries to process (for testing)
    """
    if not input_file:
        # Find the most recent pronunciation updated file
        try:
            input_file = sorted([
                f for f in os.listdir(os.path.join("data", "people_groups_org_data")) 
                if f.startswith("pronunciation_updated_")
            ], reverse=True)[0]
            input_file = os.path.join("data", "people_groups_org_data", input_file)
        except (IndexError, FileNotFoundError):
            print("Error: Could not find a pronunciation updated file.")
            return False
    
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        return False
    
    uupgs_file = os.path.join("data", "uupgs.csv")
    backup_file = os.path.join("data", f"uupgs_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
    
    print(f"Updating UUPG data from: {input_file}")
    print(f"Target file: {uupgs_file}")
    
    # First, create a backup of the existing uupgs.csv file
    if os.path.exists(uupgs_file):
        try:
            # Read the existing file to preserve its structure
            # Use the csv module for more robust parsing
            print("Reading existing uupgs.csv file...")
            with open(uupgs_file, 'r', encoding='utf-8') as f:
                # Read the header to get column names
                header = f.readline().strip().split(',')
                print(f"Found {len(header)} columns in header")
                
            # Read with pandas, specifying the number of columns and using a more robust parser
            uupgs_df = pd.read_csv(uupgs_file, encoding='utf-8', engine='python', on_bad_lines='skip')
            print(f"Successfully read {len(uupgs_df)} rows from uupgs.csv")
            
            # Create a backup
            uupgs_df.to_csv(backup_file, index=False, quoting=csv.QUOTE_ALL)
            print(f"Successfully created backup at {backup_file}")
            print(f"Created backup of uupgs.csv at: {backup_file}")
        except Exception as e:
            print(f"Error creating backup: {e}")
            return False
    else:
        print("Warning: uupgs.csv does not exist. A new file will be created.")
        uupgs_df = None
    
    # Read the new data
    try:
        new_data_df = pd.read_csv(input_file, encoding='utf-8')
        
        # Apply limit if specified
        if limit is not None:
            print(f"Limiting to {limit} entries for testing")
            new_data_df = new_data_df.head(limit)
        
        # Map column names from the new data to match uupgs.csv
        column_mapping = {
            'People Group': 'PeopleName',
            'Country': 'Country',
            'Population': 'Population',
            'Language': 'Language',
            'Religion': 'Religion',
            'Global Status of Evangelical Christianity': 'Global Status of  Evangelical Christianity',
            'Evangelical Engagement': 'Evangelical Engagement',
            'pronunciation': 'pronunciation',
            'Latitude': 'Latitude',
            'Longitude': 'Longitude'
        }
        
        # Rename columns in the new data
        for old_name, new_name in column_mapping.items():
            if old_name in new_data_df.columns:
                new_data_df = new_data_df.rename(columns={old_name: new_name})
        
        # If uupgs.csv exists, merge the data
        if uupgs_df is not None:
            # Create a dictionary to store updated rows
            updated_rows = {}
            new_rows = []
            
            # Get all columns from the existing uupgs.csv
            all_columns = uupgs_df.columns.tolist()
            
            # Prepare the new data with all necessary columns
            for col in all_columns:
                if col not in new_data_df.columns:
                    new_data_df[col] = ''
            
            # Process each row in the new data
            for _, new_row in new_data_df.iterrows():
                people_name = new_row['PeopleName']
                country = new_row['Country']
                
                # Look for a matching row in the existing data
                match = uupgs_df[(uupgs_df['PeopleName'] == people_name) & 
                                 (uupgs_df['Country'] == country)]
                
                if not match.empty:
                    # Update the existing row
                    row_index = match.index[0]
                    updated_row = uupgs_df.loc[row_index].copy()
                    
                    # Update only the columns that exist in the new data
                    for col in new_data_df.columns:
                        if col in all_columns and not pd.isna(new_row[col]) and new_row[col] != '':
                            updated_row[col] = new_row[col]
                    
                    updated_rows[row_index] = updated_row
                else:
                    # This is a new row, add it to the list
                    print(f"Adding new people group: {people_name} in {country}")
                    new_rows.append(new_row)
            
            # Update the existing rows
            for idx, row in updated_rows.items():
                uupgs_df.loc[idx] = row
            
            # Add new rows
            if new_rows:
                new_rows_df = pd.DataFrame(new_rows)
                uupgs_df = pd.concat([uupgs_df, new_rows_df], ignore_index=True)
            
            print(f"Updated {len(updated_rows)} existing entries")
            print(f"Added {len(new_rows)} new entries")
        else:
            # Create a new uupgs.csv file with the new data
            uupgs_df = new_data_df
            print(f"Created new uupgs.csv file with {len(uupgs_df)} entries")
        
        # Save the updated data
        uupgs_df.to_csv(uupgs_file, index=False, quoting=csv.QUOTE_ALL)
        print(f"Updated uupgs.csv saved successfully")
        
        return True
    
    except Exception as e:
        print(f"Error updating uupgs.csv: {e}")
        return False

def main(input_file=None, limit=None):
    success = update_uupgs_data(input_file, limit)
    
    if success:
        print("\nPart IV completed successfully!")
        print(f"UUPG data has been updated in: {os.path.join('data', 'uupgs.csv')}")
    else:
        print("\nPart IV failed to complete.")

if __name__ == "__main__":
    # Check if a file path was provided as a command line argument
    input_file = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Get the limit parameter if provided
    limit = None
    if len(sys.argv) > 2:
        try:
            limit = int(sys.argv[2])
        except ValueError:
            print("Warning: Invalid limit parameter, using no limit")
    
    main(input_file, limit)
