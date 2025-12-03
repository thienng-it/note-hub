"""Flask extensions live here to avoid circular imports."""

from flask_wtf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

csrf = CSRFProtect()

# Rate limiter for attack prevention
# Uses IP address for rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",  # In-memory storage (for production, use Redis)
    strategy="fixed-window",
)

# Note: Flask-WTF's RecaptchaField is automatically configured via Flask config
# No need for a separate ReCaptcha extension initialization
