#!/bin/bash

# Exit on any error
set -e

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Show current status
echo "Current git status:"
git status

# Add all changes
echo "Adding files to git..."
git add .

# Create commit
echo "Creating commit..."
git commit -m "Update site content and styling

- Update brand styling
- Fix file paths
- Improve data loading
- Update deployment process"

# Create gh-pages branch if it doesn't exist
if ! git show-ref --verify --quiet refs/heads/gh-pages; then
    echo "Creating gh-pages branch..."
    git checkout -b gh-pages
else
    echo "Switching to gh-pages branch..."
    git checkout gh-pages || {
        echo "Error: Could not switch to gh-pages branch"
        exit 1
    }
fi

# Push to gh-pages
echo "Pushing to gh-pages branch..."
git push -u origin gh-pages

echo "Done!" 