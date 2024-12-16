import os
from flask import Flask, render_template, jsonify, request
import pandas as pd
import requests
from dotenv import load_dotenv
from geopy.distance import geodesic
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
JOSHUA_PROJECT_API_KEY = os.getenv('JOSHUA_PROJECT_API_KEY')
JOSHUA_PROJECT_BASE_URL = 'https://joshuaproject.net/api/v2'

# Load CSV data
def load_csv_data():
    try:
        print("Loading CSV files...")
        upgs_df = pd.read_csv('data/existing_upgs_updated.csv')
        uupgs_df = pd.read_csv('data/updated_uupg.csv')
        print("UPGs DataFrame columns:", upgs_df.columns.tolist())
        print("First few rows of UPGs data:")
        print(upgs_df.head())
        print(f"Loaded UPGs data with {len(upgs_df)} rows")
        print(f"Loaded UUPGs data with {len(uupgs_df)} rows")
        return upgs_df, uupgs_df
    except Exception as e:
        print(f"Error loading CSV files: {str(e)}")
        return None, None

@app.route('/')
def index():
    return render_template('index.html', year=datetime.now().year)

@app.route('/api/countries')
def get_countries():
    try:
        upgs_df, _ = load_csv_data()
        if upgs_df is None:
            return jsonify({"error": "Failed to load data"}), 500
        countries = upgs_df['country'].unique().tolist()
        print(f"Found {len(countries)} countries")
        return jsonify(sorted(countries))
    except Exception as e:
        print(f"Error in get_countries: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/upgs/<country>')
def get_upgs(country):
    try:
        upgs_df, _ = load_csv_data()
        if upgs_df is None:
            return jsonify({"error": "Failed to load data"}), 500
        country_upgs = upgs_df[upgs_df['country'] == country]['name'].unique().tolist()
        print(f"Found {len(country_upgs)} UPGs for country: {country}")
        return jsonify(sorted(country_upgs))
    except Exception as e:
        print(f"Error in get_upgs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    try:
        data = request.json
        country = data.get('country')
        upg = data.get('upg')
        radius = float(data.get('radius', 0))
        units = data.get('units', 'kilometers')
        search_type = data.get('type', 'both')

        # Get reference UPG coordinates
        upgs_df, uupgs_df = load_csv_data()
        if upgs_df is None or uupgs_df is None:
            return jsonify({"error": "Failed to load data"}), 500
        ref_upg = upgs_df[(upgs_df['country'] == country) & (upgs_df['name'] == upg)].iloc[0]
        ref_coords = (ref_upg['latitude'], ref_upg['longitude'])

        results = {
            'fpgs': [],
            'uupgs': []
        }

        # Search for UUPGs if requested
        if search_type in ['both', 'uupg']:
            for _, uupg in uupgs_df.iterrows():
                uupg_coords = (uupg['latitude'], uupg['longitude'])
                distance = geodesic(ref_coords, uupg_coords).kilometers
                if units == 'miles':
                    distance *= 0.621371

                if distance <= radius:
                    results['uupgs'].append({
                        'name': uupg['name'],
                        'country': uupg['country'],
                        'population': int(uupg['population']),
                        'distance': round(distance, 2)
                    })

        # Search for FPGs if requested
        if search_type in ['both', 'fpg']:
            # Call Joshua Project API
            params = {
                'api_key': JOSHUA_PROJECT_API_KEY,
                'Frontier': 'Y'
            }
            response = requests.get(f'{JOSHUA_PROJECT_BASE_URL}/people_groups', params=params)
            
            if response.status_code == 200:
                fpgs = response.json()
                for fpg in fpgs:
                    fpg_coords = (float(fpg['Latitude']), float(fpg['Longitude']))
                    distance = geodesic(ref_coords, fpg_coords).kilometers
                    if units == 'miles':
                        distance *= 0.621371

                    if distance <= radius:
                        results['fpgs'].append({
                            'name': fpg['PeopNameInCountry'],
                            'country': fpg['Ctry'],
                            'population': int(fpg['Population']),
                            'distance': round(distance, 2)
                        })

        return jsonify(results)
    except Exception as e:
        print(f"Error in search: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
