#!/usr/bin/env python3
import os
import requests
import pandas as pd
import csv
from bs4 import BeautifulSoup
from datetime import datetime

def scrape_people_groups_data():
    """
    Scrape the peoplegroups.org website for the latest People Groups Data file,
    download it, and save it to the data/people_groups_org_data folder.
    """
    print("Scraping peoplegroups.org for the latest data file...")
    
    # Create the directory if it doesn't exist
    output_dir = os.path.join("data", "people_groups_org_data")
    os.makedirs(output_dir, exist_ok=True)
    
    # URL of the peoplegroups.org downloads page
    url = "https://peoplegroups.org/258.aspx"
    
    try:
        # Send a GET request to the website
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Parse the HTML content
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for the specific 'People Groups (Data Only)' file
        data_file_link = None
        for link in soup.find_all('a', href=True):
            if 'People Groups (Data Only)' in link.text:
                data_file_link = link['href']
                print(f"Found download link: {link.text} -> {link['href']}")
                break
        
        if not data_file_link:
            print("Could not find the People Groups (Data Only) file link.")
            return None
        
        # Download the file
        file_url = data_file_link if data_file_link.startswith('http') else f"https://peoplegroups.org{data_file_link}"
        print(f"Downloading file from: {file_url}")
        
        file_response = requests.get(file_url)
        file_response.raise_for_status()
        
        # Generate a filename with the current date
        today = datetime.now().strftime("%Y%m%d")
        original_filename = os.path.basename(file_url)
        file_extension = os.path.splitext(original_filename)[1]  # Get the file extension (.xls, .csv, etc.)
        filename = f"people_groups_data_{today}{file_extension}"
        file_path = os.path.join(output_dir, filename)
        
        # Save the file
        with open(file_path, 'wb') as f:
            f.write(file_response.content)
        
        print(f"File saved to: {file_path}")
        return file_path
    
    except Exception as e:
        print(f"Error scraping peoplegroups.org: {e}")
        return None

def process_data_file(file_path):
    """
    Process the downloaded file to extract only the required columns and add new ones.
    """
    if not file_path or not os.path.exists(file_path):
        print("No file to process.")
        return None
    
    print(f"Processing file: {file_path}")
    
    try:
        # Determine file type and read accordingly
        file_extension = os.path.splitext(file_path)[1].lower()
        if file_extension == '.csv':
            df = pd.read_csv(file_path, encoding='utf-8')
        elif file_extension in ['.xls', '.xlsx']:
            df = pd.read_excel(file_path)
        else:
            print(f"Unsupported file type: {file_extension}")
            return None
        
        # Check if the required columns exist
        required_columns = [
            'People Group', 'Country', 'Population', 'Language', 'Religion',
            'Global Status of  Evangelical Christianity', 'Evangelical Engagement', 'Strategic Priority Index'
        ]
        
        # Map column names if they're different in the file
        column_mapping = {
            'PeopName': 'People Group',
            'PeopleGroup': 'People Group',
            'PeopNameInCountry': 'People Group',
            'Ctry': 'Country',
            'Population': 'Population',
            'PrimaryLanguageName': 'Language',
            'PrimaryReligion': 'Religion',
            'GSECStatus': 'Global Status of  Evangelical Christianity',
            'EngagementStatus': 'Evangelical Engagement',
            'Strategic Priority Index': 'Strategic Priority Index'
        }
        
        # Rename columns if needed
        for old_name, new_name in column_mapping.items():
            if old_name in df.columns and new_name not in df.columns:
                df = df.rename(columns={old_name: new_name})
        
        # Check if all required columns are present after mapping
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"Missing required columns: {missing_columns}")
            return None
        
        # Filter for only 'Unreached and Unengaged' people groups
        print(f"Total people groups before filtering: {len(df)}")
        df = df[df['Strategic Priority Index'] == 'Unengaged and Unreached']
        print(f"Total 'Unreached and Unengaged' people groups after filtering: {len(df)}")
        
        # Select only the required columns
        df = df[required_columns]
        
        # Add new columns
        df['pronunciation'] = ''  # Will be filled in later
        df['Latitude'] = ''  # Will be filled in later
        df['Longitude'] = ''  # Will be filled in later
        
        # Generate a filename for the processed file
        today = datetime.now().strftime("%Y%m%d")
        processed_file = os.path.join(os.path.dirname(file_path), f"processed_people_groups_{today}.csv")
        
        # Save the processed file
        df.to_csv(processed_file, index=False, quoting=csv.QUOTE_ALL)
        
        print(f"Processed file saved to: {processed_file}")
        return processed_file
    
    except Exception as e:
        print(f"Error processing file: {e}")
        return None

def main():
    # Step 1: Scrape and download the file
    file_path = scrape_people_groups_data()
    
    # Step 2: Process the file
    if file_path:
        processed_file = process_data_file(file_path)
        if processed_file:
            print("\nPart I completed successfully!")
            print(f"Original file: {file_path}")
            print(f"Processed file: {processed_file}")
            return processed_file
    
    print("\nPart I failed to complete.")
    return None

if __name__ == "__main__":
    main()
