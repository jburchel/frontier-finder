# Frontier Finder

A static web application that helps find Frontier People Groups (FPGs) and Unreached People Groups (UUPGs) within a specified proximity of a selected UPG where Crossover Global has a presence.

## Features
- Interactive country and UPG selection
- Search for FPGs and UUPGs within a specified radius
- Distance calculation in kilometers or miles
- Results sorting by various criteria
- Integration with Joshua Project API
- Firebase integration for data management
- Mobile-responsive design

## Live Demo
Visit the live application at: https://jburchel.github.io/frontier-finder/

## Technology Stack
- HTML5, CSS3, JavaScript (ES6+)
- Firebase Realtime Database
- Vite.js for build and development
- GitHub Pages for hosting

## Setup for Development

1. Clone the repository:
```bash
git clone https://github.com/jburchel/frontier-finder.git
cd frontier-finder
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root with your Firebase configuration:
```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_DATABASE_URL=your_database_url
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
npm run dev
```

## Project Structure
```
frontier_finder/
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── data.js
│   ├── firebase-config.js
│   └── main.js
├── data/
│   ├── existing_upgs_updated.csv
│   └── updated_uupg.csv
├── images/
├── index.html
├── results.html
├── top100.html
├── package.json
└── vite.config.js
```

## Build and Deployment
To build the project for production:
```bash
npm run build
```

The project is automatically deployed to GitHub Pages when changes are pushed to the `gh-pages` branch.

## Data Management
- The application uses CSV files for initial data import
- Data can be converted to JSON format using the provided conversion script
- Firebase Realtime Database is used for storing and retrieving data

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.
