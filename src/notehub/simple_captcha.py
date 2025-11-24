"""Simple mathematical CAPTCHA implementation for Note Hub.

This module provides a simple, in-codebase CAPTCHA solution as an alternative
to Google reCAPTCHA. It doesn't require external API keys or network calls.
"""

from __future__ import annotations

import random
import secrets
from typing import Tuple


class SimpleMathCaptcha:
    """Simple mathematical CAPTCHA generator.
    
    Generates simple arithmetic problems (addition and subtraction) for CAPTCHA verification.
    The answer is hashed and stored in the session for validation.
    """
    
    @staticmethod
    def generate_challenge() -> Tuple[str, str]:
        """Generate a simple math challenge.
        
        Returns:
            Tuple of (question, answer_hash) where:
            - question: Human-readable math problem (e.g., "What is 7 + 3?")
            - answer_hash: Hash token combining answer with random salt for validation
        """
        # Generate two random numbers between 1 and 20
        num1 = random.randint(1, 20)
        num2 = random.randint(1, 20)
        
        # Randomly choose operation (addition or subtraction)
        operation = random.choice(['+', '-'])
        
        if operation == '+':
            answer = num1 + num2
            question = f"What is {num1} + {num2}?"
        else:
            # Ensure positive result for subtraction
            if num1 < num2:
                num1, num2 = num2, num1
            answer = num1 - num2
            question = f"What is {num1} - {num2}?"
        
        # Create a secure token that includes the answer
        # Format: answer|random_salt
        salt = secrets.token_hex(16)
        answer_token = f"{answer}|{salt}"
        
        return question, answer_token
    
    @staticmethod
    def validate_answer(user_answer: str, answer_token: str) -> bool:
        """Validate user's answer against the token.
        
        Args:
            user_answer: User's submitted answer as string
            answer_token: Token from generate_challenge containing correct answer
            
        Returns:
            True if answer is correct, False otherwise
        """
        if not user_answer or not answer_token:
            return False
        
        try:
            # Extract the correct answer from token
            correct_answer = int(answer_token.split('|')[0])
            submitted_answer = int(user_answer.strip())
            
            return submitted_answer == correct_answer
        except (ValueError, IndexError):
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
