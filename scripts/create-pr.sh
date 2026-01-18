#!/bin/bash

# exit when any command fails
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting PR Creation Wizard${NC}"

# Check for uncommitted changes
if git diff-index --quiet HEAD --; then
    # If no changes, check if we have untracked files
    if [ -z "$(git status --porcelain)" ]; then
        echo -e "${RED}❌ No changes detected to commit.${NC}"
        exit 1
    fi
fi

# 1. Run Lint
echo -e "\n${BLUE}🔍 Running Lint...${NC}"
cd frontend && npm run lint
cd ..
echo -e "${GREEN}✓ Lint passed${NC}"

# 2. Gather Info
echo -e "\n${BLUE}📝 Please provide PR details:${NC}"

PS3="Select change type: "
options=("feat" "fix" "refactor" "docs" "chore" "style" "test" "Quit")
select type in "${options[@]}"
do
    case $type in
        "feat"|"fix"|"refactor"|"docs"|"chore"|"style"|"test")
            break
            ;;
        "Quit")
            exit 0
            ;;
        *) echo "invalid option $REPLY";;
    esac
done

read -p "Enter scope (optional, e.g. auth, api): " scope
read -p "Enter short description for branch (kebab-case, e.g. user-login): " branch_desc
read -p "Enter commit message / PR title (e.g. add login page): " title_desc
read -p "Enter PR body/summary: " body

# Format strings
if [ -z "$scope" ]; then
    COMMIT_MSG="$type: $title_desc"
else
    COMMIT_MSG="$type($scope): $title_desc"
fi

BRANCH_NAME="$type/$branch_desc"

# Confirm
echo -e "\n${BLUE}👀 Review:${NC}"
echo "Branch:  $BRANCH_NAME"
echo "Commit:  $COMMIT_MSG"
echo "PR Body: $body"

read -p "Proceed? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# 3. Execute
echo -e "\n${BLUE}🌿 Creating branch...${NC}"
git checkout -b "$BRANCH_NAME"

echo -e "\n${BLUE}💾 Committing...${NC}"
git add .
git commit -m "$COMMIT_MSG"

echo -e "\n${BLUE}⬆️  Pushing...${NC}"
git push -u origin "$BRANCH_NAME"

echo -e "\n${BLUE}🔗 Creating PR...${NC}"
gh pr create --title "$COMMIT_MSG" --body "$body"

echo -e "\n${GREEN}✅ Done! PR created successfully.${NC}"
