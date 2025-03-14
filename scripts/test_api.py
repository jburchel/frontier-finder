#!/usr/bin/env python3
import requests
import json

# Joshua Project API key
API_KEY = "080e14ad747e"
BASE_URL = "https://joshuaproject.net/api/v2/people_groups"

def test_api():
    """Test the Joshua Project API to understand its response format."""
    # Basic API call with just the API key
    params = {
        "api_key": API_KEY,
    }
    
    print("Making a basic API call to understand the response format...")
    response = requests.get(BASE_URL, params=params)
    
    if response.status_code == 200:
        print(f"API call successful with status code: {response.status_code}")
        
        # Get the response data
        data = response.json()
        
        # Check the type of the response
        print(f"Response type: {type(data)}")
        
        # Print the structure of the response
        if isinstance(data, dict):
            print("Response is a dictionary. Keys:")
            for key in data.keys():
                print(f"- {key}")
                
            # If there's a 'data' key, examine its contents
            if 'data' in data:
                items = data['data']
                print(f"\nNumber of items in data: {len(items)}")
                
                if len(items) > 0:
                    print("\nFirst item in data:")
                    first_item = items[0]
                    print(json.dumps(first_item, indent=2))
                    
                    # Check if the item has coordinates
                    lat = first_item.get("Latitude")
                    lon = first_item.get("Longitude")
                    print(f"\nCoordinates in first item: Latitude={lat}, Longitude={lon}")
                    
                    # Check available fields
                    print("\nAvailable fields in the first item:")
                    for key in first_item.keys():
                        print(f"- {key}")
        elif isinstance(data, list):
            print(f"Response is a list with {len(data)} items")
            if len(data) > 0:
                print("\nFirst item in list:")
                first_item = data[0]
                print(json.dumps(first_item, indent=2))
                
                # Check if the item has coordinates
                lat = first_item.get("Latitude")
                lon = first_item.get("Longitude")
                print(f"\nCoordinates in first item: Latitude={lat}, Longitude={lon}")
                
                # Check available fields
                print("\nAvailable fields in the first item:")
                for key in first_item.keys():
                    print(f"- {key}")
        else:
            print("Response is neither a dictionary nor a list.")
    else:
        print(f"API call failed with status code: {response.status_code}")
        print(f"Response content: {response.text}")

    # Try a more specific search for a people group
    test_people = "Azeris"
    test_country = "Azerbaijan"
    
    print(f"\n\nTesting search for '{test_people}' in '{test_country}'...")
    search_params = {
        "api_key": API_KEY,
        "PeopNameInCountry": test_people,
        "Ctry": test_country
    }
    
    try:
        response = requests.get(BASE_URL, params=search_params)
        
        print(f"Search API call status code: {response.status_code}")
        
        if response.status_code == 200:
            # Get the response data
            data = response.json()
            
            # Check the type of the response
            print(f"Response type: {type(data)}")
            
            # Print the structure of the response
            if isinstance(data, dict):
                print("Response is a dictionary. Keys:")
                for key in data.keys():
                    print(f"- {key}")
                    
                # If there's a 'data' key, examine its contents
                if 'data' in data:
                    items = data['data']
                    print(f"\nNumber of items in data: {len(items)}")
                    
                    if len(items) > 0:
                        print("\nItems found:")
                        for i, item in enumerate(items):
                            name = item.get("PeopNameInCountry", "N/A")
                            country = item.get("Ctry", "N/A")
                            lat = item.get("Latitude")
                            lon = item.get("Longitude")
                            print(f"{i+1}. {name} in {country} - Coordinates: Lat={lat}, Lon={lon}")
            elif isinstance(data, list):
                print(f"Response is a list with {len(data)} items")
                
                if len(data) > 0:
                    print("\nItems found:")
                    for i, item in enumerate(data):
                        name = item.get("PeopNameInCountry", "N/A")
                        country = item.get("Ctry", "N/A")
                        lat = item.get("Latitude")
                        lon = item.get("Longitude")
                        print(f"{i+1}. {name} in {country} - Coordinates: Lat={lat}, Lon={lon}")
                else:
                    print("No items found for this search.")
            else:
                print("Response is neither a dictionary nor a list.")
        else:
            print(f"Search API call failed with status code: {response.status_code}")
            print(f"Response content: {response.text}")
    except Exception as e:
        print(f"Error during API call: {e}")

    # Try a different approach - search for a specific country
    print("\n\nTesting search for all people groups in Azerbaijan...")
    country_params = {
        "api_key": API_KEY,
        "Ctry": "Azerbaijan"
    }
    
    try:
        response = requests.get(BASE_URL, params=country_params)
        
        print(f"Country search API call status code: {response.status_code}")
        
        if response.status_code == 200:
            # Get the response data
            data = response.json()
            
            # Check the type of the response
            print(f"Response type: {type(data)}")
            
            # Print the structure of the response
            if isinstance(data, dict):
                print("Response is a dictionary. Keys:")
                for key in data.keys():
                    print(f"- {key}")
                    
                # If there's a 'data' key, examine its contents
                if 'data' in data:
                    items = data['data']
                    print(f"\nNumber of items in data: {len(items)}")
                    
                    if len(items) > 0:
                        print("\nFirst 5 items found:")
                        for i, item in enumerate(items[:5]):
                            name = item.get("PeopNameInCountry", "N/A")
                            country = item.get("Ctry", "N/A")
                            lat = item.get("Latitude")
                            lon = item.get("Longitude")
                            print(f"{i+1}. {name} in {country} - Coordinates: Lat={lat}, Lon={lon}")
            elif isinstance(data, list):
                print(f"Response is a list with {len(data)} items")
                
                if len(data) > 0:
                    print("\nFirst 5 items found:")
                    for i, item in enumerate(data[:5]):
                        name = item.get("PeopNameInCountry", "N/A")
                        country = item.get("Ctry", "N/A")
                        lat = item.get("Latitude")
                        lon = item.get("Longitude")
                        print(f"{i+1}. {name} in {country} - Coordinates: Lat={lat}, Lon={lon}")
                else:
                    print("No items found for this search.")
            else:
                print("Response is neither a dictionary nor a list.")
        else:
            print(f"Country search API call failed with status code: {response.status_code}")
            print(f"Response content: {response.text}")
    except Exception as e:
        print(f"Error during API call: {e}")

if __name__ == "__main__":
    test_api() 