#!/usr/bin/env python3
import os
import sys
import time
from datetime import datetime

# Import the individual scripts
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from scrape_people_groups import main as scrape_main
from update_coordinates_new import main as coordinates_main
from generate_pronunciation import main as pronunciation_main
from update_uupgs_data import main as update_uupgs_main

def main(limit=None):
    """
    Run the complete people groups data update workflow:
    1. Scrape and process the latest data from peoplegroups.org
    2. Update coordinates using the Joshua Project API
    3. Generate pronunciations for people group names
    4. Update the uupgs.csv file with the new data
    
    Args:
        limit: Maximum number of entries to process in each step (for testing)
    """
    start_time = time.time()
    print("\n" + "=" * 80)
    print("FRONTIER FINDER - PEOPLE GROUPS DATA UPDATE WORKFLOW")
    print("=" * 80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80 + "\n")
    
    # Part I: Scrape and process the data
    print("\n" + "=" * 80)
    print("PART I: SCRAPING AND PROCESSING DATA FROM PEOPLEGROUPS.ORG")
    print("=" * 80 + "\n")
    processed_file = scrape_main()
    
    if not processed_file:
        print("\nWorkflow stopped due to error in Part I.")
        return False
    
    # Part II: Update coordinates
    print("\n" + "=" * 80)
    print("PART II: UPDATING COORDINATES USING JOSHUA PROJECT API")
    print("=" * 80 + "\n")
    coordinates_file = coordinates_main(processed_file)
    
    if not coordinates_file:
        print("\nWorkflow stopped due to error in Part II.")
        return False
    
    # Part III: Generate pronunciations
    print("\n" + "=" * 80)
    print("PART III: GENERATING PRONUNCIATIONS FOR PEOPLE GROUP NAMES")
    print("=" * 80 + "\n")
    pronunciation_file = pronunciation_main(coordinates_file)
    
    if not pronunciation_file:
        print("\nWorkflow stopped due to error in Part III.")
        return False
    
    # Part IV: Update uupgs.csv
    print("\n" + "=" * 80)
    print("PART IV: UPDATING UUPGS.CSV WITH NEW DATA")
    print("=" * 80 + "\n")
    success = update_uupgs_main(pronunciation_file)
    
    if not success:
        print("\nWorkflow stopped due to error in Part IV.")
        return False
    
    # Workflow complete
    end_time = time.time()
    duration = end_time - start_time
    hours, remainder = divmod(duration, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    print("\n" + "=" * 80)
    print("WORKFLOW COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total duration: {int(hours)}h {int(minutes)}m {int(seconds)}s")
    print("=" * 80 + "\n")
    
    return True

if __name__ == "__main__":
    main()
