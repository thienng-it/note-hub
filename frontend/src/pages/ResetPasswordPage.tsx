import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters long');
      return;
    }

    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, password_confirm: passwordConfirm }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="glass-card p-6 sm:p-8 rounded-2xl shadow-xl text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-6">
              <i
                className="glass-i fas fa-exclamation-triangle text-3xl text-red-500"
                aria-hidden="true"
              ></i>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-[var(--text-secondary)] mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium"
            >
              <i className="glass-i fas fa-key" aria-hidden="true"></i>
              <span>Request New Reset Link</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg shadow-blue-500/30">
            <i className="glass-i fas fa-lock text-3xl text-white" aria-hidden="true"></i>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">Enter your new password</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl shadow-xl">
          {success ? (
            <div className="text-center space-y-6">
              <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/30">
                <i
                  className="glass-i fas fa-check-circle text-4xl text-green-500 mb-4"
                  aria-hidden="true"
                ></i>
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                  Password Reset Successful!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Your password has been reset. Redirecting to login...
                </p>
              </div>

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium text-base border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200"
              >
                <i className="glass-i fas fa-sign-in-alt" aria-hidden="true"></i>
                <span>Go to Login</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" aria-label="Reset password form">
              {/* Error Alert */}
              {error && (
                <div
                  className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-start gap-3"
                  role="alert"
                  aria-live="polite"
                >
                  <i
                    className="glass-i fas fa-exclamation-circle mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  ></i>
                  <span>{error}</span>
                </div>
              )}

              {/* New Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[var(--text-primary)]"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i
                      className="glass-i fas fa-lock text-[var(--text-muted)]"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input w-full pl-11 pr-12 py-3.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <i
                      className={`fas fa-eye${showPassword ? '-slash' : ''}`}
                      aria-hidden="true"
                    ></i>
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="passwordConfirm"
                  className="block text-sm font-medium text-[var(--text-primary)]"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i
                      className="glass-i fas fa-lock text-[var(--text-muted)]"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="glass-input w-full pl-11 pr-12 py-3.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your new password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                  >
                    <i
                      className={`fas fa-eye${showPasswordConfirm ? '-slash' : ''}`}
                      aria-hidden="true"
                    ></i>
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
                    <i className="glass-i fas fa-spinner fa-spin" aria-hidden="true"></i>
                    <span>Resetting...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="glass-i fas fa-check-circle" aria-hidden="true"></i>
                    <span>Reset Password</span>
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Footer Link */}
          {!success && (
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors underline-offset-4 hover:underline"
              >
                <i className="glass-i fas fa-arrow-left mr-1" aria-hidden="true"></i>
                Back to Login
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-white/70 mb-2">Your personal note-taking companion</p>
          <div className="flex justify-center gap-4 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <i className="glass-i fas fa-shield-alt" aria-hidden="true"></i> Secure
            </span>
            <span className="flex items-center gap-1">
              <i className="glass-i fas fa-mobile-alt" aria-hidden="true"></i> Responsive
            </span>
            <span className="flex items-center gap-1">
              <i className="glass-i fas fa-palette" aria-hidden="true"></i> Beautiful
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
