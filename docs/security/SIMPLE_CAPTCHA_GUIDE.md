# Simple Math CAPTCHA Guide

## Overview

Note Hub now includes a built-in, simple mathematical CAPTCHA as an alternative to Google reCAPTCHA. This provides bot protection without requiring external API keys or network calls.

## Features

- **No External Dependencies**: Works completely offline, no API keys needed
- **Enhanced Math Problems**: Addition, subtraction, and multiplication with varied ranges
- **HMAC-Secured Validation**: Cryptographically signed tokens prevent tampering
- **Time-Based Expiration**: Tokens expire after 5 minutes to prevent replay attacks
- **Automatic Integration**: Works seamlessly with existing forms
- **Easy Configuration**: Simple environment variable to enable/disable

## How It Works

### Challenge Generation

When a user visits a form with CAPTCHA enabled:
1. A random math problem is generated with varied difficulty:
   - Addition: numbers 1-30 (e.g., "What is 17 + 23?")
   - Subtraction: numbers 10-40 (e.g., "What is 35 - 12?")
   - Multiplication: numbers 2-12 (e.g., "What is 7 × 8?")
2. The answer, timestamp, and HMAC signature are combined into a secure token
3. The question is displayed to the user
4. The token is stored in a hidden form field

### Answer Validation

When the user submits the form:
1. The token's HMAC signature is verified to ensure it wasn't tampered with
2. The token's timestamp is checked for expiration (5-minute window)
3. The user's answer is compared with the correct answer
4. Form submission proceeds only if all validations pass

### Enhanced Security Features

- **HMAC Signatures**: SHA-256 HMAC prevents token tampering
- **Time-Based Expiration**: Tokens expire after 5 minutes
- **Constant-Time Comparison**: Prevents timing attacks on HMAC verification
- **Increased Difficulty Range**: Larger number ranges make brute-forcing harder
- **Multiple Operations**: Three operation types (addition, subtraction, multiplication)
- **Non-Reusable**: Each token is unique and cannot be reused
- **Session Isolation**: Challenges are tied to the user's session

## Configuration

### Enable Simple CAPTCHA (Default)

Simple CAPTCHA is enabled by default. No configuration needed!

```bash
# Default configuration (simple CAPTCHA enabled)
# No environment variables needed
```

### Disable CAPTCHA Completely

To disable CAPTCHA protection entirely:

```bash
export CAPTCHA_TYPE=none
```

### Use Google reCAPTCHA Instead

To use Google reCAPTCHA v2 instead of simple CAPTCHA:

```bash
export CAPTCHA_TYPE=recaptcha
export RECAPTCHA_SITE_KEY=your_site_key
export RECAPTCHA_SECRET_KEY=your_secret_key
```

## Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `CAPTCHA_TYPE` | `simple`, `recaptcha`, `none` | `simple` | Type of CAPTCHA to use |
| `RECAPTCHA_SITE_KEY` | string | empty | Google reCAPTCHA site key (required if type=recaptcha) |
| `RECAPTCHA_SECRET_KEY` | string | empty | Google reCAPTCHA secret key (required if type=recaptcha) |

## Protected Forms

Simple CAPTCHA is automatically added to:

1. **Login Form** (`/login`) - Prevents brute force attacks
2. **Registration Form** (`/register`) - Prevents automated bot registrations
3. **Forgot Password Form** (`/forgot_password`) - Prevents password reset abuse

## User Experience

### What Users See

When simple CAPTCHA is enabled, users will see:
- A security question with a simple math problem
- An input field to enter their answer
- Clear error messages if the answer is incorrect

Examples:
```
Security Question: What is 17 + 23?
Security Question: What is 35 - 12?
Security Question: What is 7 × 8?
[Input field for answer]
```

### Accessibility

- Clear, simple questions that are easy to understand
- Uses basic arithmetic (addition, subtraction, multiplication)
- Varied number ranges appropriate for each operation
- Subtraction always produces non-negative results
- Multiplication uses numbers 2-12 (standard multiplication table range)

## Advantages of Simple CAPTCHA

### Pros

✅ **No External Dependencies**
- Works offline
- No API keys required
- No external service calls
- No privacy concerns

✅ **Fast and Lightweight**
- No network latency
- No JavaScript required
- Minimal server resources
- Quick to validate

