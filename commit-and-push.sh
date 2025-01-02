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

# Get a list of changed files
changed_files=$(git diff --name-only)

# Generate commit message based on changes
commit_msg="Update:"

# Check for specific types of changes
if git diff --name-only | grep -q "\.js$"; then
    commit_msg="$commit_msg\n\nJavaScript Changes:"
    for file in $(git diff --name-only | grep "\.js$"); do
        # Get a summary of changes in this JS file
        changes=$(git diff --unified=0 "$file" | grep "^+" | grep -v "^+++" | head -n 3)
        commit_msg="$commit_msg\n- Modified $file: ${changes:0:50}..."
    done
fi

if git diff --name-only | grep -q "\.css$"; then
    commit_msg="$commit_msg\n\nCSS Changes:"
    for file in $(git diff --name-only | grep "\.css$"); do
        commit_msg="$commit_msg\n- Modified $file"
    done
fi

if git diff --name-only | grep -q "\.html$"; then
    commit_msg="$commit_msg\n\nHTML Changes:"
    for file in $(git diff --name-only | grep "\.html$"); do
        commit_msg="$commit_msg\n- Modified $file"
    done
fi

# Check for data file changes
if git diff --name-only | grep -q "/data/"; then
    commit_msg="$commit_msg\n\nData Changes:"
    for file in $(git diff --name-only | grep "/data/"); do
        commit_msg="$commit_msg\n- Modified $file"
    done
fi

# Add configuration changes
if git diff --name-only | grep -q "config\.js$"; then
    commit_msg="$commit_msg\n\nConfiguration Changes:"
    config_changes=$(git diff config.js | grep "^+" | grep -v "^+++" | head -n 2)
    commit_msg="$commit_msg\n- Updated configuration settings"
fi

# Add all changes
echo "Adding files to git..."
git add .

# Create commit
echo "Creating commit..."
git commit -m "$commit_msg"

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