// Convert your CSV data to JSON
const upgData = [
    {
        "name": "Georgian",
        "country": "Georgia",
        "latitude": 43.2287,
        "longitude": 40.86397,
        "population": 900,
        "evangelical": 1,
        "language": "Abkhaz",
        "religion": "Christianity"
    },
    // Add more UPG data here...
];

const uupgData = [
    // Add your UUPG data here...
];

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

    // Search UUPGs
    if (type === 'both' || type === 'uupg') {
        results.uupgs = uupgData
            .map(uupg => {
                const distance = calculateDistance(
                    referenceUPG.latitude,
                    referenceUPG.longitude,
                    uupg.latitude,
                    uupg.longitude,
                    units
                );
                return { ...uupg, distance };
            })
            .filter(uupg => uupg.distance <= radius)
            .sort((a, b) => a.distance - b.distance);
    }

    // For FPGs, you would typically call the Joshua Project API
    // In this static version, we'll use the UPG data as a placeholder
    if (type === 'both' || type === 'fpg') {
        results.fpgs = upgData
            .filter(upg => upg.evangelical < 2) // Example criteria for FPGs
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
}