✅ **Easy to Deploy**
- Works out of the box
- No account registration needed
- No configuration required
- No costs involved

✅ **User-Friendly**
- Simple math problems
- Quick to solve
- No image recognition needed
- Works with screen readers

### Cons

⚠️ **Less Robust Than reCAPTCHA**
- Can be bypassed by sophisticated bots with OCR
- Not as effective against determined attackers
- No adaptive difficulty

⚠️ **Limited Protection**
- Basic security only
- Not recommended for high-security applications
- Should be combined with rate limiting

## When to Use Each CAPTCHA Type

### Use Simple CAPTCHA When:

- You want quick deployment without configuration
- Privacy is a concern (no data sent to Google)
- You're in a development/testing environment
- Your app doesn't require high security
- You want to avoid external dependencies
- You need offline functionality

### Use Google reCAPTCHA When:

- You need robust bot protection
- You're running a production application
- You expect automated attack attempts
- You can handle the Google dependency
- Privacy trade-offs are acceptable
- You need advanced bot detection

### Disable CAPTCHA When:

- You're in local development
- You're running automated tests
- You have other protection mechanisms
- User experience is critical

## Enhanced Security Features (v2.0)

The simple CAPTCHA has been significantly strengthened with the following improvements:

### 1. HMAC-Based Token Validation

- Uses SHA-256 HMAC signatures to cryptographically sign each token
- Prevents token tampering and forging
- Constant-time comparison prevents timing attacks

### 2. Time-Based Expiration

- Tokens automatically expire after 5 minutes
- Prevents token replay attacks
- Forces users to solve fresh challenges

### 3. Expanded Operation Types

- **Addition**: Numbers 1-30 (e.g., "What is 17 + 23?" = 40)
- **Subtraction**: Numbers 10-40 (e.g., "What is 35 - 12?" = 23)
- **Multiplication**: Numbers 2-12 (e.g., "What is 7 × 8?" = 56)

### 4. Increased Difficulty Range

- Larger number ranges make brute-forcing significantly harder
- Answers can range from 4 to 144, providing thousands of possibilities
- Multiple operation types increase complexity

### 5. Token Format

Old format (v1.0): `answer|salt`
New format (v2.0): `answer|timestamp|hmac_signature`

The new format provides:
- Tamper detection via HMAC
- Expiration via timestamp
- Replay attack prevention

## Best Practices

### 1. Combine with Rate Limiting

Simple CAPTCHA should be used alongside rate limiting:

```python
# Flask-Limiter is already configured
# Default: 200 per day, 50 per hour
```

### 2. Monitor Login Attempts

Keep track of failed login attempts and adjust security as needed.

### 3. Regular Security Audits

Periodically review:
- Failed CAPTCHA attempts
- Login failure patterns
- Suspicious IP addresses

### 4. Consider Upgrading to reCAPTCHA

For production deployments with sensitive data, consider using Google reCAPTCHA:

```bash
export CAPTCHA_TYPE=recaptcha
export RECAPTCHA_SITE_KEY=your_site_key
export RECAPTCHA_SECRET_KEY=your_secret_key
```

## Testing

### Manual Testing

1. Visit the login page
2. You should see a math question (e.g., "What is 5 + 7?")
3. Enter the correct answer (12) and submit
4. Login should succeed
5. Try entering a wrong answer - you should see an error

### Automated Testing

Run the CAPTCHA test suite:

```bash
pytest tests/test_captcha.py -v
```

## Troubleshooting

### CAPTCHA Not Showing

**Problem**: No CAPTCHA appears on forms

**Solutions**:
1. Check `CAPTCHA_TYPE` environment variable
2. Ensure it's set to `simple` or not set at all
3. Restart the application
4. Clear your browser cache

### "CAPTCHA session expired" Error

**Problem**: Getting session expired errors

**Solutions**:
1. Refresh the page to get a new challenge
2. Check session configuration
3. Ensure cookies are enabled
4. Check session timeout settings

### Wrong Answer Errors

**Problem**: Correct answers being marked as wrong

**Solutions**:
1. Double-check your math
2. Ensure you're entering just the number (no spaces)
3. Refresh the page if the session expired
4. Check for browser extensions interfering

