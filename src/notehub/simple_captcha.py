"""Simple mathematical CAPTCHA implementation for Note Hub.

This module provides a simple, in-codebase CAPTCHA solution as an alternative
to Google reCAPTCHA. It doesn't require external API keys or network calls.
"""

from __future__ import annotations

import hashlib
import hmac
import random
import secrets
import time
from typing import Tuple


class SimpleMathCaptcha:
    """Enhanced mathematical CAPTCHA generator with improved security.
    
    Generates arithmetic problems (addition, subtraction, multiplication) for CAPTCHA verification.
    Uses HMAC-based token validation with timestamp expiration.
    """
    
    # Token expiration time in seconds (5 minutes)
    TOKEN_EXPIRATION = 300
    
    # Secret key for HMAC (generated once per application instance)
    # This is initialized once when the module is first imported
    _SECRET_KEY = None
    
    @classmethod
    def _get_secret_key(cls) -> bytes:
        """Get or initialize the secret key for HMAC."""
        if cls._SECRET_KEY is None:
            cls._SECRET_KEY = secrets.token_bytes(32)
        return cls._SECRET_KEY
    
    @staticmethod
    def generate_challenge() -> Tuple[str, str]:
        """Generate a simple math challenge with enhanced security.
        
        Returns:
            Tuple of (question, answer_token) where:
            - question: Human-readable math problem (e.g., "What is 7 + 3?")
            - answer_token: HMAC-secured token with timestamp for validation
        """
        # Generate two random numbers with varied ranges for different operations
        operation = random.choice(['+', '-', '*'])
        
        if operation == '+':
            # Addition: 1-30 range for variety
            num1 = random.randint(1, 30)
            num2 = random.randint(1, 30)
            answer = num1 + num2
            question = f"What is {num1} + {num2}?"
        elif operation == '-':
            # Subtraction: ensure positive result
            num1 = random.randint(10, 40)
            num2 = random.randint(1, num1)  # num2 <= num1
            answer = num1 - num2
            question = f"What is {num1} - {num2}?"
        else:  # multiplication
            # Multiplication: smaller numbers for easier calculation
            num1 = random.randint(2, 12)
            num2 = random.randint(2, 12)
            answer = num1 * num2
            question = f"What is {num1} × {num2}?"
        
        # Create secure token with HMAC
        # Format: answer|timestamp|hmac
        timestamp = str(int(time.time()))
        message = f"{answer}|{timestamp}"
        signature = hmac.new(
            SimpleMathCaptcha._get_secret_key(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        answer_token = f"{message}|{signature}"
        
        return question, answer_token
    
    @staticmethod
    def validate_answer(user_answer: str, answer_token: str) -> bool:
        """Validate user's answer against the HMAC-secured token with expiration check.
        
        Args:
            user_answer: User's submitted answer as string
            answer_token: Token from generate_challenge
                         Format: "answer|timestamp|hmac"
            
        Returns:
            True if answer is correct and token is valid and not expired, False otherwise
        """
        if not user_answer or not answer_token:
            return False
        
        try:
            # Parse the token
            parts = answer_token.split('|')
            if len(parts) != 3:
                return False
            
            correct_answer_str, timestamp_str, received_signature = parts
            correct_answer = int(correct_answer_str)
            timestamp = int(timestamp_str)
            submitted_answer = int(user_answer.strip())
            
            # Check if token has expired
            current_time = int(time.time())
            if current_time - timestamp > SimpleMathCaptcha.TOKEN_EXPIRATION:
                return False
            
            # Verify HMAC signature to prevent tampering
            message = f"{correct_answer}|{timestamp}"
            expected_signature = hmac.new(
                SimpleMathCaptcha._get_secret_key(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Use constant-time comparison to prevent timing attacks
            if not hmac.compare_digest(expected_signature, received_signature):
                return False
            
            # Finally, check if the answer is correct
            return submitted_answer == correct_answer
            
        except (ValueError, IndexError, AttributeError):
            return False


def get_captcha_question() -> Tuple[str, str]:
    """Convenience function to get a CAPTCHA question and token.
    
    Returns:
        Tuple of (question, answer_token)
    """
    return SimpleMathCaptcha.generate_challenge()


def verify_captcha_answer(user_answer: str, answer_token: str) -> bool:
    """Convenience function to verify a CAPTCHA answer.
    
    Args:
        user_answer: User's submitted answer
        answer_token: Token from get_captcha_question
        
    Returns:
        True if answer is correct, False otherwise
    """
    return SimpleMathCaptcha.validate_answer(user_answer, answer_token)
