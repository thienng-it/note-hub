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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg shadow-blue-500/30">
            <i className="fas fa-sticky-note text-3xl text-white" aria-hidden="true"></i>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            NoteHub
          </h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            {requires2FA ? 'Two-Factor Authentication' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-6 sm:p-8 rounded-2xl shadow-xl" role="main">
          <form onSubmit={handleSubmit} className="space-y-6" aria-label="Login form">
            {/* Error Alert */}
            {error && (
              <div 
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-start gap-3"
                role="alert"
                aria-live="polite"
              >
                <i className="fas fa-exclamation-circle mt-0.5 flex-shrink-0" aria-hidden="true"></i>
                <span>{error}</span>
              </div>
            )}

            {!requires2FA ? (
              <>
                {/* Username Field */}
                <div className="space-y-2">
                  <label 
                    htmlFor="username" 
                    className="block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Username or Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="fas fa-user text-[var(--text-muted)]" aria-hidden="true"></i>
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="search-input w-full pl-11 pr-4 py-3.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your username or email"
                      required
                      autoFocus
                      autoComplete="username"
                      aria-describedby="username-hint"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label 
                    htmlFor="password" 
                    className="block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="fas fa-lock text-[var(--text-muted)]" aria-hidden="true"></i>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="search-input w-full pl-11 pr-12 py-3.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`fas fa-eye${showPassword ? '-slash' : ''}`} aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* 2FA Code Field */
              <div className="space-y-2">
                <label 
                  htmlFor="totp" 
                  className="block text-sm font-medium text-[var(--text-primary)]"
                >
                  Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fas fa-shield-alt text-[var(--text-muted)]" aria-hidden="true"></i>
                  </div>
                  <input
                    id="totp"
                    name="totp"
                    type="text"
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="search-input w-full pl-11 pr-4 py-3.5 rounded-xl text-base text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000000"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    aria-describedby="totp-hint"
                  />
                </div>
                <p id="totp-hint" className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <i className="fas fa-info-circle" aria-hidden="true"></i>
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 rounded-xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                  <span>Signing in...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className={`fas fa-${requires2FA ? 'shield-alt' : 'sign-in-alt'}`} aria-hidden="true"></i>
                  <span>{requires2FA ? 'Verify & Sign In' : 'Sign In'}</span>
                </span>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-4">
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-color)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[var(--glass-bg)] text-[var(--text-muted)]">
                  New to NoteHub?
                </span>
              </div>
            </div>

            <Link
              to="/register"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium text-base border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200"
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
              className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <i className="fas fa-arrow-left" aria-hidden="true"></i>
              <span>Back to login</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-white/70">
          Secure note-taking for everyone
        </p>
      </div>
    </div>
  );
}