## Security Considerations

### Limitations

Simple CAPTCHA has inherent limitations:

1. **OCR Vulnerability**: Advanced bots with OCR can solve math problems
2. **Pattern Recognition**: Patterns can be learned over time
3. **Brute Force**: Simple problems have limited answer space

### Mitigation Strategies

To enhance security when using simple CAPTCHA:

1. **Enable Rate Limiting** (already configured)
   - Limits attempts per IP address
   - Slows down brute force attacks

2. **Monitor Failed Attempts**
   - Track patterns of failures
   - Block suspicious IPs

3. **Use HTTPS** (recommended for production)
   - Encrypts CAPTCHA tokens in transit
   - Prevents man-in-the-middle attacks

4. **Session Security**
   - Configure secure session cookies
   - Use appropriate session timeouts

### Upgrade Path

If you need stronger protection:

```bash
# Switch to Google reCAPTCHA
export CAPTCHA_TYPE=recaptcha
export RECAPTCHA_SITE_KEY=your_site_key
export RECAPTCHA_SECRET_KEY=your_secret_key
```

## API Reference

### SimpleMathCaptcha Class

```python
from src.notehub.simple_captcha import SimpleMathCaptcha

# Generate a challenge
question, token = SimpleMathCaptcha.generate_challenge()
# Returns: ("What is 7 + 3?", "10|abc123...")

# Validate an answer
is_correct = SimpleMathCaptcha.validate_answer("10", token)
# Returns: True or False
```

### Convenience Functions

```python
from src.notehub.simple_captcha import get_captcha_question, verify_captcha_answer

# Get a question
question, token = get_captcha_question()

# Verify answer
is_correct = verify_captcha_answer(user_input, token)
```

## Examples

### Example 1: Login with Simple CAPTCHA

```
1. Visit /login
2. See: Username, Password, Security Question
3. Security Question: "What is 12 + 5?"
4. Enter username, password, and answer (17)
5. Click "Sign In"
6. Success! You're logged in
```

### Example 2: Registration with Simple CAPTCHA

```
1. Visit /register
2. Fill in username, email, password
3. Security Question: "What is 18 - 7?"
4. Enter your answer (11)
5. Click "Create Account"
6. Account created successfully
```

### Example 3: Switching CAPTCHA Types

```bash
# Development: Use simple CAPTCHA
export CAPTCHA_TYPE=simple

# Production: Use reCAPTCHA
export CAPTCHA_TYPE=recaptcha
export RECAPTCHA_SITE_KEY=prod_site_key
export RECAPTCHA_SECRET_KEY=prod_secret_key

# Testing: Disable CAPTCHA
export CAPTCHA_TYPE=none
```

## Comparison: Simple vs reCAPTCHA

| Feature | Simple CAPTCHA | Google reCAPTCHA |
|---------|---------------|------------------|
| Setup Required | None | Yes (API keys) |
| External Dependencies | None | Google service |
| Network Required | No | Yes |
| Cost | Free | Free |
| Privacy | Complete | Data sent to Google |
| Bot Protection | Basic | Advanced |
| User Friction | Low | Low |
| Accessibility | Excellent | Good |
| Offline Support | Yes | No |

## FAQ

### Q: Is simple CAPTCHA secure enough for production?

A: For most applications, yes. When combined with rate limiting and monitoring, it provides adequate protection. For high-security applications, consider reCAPTCHA.

### Q: Can I customize the math problems?

A: Currently, problems use numbers 1-20 with addition/subtraction. To customize, modify `src/notehub/simple_captcha.py`.

### Q: Does simple CAPTCHA work with screen readers?

A: Yes! It's just text, so screen readers handle it naturally.

### Q: What happens if a user enters letters instead of numbers?

A: The validation fails gracefully with an error message asking them to enter a number.

### Q: Can I use both simple CAPTCHA and reCAPTCHA?

A: No, you must choose one. Set `CAPTCHA_TYPE` to either `simple` or `recaptcha`.

## Support

For issues or questions:
- Check the [main CAPTCHA documentation](CAPTCHA_SETUP.md)
- Review [Security documentation](SECURITY.md)
- Open an issue on GitHub

---

**Last Updated**: November 2024  
**Version**: 1.0.0
