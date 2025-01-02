#!/bin/bash

# Build the project
echo "Building project..."
npm run build

# Ensure directories exist
mkdir -p dist/css
mkdir -p dist/data

# Copy files
echo "Copying files..."
cp -r css/* dist/css/
cp -r data/* dist/data/

# Ensure proper file permissions
chmod -R 644 dist/css/*
chmod -R 644 dist/data/*

echo "Adding files to git..."
git add .

echo "Creating commit..."
git commit -m "Fix styling and logo size

- Adjust logo size to 200px width
- Fix CSS syntax and file paths
- Update styling for brand consistency
- Ensure CSS is properly included in build"

echo "Pushing to remote..."
git push origin gh-pages

echo "Done!" 