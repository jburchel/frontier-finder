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
- GitHub Pages for hosting

## Setup for Development

1. Clone the repository:
```bash
git clone https://github.com/jburchel/frontier-finder.git
cd frontier-finder
```

2. Configure the application:

   a. Copy the example configuration files:
   ```bash
   cp js/config.example.js js/config.js
   ```

   b. Update `js/config.js` with your Joshua Project API key (get one from https://api.joshuaproject.net/)

   c. Update `js/firebase-config.js` with your Firebase configuration

3. Start a local server:
   You can use any local server. For example, with Python:
   ```bash
   # Python 3
   python -m http.server 8000
   # Or Python 2
   python -m SimpleHTTPServer 8000
   ```
   Or with Node.js:
   ```bash
   npx serve
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Configuration Files

### Joshua Project API Configuration
The `js/config.js` file contains the Joshua Project API configuration:
```javascript
export const config = {
    apiKey: 'your-joshua-project-api-key', // Get from https://api.joshuaproject.net/
    apiBaseUrl: 'https://api.joshuaproject.net',
    headers: {
        'Accept': 'application/json'
    }
};
```

### Firebase Configuration
The `js/firebase-config.js` file contains the Firebase configuration:
```javascript
export const firebaseConfig = {
    apiKey: "your-firebase-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
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
