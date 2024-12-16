// UPG data from CSV
const upgData = [
    {
        "name": "Georgian",
        "country": "Georgia",
        "latitude": 43.2287,
        "longitude": 40.86397,
        "population": 900,
        "evangelical": 1.0,
        "language": "Abkhaz",
        "religion": "Christianity"
    },
    {
        "name": "Ahar",
        "country": "India",
        "latitude": 25.0513117227512,
        "longitude": 84.2202372298985,
        "population": 40000,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Albanian",
        "country": "Albania",
        "latitude": 39.838469,
        "longitude": 20.168576,
        "population": 2575000,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Arab, Moroccan",
        "country": "Morocco",
        "latitude": 33.574177,
        "longitude": -7.591614,
        "population": 20880000,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Avar (Dagestani)",
        "country": "Russia",
        "latitude": 44.22168,
        "longitude": 41.88952,
        "population": 42000,
        "evangelical": 0.05,
        "language": "Abaza",
        "religion": "Islam"
    },
    {
        "name": "Azerbaijani",
        "country": "Georgia",
        "latitude": 43.2287,
        "longitude": 40.86397,
        "population": 900,
        "evangelical": 1.0,
        "language": "Abkhaz",
        "religion": "Christianity"
    },
    {
        "name": "Azerbaijani",
        "country": "Azerbaijan",
        "latitude": 40.2128,
        "longitude": 47.68707,
        "population": 9535000,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Balmiki",
        "country": "India",
        "latitude": 25.0513117227512,
        "longitude": 84.2202372298985,
        "population": 40000,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Brahmin Maithili",
        "country": "Nepal",
        "latitude": 28.4424430648454,
        "longitude": 82.17540409226,
        "population": 1500,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Budukh",
        "country": "Azerbaijan",
        "latitude": 41.1853,
        "longitude": 48.3662,
        "population": 200,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Bugis",
        "country": "Indonesia",
        "latitude": -5.50086,
        "longitude": 120.25376,
        "population": 7685000,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Buol",
        "country": "Indonesia",
        "latitude": 0.97727,
        "longitude": 121.51903,
        "population": 128000,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Kist",
        "country": "Georgia",
        "latitude": 43.2287,
        "longitude": 40.86397,
        "population": 900,
        "evangelical": 1.0,
        "language": "Abkhaz",
        "religion": "Christianity"
    },
    {
        "name": "Chepang",
        "country": "Nepal",
        "latitude": 28.4424430648454,
        "longitude": 82.17540409226,
        "population": 1500,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Danuwar",
        "country": "Nepal",
        "latitude": 28.4424430648454,
        "longitude": 82.17540409226,
        "population": 1500,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Georgians",
        "country": "Georgia",
        "latitude": 43.2287,
        "longitude": 40.86397,
        "population": 900,
        "evangelical": 1.0,
        "language": "Abkhaz",
        "religion": "Christianity"
    },
    {
        "name": "Han-Chinese",
        "country": "China",
        "latitude": 24.68311,
        "longitude": 101.97421,
        "population": 42000,
        "evangelical": 0.0,
        "language": "Ache",
        "religion": "Ethnic Religions"
    },
    {
        "name": "Ingush",
        "country": "Russia",
        "latitude": 44.22168,
        "longitude": 41.88952,
        "population": 42000,
        "evangelical": 0.05,
        "language": "Abaza",
        "religion": "Islam"
    },
    {
        "name": "Persian",
        "country": "Iran",
        "latitude": 35.703318,
        "longitude": 51.436065,
        "population": 28930000,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Kabardian",
        "country": "Russia",
        "latitude": 44.22168,
        "longitude": 41.88952,
        "population": 42000,
        "evangelical": 0.05,
        "language": "Abaza",
        "religion": "Islam"
    },
    {
        "name": "Khar (Khan)",
        "country": "India",
        "latitude": 25.0513117227512,
        "longitude": 84.2202372298985,
        "population": 40000,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Khatik",
        "country": "India",
        "latitude": 25.0513117227512,
        "longitude": 84.2202372298985,
        "population": 40000,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Lezgin",
        "country": "Russia",
        "latitude": 44.22168,
        "longitude": 41.88952,
        "population": 42000,
        "evangelical": 0.05,
        "language": "Abaza",
        "religion": "Islam"
    },
    {
        "name": "Lodha (Hindu traditions)",
        "country": "India",
        "latitude": 25.0513117227512,
        "longitude": 84.2202372298985,
        "population": 40000,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Mirasi",
        "country": "India",
        "latitude": 25.0513117227512,
        "longitude": 84.2202372298985,
        "population": 40000,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Mugal",
        "country": "Nepal",
        "latitude": 28.4424430648454,
        "longitude": 82.17540409226,
        "population": 1500,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Naau",
        "country": "India",
        "latitude": 25.0513117227512,
        "longitude": 84.2202372298985,
        "population": 40000,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Ossetian",
        "country": "Russia",
        "latitude": 44.22168,
        "longitude": 41.88952,
        "population": 42000,
        "evangelical": 0.05,
        "language": "Abaza",
        "religion": "Islam"
    },
    {
        "name": "Palthaan",
        "country": "India",
        "latitude": 25.0513117227512,
        "longitude": 84.2202372298985,
        "population": 40000,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Rutul",
        "country": "Azerbaijan",
        "latitude": 41.191944,
        "longitude": 47.170556,
        "population": 900,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Sherpa (Buddhist)",
        "country": "Nepal",
        "latitude": 28.4424430648454,
        "longitude": 82.17540409226,
        "population": 1500,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Soria",
        "country": "India",
        "latitude": 25.0513117227512,
        "longitude": 84.2202372298985,
        "population": 40000,
        "evangelical": 0.0,
        "language": "Urdu",
        "religion": "Islam"
    },
    {
        "name": "Tatar",
        "country": "Azerbaijan",
        "latitude": 40.411197,
        "longitude": 49.844,
        "population": 38500,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Tolaki",
        "country": "Indonesia",
        "latitude": -4.03577,
        "longitude": 121.88825,
        "population": 259000,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Tsakhur",
        "country": "Azerbaijan",
        "latitude": 41.59156,
        "longitude": 46.88585,
        "population": 20500,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Arab, Tunisian",
        "country": "Tunisia",
        "latitude": 36.6452,
        "longitude": 9.6041,
        "population": 11260000,
        "evangelical": "",
        "language": "",
        "religion": ""
    },
    {
        "name": "Turkmen",
        "country": "Turkmenistan",
        "latitude": 37.95117,
        "longitude": 58.378743,
        "population": 5165000,
        "evangelical": "",
        "language": "",
        "religion": ""
    }
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
function searchNearby(country, upgName, radius, units = 'kilometers') {
    // Find the reference UPG
    const referenceUPG = upgData.find(upg => upg.country === country && upg.name === upgName);
    
    if (!referenceUPG) {
        console.error('Reference UPG not found:', { country, upgName });
        return { uupgs: [], fpgs: [] };
    }

    console.log('Reference UPG found:', referenceUPG);

    const results = {
        uupgs: [],
        fpgs: []
    };

    // Search through all UPGs
    upgData.forEach(upg => {
        // Skip the reference UPG itself
        if (upg.country === country && upg.name === upgName) return;

        // Calculate distance
        const distance = calculateDistance(
            referenceUPG.latitude,
            referenceUPG.longitude,
            upg.latitude,
            upg.longitude,
            units
        );

        // If within radius, add to appropriate category
        if (distance <= parseFloat(radius)) {
            const upgWithDistance = { ...upg, distance };
            
            // Classify as FPG if evangelical percentage is 0 or empty
            if (upg.evangelical === 0 || upg.evangelical === "") {
                results.fpgs.push(upgWithDistance);
            } else {
                results.uupgs.push(upgWithDistance);
            }
        }
    });

    // Sort results by distance
    results.uupgs.sort((a, b) => a.distance - b.distance);
    results.fpgs.sort((a, b) => a.distance - b.distance);

    console.log('Search results:', results);
    return results;
}