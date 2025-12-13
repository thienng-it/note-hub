import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';

export function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [step, setStep] = useState<'username' | '2fa' | 'success'>('username');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  const handleSubmitUsername = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authApi.forgotPassword(username);

      if (data.requires_2fa) {
        setStep('2fa');
      } else if (data.reset_token) {
        setResetToken(data.reset_token);
        setStep('success');
      } else {
        // Token will be in server logs
        setStep('success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit2FA = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authApi.forgotPasswordVerify2FA(username, totpCode);

      if (data.reset_token) {
        setResetToken(data.reset_token);
      }
      setStep('success');
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
            <i className="glass-i fas fa-key text-3xl text-white" aria-hidden="true"></i>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Forgot Password
          </h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            {step === 'username' && 'Enter your username or email to reset your password'}
            {step === '2fa' && 'Enter your 2FA verification code'}
            {step === 'success' && 'Password reset initiated'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8">
          {/* Error Alert */}
          {error && (
            <div
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-start gap-3"
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

          {step === 'username' && (
            <form
              onSubmit={handleSubmitUsername}
              className="space-y-6"
              aria-label="Forgot password form"
            >
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
                    <i
                      className="glass-i fas fa-user text-[var(--text-muted)]"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-input w-full pl-11 pr-4 py-3.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your username or email"
                    required
                    autoComplete="username"
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <i className="glass-i fas fa-info-circle" aria-hidden="true"></i>
                  Enter the username or email associated with your account
                </p>
              </div>

              {/* Info Box */}
              <div className="btn-apple p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm">
                <i className="glass-i fas fa-info-circle mr-2" aria-hidden="true"></i>
                If 2FA is enabled, you will be asked to verify it in the next step.
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
                    <span>Processing...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="glass-i fas fa-arrow-right" aria-hidden="true"></i>
                    <span>Next</span>
                  </span>
                )}
              </button>
            </form>
          )}

          {step === '2fa' && (
            <form
              onSubmit={handleSubmit2FA}
              className="space-y-6"
              aria-label="2FA verification form"
            >
              {/* 2FA Code Field */}
              <div className="space-y-2">
                <label
                  htmlFor="totp"
                  className="block text-sm font-medium text-[var(--text-primary)]"
                >
                  Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i
                      className="glass-i fas fa-shield-alt text-[var(--text-muted)]"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <input
                    id="totp"
                    name="totp"
                    type="text"
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="glass-input w-full pl-11 pr-4 py-3.5 rounded-xl text-base text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000000"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    autoComplete="one-time-code"
                  />
                </div>
                <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <i className="glass-i fas fa-info-circle" aria-hidden="true"></i>
                  Enter the 6-digit code from your authenticator app
                </p>
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
                    <span>Verifying...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="glass-i fas fa-shield-alt" aria-hidden="true"></i>
                    <span>Verify</span>
                  </span>
                )}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => {
                  setStep('username');
                  setTotpCode('');
                  setError('');
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <i className="glass-i fas fa-arrow-left" aria-hidden="true"></i>
                <span>Back</span>
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/30">
                <i
                  className="glass-i fas fa-check-circle text-4xl text-green-500 mb-4"
                  aria-hidden="true"
                ></i>
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                  Reset Token Generated
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {resetToken ? (
                    <>Your reset token is ready. Click below to reset your password.</>
                  ) : (
                    <>Please check your application server logs to retrieve the secure token.</>
                  )}
                </p>
              </div>

              {resetToken && (
                <button
                  type="button"
                  onClick={() => navigate(`/reset-password?token=${resetToken}`)}
                  className="btn-primary w-full py-4 rounded-xl font-semibold text-base transition-all duration-200"
                >
                  <span className="flex items-center justify-center gap-2">
                    <i className="glass-i fas fa-lock" aria-hidden="true"></i>
                    <span>Reset Password</span>
                  </span>
                </button>
              )}

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium text-base border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200"
              >
                <i className="glass-i fas fa-arrow-left" aria-hidden="true"></i>
                <span>Back to Login</span>
              </Link>
            </div>
          )}

          {/* Footer Link */}
          {step !== 'success' && (
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
        <p className="mt-8 text-center text-sm text-white/70">Secure password recovery</p>
      </div>
    </div>
  );
}
