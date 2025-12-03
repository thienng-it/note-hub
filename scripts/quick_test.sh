#!/bin/bash
# Quick Test: Real-Time Database Monitoring
# Run this script to see everything in action!

echo "======================================================================"
echo "  🎯 NoteHub Real-Time Database Testing"
echo "======================================================================"
echo ""
echo "This script will demonstrate real-time database updates."
echo ""

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

echo ""
echo "======================================================================"
echo "  Step 1: View Current Database State"
echo "======================================================================"
echo ""
python scripts/monitoring/user_dashboard.py

echo ""
echo "======================================================================"
echo "  Step 2: Create New Test User"
echo "======================================================================"
echo ""
echo "Creating user 'quicktest' with secure password..."
python scripts/monitoring/test_create_user.py quicktest "QuickTest123!@#"

echo ""
echo "======================================================================"
echo "  Step 3: View Updated Database State"
echo "======================================================================"
echo ""
python scripts/monitoring/user_dashboard.py

echo ""
echo "======================================================================"
echo "  ✅ Real-Time Update Test Complete!"
echo "======================================================================"
echo ""
echo "The database was updated in real-time - the new user appeared instantly!"
echo ""
echo "💡 Next steps:"
echo "   • Run 'python scripts/monitoring/monitor_db_realtime.py' to watch live"
echo "   • Run 'python scripts/monitoring/cleanup_test_users.py' to clean up"
echo "   • Check scripts/README.md for full documentation"
echo ""
