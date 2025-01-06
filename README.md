# Frontier Finder

A web application for Crossover Global to find Frontier People Groups (FPGs) and Unreached Unengaged People Groups (UUPGs) within a specified proximity of a selected UPG.

## Project Overview

This application uses the Joshua Project API to help identify potential ministry opportunities among unreached peoples. Key features:

- Search for FPGs and UUPGs near existing ministry locations
- View detailed information about people groups
- Save and manage a Top 100 priority list

### Key Terms

- **FPG (Frontier People Group)**: Less than 0.1% Christian and no evidence of a self-sustaining gospel movement
- **UUPG (Unengaged Unreached People Group)**: No active church planting methodology underway
- **UPG (Unreached People Group)**: Less than 2% Evangelical Christian
- **JPScale**: Joshua Project Progress Scale (1.1 to 3.2)

## Setup

1. Clone the repository
2. Open index.html in your browser
3. Use Live Server for development

## Technical Details

- Static website deployed through GitHub Pages
- Uses Joshua Project API for people group data
- Local CSV data for current UPGs and UUPGs
- Follows Crossover Global Brand Book guidelines

### Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest version)

## Structure

frontier-finder/
├── css/
│   └── style.css         # Current styling for layout
├── data/
│   ├── current_upgs.csv  # Current UPGs data
│   └── uupgs.csv         # UUPGs data
├── js/
│   ├── config.js         # API keys and configuration
│   ├── api.js            # Joshua Project API interactions
│   ├── firebase.js       # Firebase/Firestore setup
│   ├── search.js         # Search functionality
│   └── ui.js             # UI interactions and updates
├── images/
│   ├── favicon.png
│   └── logo.png          # Crossover Global logo
├── index.html            # Main search interface
├── .gitignore
└── README.md

