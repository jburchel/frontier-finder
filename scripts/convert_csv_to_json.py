import pandas as pd
import json

def clean_value(value):
    if pd.isna(value):
        return ""
    if isinstance(value, (int, float)):
        return value
    return str(value).strip()

# Convert UPGs CSV to JavaScript
upgs_df = pd.read_csv('data/existing_upgs_updated.csv')
upgs_data = []

for _, row in upgs_df.iterrows():
    upg = {
        "name": clean_value(row['name']),
        "country": clean_value(row['country']),
        "latitude": float(row['latitude']),
        "longitude": float(row['longitude']),
        "population": int(row['population']),
        "evangelical": clean_value(row['evangelical']),
        "language": clean_value(row['language']),
        "religion": clean_value(row['religion'])
    }
    upgs_data.append(upg)

# Create JavaScript file content
js_content = """// UPG data from CSV
const upgData = %s;

// Function to get unique countries
function getCountries() {
    const countries = [...new Set(upgData.map(upg => upg.country))];
    return countries.sort();
}

// Function to get UPGs for a country
function getUPGsByCountry(country) {
    return upgData
        .filter(upg => upg.country === country)
        .map(upg => upg.name)
        .sort();
}

// Function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2, unit = 'kilometers') {
    const R = unit === 'kilometers' ? 6371 : 3959; // Earth's radius in km or miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Function to search for nearby people groups
function searchNearby(country, upgName, radius, units, type) {
    const referenceUPG = upgData.find(upg => upg.country === country && upg.name === upgName);
    if (!referenceUPG) return { fpgs: [], uupgs: [] };

    const results = {
        fpgs: [],
        uupgs: []
    };

    // Search for nearby UPGs
    if (type === 'both' || type === 'uupg') {
        results.uupgs = upgData
            .filter(upg => upg.country !== country || upg.name !== upgName) // Exclude reference UPG
            .map(upg => {
                const distance = calculateDistance(
                    referenceUPG.latitude,
                    referenceUPG.longitude,
                    upg.latitude,
                    upg.longitude,
                    units
                );
                return { ...upg, distance };
            })
            .filter(upg => upg.distance <= radius)
            .sort((a, b) => a.distance - b.distance);
    }

    // For demonstration, we'll show other UPGs as FPGs if they have low evangelical percentage
    if (type === 'both' || type === 'fpg') {
        results.fpgs = upgData
            .filter(upg => (upg.country !== country || upg.name !== upgName) && 
                          (upg.evangelical === 0 || upg.evangelical === ""))
            .map(fpg => {
                const distance = calculateDistance(
                    referenceUPG.latitude,
                    referenceUPG.longitude,
                    fpg.latitude,
                    fpg.longitude,
                    units
                );
                return { ...fpg, distance };
            })
            .filter(fpg => fpg.distance <= radius)
            .sort((a, b) => a.distance - b.distance);
    }

    return results;
}""" % json.dumps(upgs_data, indent=4)

# Write to data.js
with open('js/data.js', 'w') as f:
    f.write(js_content)
