import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function Disable2FAPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (totpCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/auth/2fa/disable', {
        totp_code: totpCode,
      });
      // Refresh user data to update has_2fa status
      await refreshUser();
      navigate('/profile', { state: { message: 'Two-factor authentication disabled' } });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable 2FA';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="glass-card p-8 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
              <i className="glass-i fas fa-shield-alt text-3xl text-yellow-600 dark:text-yellow-400" aria-hidden="true"></i>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
              Disable Two-Factor Authentication
            </h1>
            <p className="text-[var(--text-secondary)]">
              Enter your current 2FA code to disable two-factor authentication
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
              role="alert"
            >
              <i className="glass-i fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Warning Message */}
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex items-start">
              <i className="glass-i fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400 mr-3 mt-1" aria-hidden="true"></i>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p className="font-semibold mb-1">Security Warning</p>
                <p>
                  Disabling 2FA will make your account less secure. You will only need your password to log in.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 2FA Code Input */}
            <div>
              <label
                htmlFor="totp_code"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                Verification Code
              </label>
              <input
                type="text"
                id="totp_code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                autoFocus
              />
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                <i className="glass-i fas fa-info-circle mr-1" aria-hidden="true"></i>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="glass-i fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                    Disabling...
                  </>
                ) : (
                  <>
                    <i className="glass-i fas fa-shield-alt mr-2" aria-hidden="true"></i>
                    Disable 2FA
                  </>
                )}
              </button>
              <Link
                to="/profile"
                className="flex-1 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] py-3 px-4 rounded-lg font-medium hover:opacity-80 transition-colors text-center flex items-center justify-center"
              >
                <i className="glass-i fas fa-times mr-2" aria-hidden="true"></i>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
