import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, password_confirm: passwordConfirm }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
            <i className="fas fa-user-plus text-3xl text-white" aria-hidden="true"></i>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            Join NoteHub and start organizing your thoughts
          </p>
        </div>

        {/* Register Card */}
        <div className="card p-6 sm:p-8 rounded-2xl shadow-xl" role="main">
          <form onSubmit={handleSubmit} className="space-y-5" aria-label="Registration form">
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

            {/* Success Alert */}
            {success && (
              <div 
                className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-sm flex items-start gap-3"
                role="alert"
                aria-live="polite"
              >
                <i className="fas fa-check-circle mt-0.5 flex-shrink-0" aria-hidden="true"></i>
                <span>{success}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label 
                htmlFor="username" 
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Username
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
                  placeholder="Choose a username (min. 3 characters)"
                  required
                  minLength={3}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Email <span className="text-[var(--text-muted)] font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fas fa-envelope text-[var(--text-muted)]" aria-hidden="true"></i>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="search-input w-full pl-11 pr-4 py-3.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                  autoComplete="email"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <i className="fas fa-info-circle" aria-hidden="true"></i>
                Email can be used for login and password recovery
              </p>
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
                  placeholder="Use at least 12 characters with mixed types"
                  required
                  minLength={12}
                  autoComplete="new-password"
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

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label 
                htmlFor="passwordConfirm" 
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fas fa-lock text-[var(--text-muted)]" aria-hidden="true"></i>
                </div>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="search-input w-full pl-11 pr-12 py-3.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                >
                  <i className={`fas fa-eye${showPasswordConfirm ? '-slash' : ''}`} aria-hidden="true"></i>
                </button>
              </div>
            </div>

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
                  <span>Creating account...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-user-plus" aria-hidden="true"></i>
                  <span>Create Account</span>
                </span>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-color)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[var(--glass-bg)] text-[var(--text-muted)]">
                  Already have an account?
                </span>
              </div>
            </div>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium text-base border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200"
            >
              <i className="fas fa-sign-in-alt" aria-hidden="true"></i>
              <span>Sign In</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-white/70 mb-2">Your personal note-taking companion</p>
          <div className="flex justify-center gap-4 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <i className="fas fa-shield-alt" aria-hidden="true"></i> Secure
            </span>
            <span className="flex items-center gap-1">
              <i className="fas fa-mobile-alt" aria-hidden="true"></i> Responsive
            </span>
            <span className="flex items-center gap-1">
              <i className="fas fa-palette" aria-hidden="true"></i> Beautiful
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
