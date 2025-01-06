#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# List of critical files that must exist
CRITICAL_FILES=(
    "index.html"
    "results.html"
    "css/style.css"
    "js/config.js"
    "js/data.js"
    "js/main.js"
    "js/results.js"
    "images/crossover-global-logo.png"
    "images/favicon.png"
    ".nojekyll"
)

# Function to check if all critical files exist
check_files() {
    local missing_files=0
    echo -e "${YELLOW}Checking critical files...${NC}"
    for file in "${CRITICAL_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}Error: File $file not found${NC}"
            missing_files=1
        fi
    done
    return $missing_files
}

# Main deployment process
main() {
    echo -e "${YELLOW}Starting deployment process...${NC}"

    # Create .nojekyll if it doesn't exist
    if [ ! -f ".nojekyll" ]; then
        touch .nojekyll
        echo -e "${GREEN}Created .nojekyll file${NC}"
    fi

    # Check for critical files
    if ! check_files; then
        echo -e "${RED}Error: Missing critical files. Deployment aborted.${NC}"
        exit 1
    fi

    # Add all files to git
    echo -e "${YELLOW}Adding files to git...${NC}"
    git add .

    # Get the type of changes
    echo -e "${YELLOW}Analyzing changes...${NC}"
    if git diff --cached --name-only | grep -q "^js/"; then
        TYPE="feat"
        DESC="update JavaScript functionality"
    elif git diff --cached --name-only | grep -q "^css/"; then
        TYPE="style"
        DESC="update styles and layout"
    elif git diff --cached --name-only | grep -q "^data/"; then
        TYPE="data"
        DESC="update data files"
    else
        TYPE="chore"
        DESC="update site content"
    fi

    # Create commit message
    COMMIT_MSG="${TYPE}: ${DESC}

Changes:
$(git diff --cached --name-only | sed 's/^/- Updated: /')

Technical details:
- Updated file structure
- Ensured GitHub Pages compatibility
- Verified critical files"

    # Commit changes
    echo -e "${YELLOW}Creating commit...${NC}"
    git commit -m "$COMMIT_MSG"

    # Push to main
    echo -e "${YELLOW}Pushing to remote...${NC}"
    if git push origin main; then
        echo -e "${GREEN}Successfully pushed to main branch${NC}"
        echo -e "${GREEN}GitHub Actions will now deploy to gh-pages${NC}"
        echo -e "${YELLOW}Please check the Actions tab for deployment status${NC}"
    else
        echo -e "${RED}Error: Failed to push to remote${NC}"
        exit 1
    fi
}

# Run main function
main 