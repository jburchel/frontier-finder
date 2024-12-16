# Frontier Finder

A web application to find Frontier People Groups (FPGs) and Unreached People Groups (UUPGs) within a specified proximity of a selected UPG.

## Features
- Country and UPG selection dropdowns
- Search for FPGs, UUPGs, or both within specified radius
- Distance calculation in kilometers or miles
- Integration with Joshua Project API

## Setup
1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the project root and add your Joshua Project API key:
```
JOSHUA_PROJECT_API_KEY=your_api_key_here
```

4. Place the required CSV files in the `data` directory:
- existing_upgs_updated.csv
- updated_uupg.csv

5. Run the application:
```bash
python app.py
```

## Project Structure
```
frontier_finder/
├── app/
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   └── templates/
├── data/
├── .env
├── app.py
├── README.md
└── requirements.txt
```
