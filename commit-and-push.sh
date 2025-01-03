#!/bin/bash

echo "Adding files to git..."
git add .

echo "Creating commit..."
git commit -m "feat: update deployment and data loading

- Fix data file loading paths
- Update deployment workflow
- Improve CSS styling for logo
- Add better error handling for data loading

Technical changes:
- Updated data.js with better path handling
- Modified deployment workflow
- Added CSS fixes for logo sizing
- Enhanced error logging"

echo "Pushing to remote..."
git push origin main

echo "Done!" 