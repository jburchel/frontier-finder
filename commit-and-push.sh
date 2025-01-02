#!/bin/bash

# Ensure we're starting from main branch
echo "Checking out main branch..."
git checkout main

# Add all files
echo "Adding files to git..."
git add .

# Create commit
echo "Creating commit..."
git commit -m "Update site content and styling

- Update brand styling to match Crossover Global guidelines
- Improve accessibility features
- Enhance UX for search results
- Fix data loading issues"

# Create and switch to gh-pages branch
echo "Creating/updating gh-pages branch..."
git checkout gh-pages 2>/dev/null || git checkout -b gh-pages

# Merge changes from main
echo "Merging changes from main..."
git merge main -X theirs

# Push to gh-pages
echo "Pushing to gh-pages branch..."
git push origin gh-pages

# Switch back to main branch
echo "Switching back to main branch..."
git checkout main

echo "Done!" 