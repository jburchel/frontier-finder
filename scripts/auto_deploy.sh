#!/bin/bash

# Array of commit message templates
templates=(
    "🚀 Update: General improvements and updates"
    "📦 Deploy: New features and enhancements"
    "🔨 Maintenance: Code cleanup and optimizations"
    "✨ Feature: Added new functionality"
    "🐛 Fix: Bug fixes and improvements"
)

# Get current date
date=$(date '+%Y-%m-%d %H:%M')

# Select random message template
message="${templates[$RANDOM % ${#templates[@]}]} - $date"

echo "🔄 Starting deployment process..."

# Git operations
git add .
git commit -m "$message"
git push origin main

echo "✅ Successfully pushed to repository!"
echo "📝 Commit message: $message"
echo "🚀 GitHub Actions will handle the deployment automatically." 