#!/bin/bash
# Version bump script for NoteHub
# Usage: ./scripts/bump-version.sh [major|minor|patch]

set -e

BUMP_TYPE=${1:-patch}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔄 Bumping version (type: $BUMP_TYPE)..."

# Function to bump version
bump_version() {
    local current=$1
    local type=$2
    
    IFS='.' read -r major minor patch <<< "$current"
    
    case $type in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
        *)
            echo "❌ Invalid bump type: $type (must be major, minor, or patch)"
            exit 1
            ;;
    esac
    
    echo "$major.$minor.$patch"
}

# Get current version from backend package.json
BACKEND_VERSION=$(grep '"version"' "$PROJECT_ROOT/backend/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
echo "📦 Current backend version: $BACKEND_VERSION"

# Calculate new version
NEW_VERSION=$(bump_version "$BACKEND_VERSION" "$BUMP_TYPE")
echo "✨ New version: $NEW_VERSION"

# Update backend package.json
sed -i.bak "s/\"version\": \"$BACKEND_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PROJECT_ROOT/backend/package.json"
rm "$PROJECT_ROOT/backend/package.json.bak"
echo "✅ Updated backend/package.json"

# Update frontend package.json
FRONTEND_VERSION=$(grep '"version"' "$PROJECT_ROOT/frontend/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
sed -i.bak "s/\"version\": \"$FRONTEND_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PROJECT_ROOT/frontend/package.json"
rm "$PROJECT_ROOT/frontend/package.json.bak"
echo "✅ Updated frontend/package.json"

# Create git tag
echo ""
echo "📝 Version bump complete!"
echo "   Backend:  $BACKEND_VERSION → $NEW_VERSION"
echo "   Frontend: $FRONTEND_VERSION → $NEW_VERSION"
echo ""
echo "To complete the release:"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add -A && git commit -m 'chore: bump version to $NEW_VERSION'"
echo "  3. Tag: git tag -a v$NEW_VERSION -m 'Release v$NEW_VERSION'"
echo "  4. Push: git push && git push --tags"
