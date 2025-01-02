#!/bin/bash

echo "Adding files to git..."
git add .

echo "Creating commit..."
git commit -m "feat: add storage permission to manifest.json

- Enable browser storage access for extension
- Fix content script storage permission errors
- Improve extension functionality for data persistence

Technical changes:
- Added 'storage' to manifest.json permissions array"

echo "Pushing to remote..."
git push origin gh-pages

echo "Done!" 