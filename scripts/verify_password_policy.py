#!/usr/bin/env python
"""
Verification script to test password policy enforcement after migration.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add src to path
PROJECT_ROOT = Path(__file__).resolve().parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from notehub.security import enforce_password_policy, password_policy_errors


def test_password_policy():
    """Test various password scenarios to verify policy enforcement."""
    
    print("=" * 80)
    print("Password Policy Verification")
    print("=" * 80)
    print()
    
    test_cases = [
        ("weak", False, "Too short, no complexity"),
        ("simple123", False, "No uppercase or special characters"),
        ("SIMPLE123", False, "No lowercase or special characters"),
        ("Simple123", False, "No special characters"),
        ("Simple!@#", False, "No numbers"),
        ("ValidPass!234", True, "Meets all requirements"),
        ("ChangeMeNow!42", True, "Default admin password"),
        ("MySecure#Pass2025", True, "Strong password example"),
        ("Bad Password1!", False, "Contains whitespace"),
    ]
    
    passed = 0
    failed = 0
    
    for password, should_pass, description in test_cases:
        errors = password_policy_errors(password)
        is_valid = len(errors) == 0
        
        status = "✓ PASS" if is_valid == should_pass else "✗ FAIL"
        result = "Valid" if is_valid else f"Invalid: {errors[0]}"
        
        print(f"{status} | '{password}'")
        print(f"       Expected: {'Valid' if should_pass else 'Invalid'} | Got: {result}")
        print(f"       Note: {description}")
        print()
        
        if is_valid == should_pass:
            passed += 1
        else:
            failed += 1
    
    print("=" * 80)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 80)
    
    return failed == 0


if __name__ == "__main__":
    success = test_password_policy()
    sys.exit(0 if success else 1)
