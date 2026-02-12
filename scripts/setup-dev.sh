#!/bin/bash

# Setup script for NoteHub development environment
# This installs git hooks and configures the project

set -e

echo "🚀 Setting up NoteHub development environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
  echo "❌ Error: This script must be run from the note-hub root directory"
  exit 1
fi

# Install pre-commit hook
echo "📝 Installing pre-commit hook..."
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Pre-commit hook to auto-fix linting issues

echo "🔍 Running pre-commit checks..."

# Function to run linting in a directory
run_lint_fix() {
  local dir=$1
  local name=$2
  
  if [ -d "$dir" ]; then
    echo "📝 Fixing $name..."
    cd "$dir"
    npm run lint:fix 2>/dev/null || true
    cd - > /dev/null
  fi
}

# Fix backend
run_lint_fix "backend" "backend"

# Fix frontend
run_lint_fix "frontend" "frontend"

# Add any fixed files
git add -A

echo "✅ Pre-commit checks complete!"
EOF

chmod +x .git/hooks/pre-commit

# Install dependencies
echo "📦 Installing dependencies..."

if [ -d "backend" ]; then
  echo "  → Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

if [ -d "frontend" ]; then
  echo "  → Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Setup complete! You're ready to develop."
echo ""
echo "📋 Next steps:"
echo "  1. Copy .env.example to .env in backend/ and configure"
echo "  2. Run 'cd backend && npm run dev' to start backend"
echo "  3. Run 'cd frontend && npm run dev' to start frontend"
echo ""
echo "💡 Tips:"
echo "  • Linting issues will be auto-fixed before each commit"
echo "  • Run 'npm run lint:fix' manually in backend/ or frontend/"
echo "  • See QUICKSTART.md for more details"
