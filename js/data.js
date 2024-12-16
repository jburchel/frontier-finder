// Load UUPG data from CSV
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
    const R = unit === 'miles' ? 3959 : 6371; // Radius of the earth in miles or km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Function to fetch FPGs from Joshua Project API
async function fetchFPGs(latitude, longitude, radius, units) {
    try {
        const response = await fetch(`${config.apiBaseUrl}/people_groups/search?api_key=${config.apiKey}&latitude=${latitude}&longitude=${longitude}&radius=${radius}&radius_units=${units}&is_frontier=true`);
        if (!response.ok) {
            throw new Error('Failed to fetch FPGs from Joshua Project API');
        }
        const data = await response.json();
        return data.map(fpg => ({
            name: fpg.peo_name,
            country: fpg.cntry_name,
            latitude: fpg.latitude,
            longitude: fpg.longitude,
            population: fpg.population,
            language: fpg.primary_language_name,
            religion: fpg.religion_primary_name,
            distance: calculateDistance(
                latitude,
                longitude,
                fpg.latitude,
                fpg.longitude,
                units
            )
        }));
    } catch (error) {
        console.error('Error fetching FPGs:', error);
        return [];
    }
}

// Function to search for nearby people groups
async function searchNearby(country, upgName, radius, units = 'kilometers') {
    // Find the reference UPG
    const referenceUPG = upgData.find(upg => upg.country === country && upg.name === upgName);
    
    if (!referenceUPG) {
        console.error('Reference UPG not found:', { country, upgName });
        return { uupgs: [], fpgs: [] };
    }

    console.log('Reference UPG found:', referenceUPG);

    // Search for nearby UUPGs from CSV data
    const uupgs = upgData
        .filter(upg => upg.country !== country || upg.name !== upgName)
        .map(upg => ({
            ...upg,
            distance: calculateDistance(
                referenceUPG.latitude,
                referenceUPG.longitude,
                upg.latitude,
                upg.longitude,
                units
            )
        }))
        .filter(upg => upg.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);

    // Fetch FPGs from Joshua Project API
    const fpgs = await fetchFPGs(referenceUPG.latitude, referenceUPG.longitude, radius, units);

    return {
        uupgs,
        fpgs: fpgs.sort((a, b) => a.distance - b.distance)
    };
}