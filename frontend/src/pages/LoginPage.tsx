import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login({
        username,
        password,
        ...(requires2FA && { totp_code: totpCode }),
      });

      if (result.success) {
        navigate('/');
      } else if (result.requires2FA) {
        setRequires2FA(true);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 py-5">
      <div className="w-100" style={{ maxWidth: '440px' }}>
        {/* Logo and Header */}
        <div className="text-center mb-5">
          <div 
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-4"
            style={{
              width: '88px',
              height: '88px',
              background: 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)',
              boxShadow: '0 12px 40px rgba(0, 122, 255, 0.4)'
            }}
          >
            <i className="fas fa-sticky-note text-white" style={{ fontSize: '2rem' }} aria-hidden="true"></i>
          </div>
          <h1 
            className="fw-bold mb-2 text-gradient"
            style={{ fontSize: '2.5rem', letterSpacing: '-0.03em' }}
          >
            NoteHub
          </h1>
          <p className="text-muted-glass" style={{ fontSize: '1.1rem' }}>
            {requires2FA ? 'Two-Factor Authentication' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card" role="main">
          <form onSubmit={handleSubmit} aria-label="Login form">
            {/* Error Alert */}
            {error && (
              <div className="alert-glass mb-4" role="alert" aria-live="polite">
                <i className="fas fa-exclamation-circle mt-1" aria-hidden="true"></i>
                <span>{error}</span>
              </div>
            )}

            {!requires2FA ? (
              <>
                {/* Username Field */}
                <div className="mb-4">
                  <label htmlFor="username" className="form-label-glass">
                    Username or Email
                  </label>
                  <div className="position-relative">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="glass-input ps-5"
                      placeholder="Enter your username or email"
                      required
                      autoFocus
                      autoComplete="username"
                      aria-describedby="username-hint"
                    />
                    <i 
                      className="fas fa-user position-absolute text-muted-glass"
                      style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }}
                      aria-hidden="true"
                    ></i>
                  </div>
                </div>

                {/* Password Field */}
                <div className="mb-4">
                  <label htmlFor="password" className="form-label-glass">
                    Password
                  </label>
                  <div className="position-relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input ps-5 pe-5"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <i 
                      className="fas fa-lock position-absolute text-muted-glass"
                      style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }}
                      aria-hidden="true"
                    ></i>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="btn btn-link position-absolute p-0 text-muted-glass"
                      style={{ right: '16px', top: '50%', transform: 'translateY(-50%)', border: 'none', textDecoration: 'none' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`fas fa-eye${showPassword ? '-slash' : ''}`} aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* 2FA Code Field */
              <div className="mb-4">
                <label htmlFor="totp" className="form-label-glass">
                  Verification Code
                </label>
                <div className="position-relative">
                  <input
                    id="totp"
                    name="totp"
                    type="text"
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="glass-input ps-5 text-center font-monospace"
                    style={{ letterSpacing: '0.5em' }}
                    placeholder="000000"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    aria-describedby="totp-hint"
                  />
                  <i 
                    className="fas fa-shield-alt position-absolute text-muted-glass"
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }}
                    aria-hidden="true"
                  ></i>
                </div>
                <small id="totp-hint" className="d-flex align-items-center gap-2 mt-2 text-muted-glass">
                  <i className="fas fa-info-circle" aria-hidden="true"></i>
                  Enter the 6-digit code from your authenticator app
                </small>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-apple w-100 py-3 mb-4"
              style={{ fontSize: '1rem' }}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <i className={`fas fa-${requires2FA ? 'shield-alt' : 'sign-in-alt'}`} aria-hidden="true"></i>
                  <span>{requires2FA ? 'Verify & Sign In' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="d-block mb-4 text-decoration-none"
              style={{ color: 'var(--apple-blue)' }}
            >
              Forgot your password?
            </Link>
            
            <hr className="my-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
            
            <p className="text-muted-glass mb-3">New to NoteHub?</p>

            <Link
              to="/register"
              className="btn-secondary-glass w-100 py-3 text-decoration-none"
            >
              <i className="fas fa-user-plus" aria-hidden="true"></i>
              <span>Create an account</span>
            </Link>
          </div>

          {/* Back to Login (for 2FA) */}
          {requires2FA && (
            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setTotpCode('');
                setError('');
              }}
              className="btn btn-link w-100 mt-4 d-flex align-items-center justify-content-center gap-2 text-muted-glass text-decoration-none"
            >
              <i className="fas fa-arrow-left" aria-hidden="true"></i>
              <span>Back to login</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-muted-glass" style={{ fontSize: '0.9rem' }}>
          Secure note-taking for everyone
        </p>
      </div>
    </div>
  );
}
