#!/bin/bash

# Build the project
echo "Building project..."
npm run build

# Ensure CSS directory exists
mkdir -p dist/css

# Copy CSS files
echo "Copying CSS files..."
cp -r css/* dist/css/

echo "Adding files to git..."
git add .

echo "Creating commit..."
git commit -m "Fix styling and logo size

- Adjust logo size to 200px width
- Fix CSS file paths
- Update styling for brand consistency
- Ensure CSS is included in build"

echo "Pushing to remote..."
git push origin gh-pages

echo "Done!" 