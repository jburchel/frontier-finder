#!/bin/bash

echo "Checking current branch..."
current_branch=$(git branch --show-current)

if [ "$current_branch" != "gh-pages" ]; then
    echo "Switching to gh-pages branch..."
    git checkout gh-pages || { echo "Failed to switch to gh-pages branch"; exit 1; }
fi

echo "Adding files to git..."
git add .

echo "Creating commit..."
git commit -m "fix: resolve country dropdown functionality

- Fix syntax error in data.js
- Add debug logging for data loading
- Improve error handling in loadExistingUPGs
- Clean up code comments and formatting

Technical changes:
- Fixed syntax error around line 524 in data.js
- Added debug logging for CSV data loading
- Improved error messages for data validation"

echo "Pushing to remote..."
git push origin gh-pages

echo "Done!" 