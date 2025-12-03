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
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-22 h-22 rounded-full mb-6 logo-gradient shadow-apple">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gradient tracking-tight">
            NoteHub
          </h1>
          <p className="text-muted-glass text-lg">
            {requires2FA ? 'Two-Factor Authentication' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card" role="main">
          <form onSubmit={handleSubmit} aria-label="Login form">
            {/* Error Alert */}
            {error && (
              <div className="alert-glass mb-6" role="alert" aria-live="polite">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {!requires2FA ? (
              <>
                {/* Username Field */}
                <div className="mb-5">
                  <label htmlFor="username" className="form-label-glass">
                    Username or Email
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-input"
                    placeholder="Enter your username or email"
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>

                {/* Password Field */}
                <div className="mb-6">
                  <label htmlFor="password" className="form-label-glass">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input pr-12"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-glass hover:text-gray-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
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
                  Verification Code
                </label>
                <input
                  id="totp"
                  name="totp"
                  type="text"
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="glass-input text-center font-mono tracking-widest text-xl"
                  placeholder="000000"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  aria-describedby="totp-hint"
                />
                <p id="totp-hint" className="flex items-center gap-2 mt-3 text-sm text-muted-glass">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                  Enter the 6-digit code from your authenticator app
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span>{requires2FA ? 'Verify & Sign In' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="block mb-5 text-apple-blue hover:underline transition-colors"
            >
              Forgot your password?
            </Link>
            
            <div className="border-t border-gray-200/50 my-5" />
            
            <p className="text-muted-glass mb-4">New to NoteHub?</p>

            <Link
              to="/register"
              className="btn-secondary-glass w-full py-4 block"
            >
              Create an account
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              <span>Back to login</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-muted-glass text-sm">
          Secure note-taking for everyone
        </p>
      </div>
    </div>
  );
}
