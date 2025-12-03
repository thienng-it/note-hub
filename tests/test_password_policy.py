"""Unit tests for the shared password policy helpers."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from notehub.security import (
    PASSWORD_POLICY_MIN_LENGTH,
    enforce_password_policy,
    password_policy_errors,
)


class PasswordPolicyTests(unittest.TestCase):
    def test_valid_password_passes(self):
        password = "ValidPass!234"
        self.assertGreaterEqual(len(password), PASSWORD_POLICY_MIN_LENGTH)
        self.assertEqual(password_policy_errors(password), [])

    def test_length_requirement_reported(self):
        errors = password_policy_errors("Short1!")
        self.assertTrue(errors)
        self.assertIn(str(PASSWORD_POLICY_MIN_LENGTH), errors[0])

    def test_enforce_rejects_whitespace(self):
        with self.assertRaises(ValueError):
            enforce_password_policy("Bad Password1!")


if __name__ == "__main__":
    unittest.main()
