#!/bin/bash

# Add all changes to staging
git add .

# Create a meaningful commit message
commit_message="feat: add storage permission to manifest.json

- Enable browser storage access for extension
- Fix content script storage permission errors
- Improve extension functionality for data persistence

Technical changes:
- Added 'storage' to manifest.json permissions array"

# Commit with the message
git commit -m "$commit_message"

# Push to the current branch
current_branch=$(git symbolic-ref --short HEAD)
git push origin $current_branch

echo "Changes committed and pushed successfully to $current_branch" 