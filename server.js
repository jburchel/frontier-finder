const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static('public'));

app.get('/api/people_groups', async (req, res) => {
    const { lat, lon, rad } = req.query;
    const apiKey = process.env.JOSHUA_PROJECT_API_KEY;
    const fields = 'PeopleID|PeopleName|Latitude|Longitude|Population|PrimaryReligion|JPScale|PrimaryLanguageName|PrimaryLanguageCode';
    const apiUrl = `https://api.joshuaproject.net/v2/people_groups?api_key=${apiKey}&lat=${lat}&lon=${lon}&rad=${rad}&limit=3000&page=1&fields=${fields}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data from Joshua Project API:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 