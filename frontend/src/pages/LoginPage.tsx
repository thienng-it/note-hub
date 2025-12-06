import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { LanguageSelector } from '../components/LanguageSelector';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

export function LoginPage() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check if Google OAuth is configured
  useEffect(() => {
    const checkGoogleOAuth = async () => {
      try {
        const response = await apiClient.get<{ enabled: boolean }>('/api/v1/auth/google/status');
        setGoogleOAuthEnabled(response.enabled);
      } catch {
        setGoogleOAuthEnabled(false);
      }
    };
    checkGoogleOAuth();
  }, []);

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
        setError(result.error || t('auth.login.loginFailed'));
      }
    } catch {
      setError(t('auth.login.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const response = await apiClient.get<{ auth_url: string }>('/api/v1/auth/google');
      const { auth_url } = response;

      // Redirect to Google OAuth
      window.location.href = auth_url;
    } catch (err) {
      logger.error('Google Sign-In error', err);
      setError(t('auth.login.googleSignInUnavailable'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-22 h-22 rounded-full mb-6 logo-gradient shadow-apple">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gradient tracking-tight">{t('app.name')}</h1>
          <p className="text-muted-glass text-lg">
            {requires2FA ? t('auth.login.title2FA') : t('auth.login.title')}
          </p>
          <div className="mt-4 flex justify-center">
            <LanguageSelector />
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-card">
          <form onSubmit={handleSubmit} aria-label="Login form">
            {/* Error Alert */}
            {error && (
              <div className="alert-glass mb-6" role="alert" aria-live="polite">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {!requires2FA ? (
              <>
                {/* Username Field */}
                <div className="mb-5">
                  <label htmlFor="username" className="form-label-glass">
                    {t('auth.login.username')}
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-input"
                    placeholder={t('auth.login.usernamePlaceholder')}
                    required
                    autoComplete="username"
                  />
                </div>

                {/* Password Field */}
                <div className="mb-6">
                  <label htmlFor="password" className="form-label-glass">
                    {t('auth.login.password')}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input pr-12"
                      placeholder={t('auth.login.passwordPlaceholder')}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-glass hover:text-gray-600 transition-colors"
                      aria-label={
                        showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')
                      }
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* 2FA Code Field */
              <div className="mb-6">
                <label htmlFor="totp" className="form-label-glass">
                  {t('auth.login.verificationCode')}
                </label>
                <input
                  id="totp"
                  name="totp"
                  type="text"
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="glass-input text-center font-mono tracking-widest text-xl"
                  placeholder={t('auth.login.verificationCodePlaceholder')}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  autoComplete="one-time-code"
                  aria-describedby="totp-hint"
                />
                <p id="totp-hint" className="flex items-center gap-2 mt-3 text-sm text-muted-glass">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t('auth.login.verificationCodeHint')}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-apple w-full py-4 mb-5"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('auth.login.signingIn')}
                </span>
              ) : (
                <span>
                  {requires2FA ? t('auth.login.verifyAndSignIn') : t('auth.login.signIn')}
                </span>
              )}
            </button>
          </form>

          {/* Google Sign-In */}
          {!requires2FA && googleOAuthEnabled && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[var(--bg-primary)] text-muted-glass">
                    {t('auth.login.orContinueWith')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-4 mb-5 flex items-center justify-center gap-3 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('auth.login.signInWithGoogle')}
              </button>
            </>
          )}

          {/* Footer Links */}
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="block mb-5 text-apple-blue hover:underline transition-colors"
            >
              {t('auth.login.forgotPassword')}
            </Link>

            <div className="border-t border-gray-200/50 my-5" />

            <p className="text-muted-glass mb-4">{t('auth.login.newToNoteHub')}</p>

            <Link to="/register" className="btn-secondary-glass w-full py-4 block">
              {t('auth.login.createAccount')}
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
              className="w-full mt-5 flex items-center justify-center gap-2 text-muted-glass hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>{t('auth.login.backToLogin')}</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-muted-glass text-sm">{t('app.tagline')}</p>
      </div>
    </div>
  );
}
