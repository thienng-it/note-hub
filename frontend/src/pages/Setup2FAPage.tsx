import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

export function Setup2FAPage() {
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showQR, setShowQR] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      const data = await apiClient.get<{ qr_code: string; secret: string }>('/api/user/2fa/setup');
      setQrCode(data.qr_code);
      setSecret(data.secret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load 2FA setup';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (totpCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/user/2fa/enable', {
        secret,
        totp_code: totpCode,
      });
      navigate('/profile', { state: { message: 'Two-factor authentication enabled successfully' } });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable 2FA';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      // Could add a toast notification here
    } catch {
      // Fallback for older browsers that don't support the Clipboard API
      // Note: execCommand('copy') is deprecated but provides necessary fallback for IE11 and older browsers
      const textArea = document.createElement('textarea');
      textArea.value = secret;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const refreshSecret = () => {
    if (window.confirm('Generate a new QR code? The current one will be discarded.')) {
      setIsLoading(true);
      fetchSetupData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4" aria-hidden="true"></i>
          <p className="text-[var(--text-secondary)]">Loading 2FA setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/profile"
          className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          aria-label="Back to Profile"
        >
          <i className="fas fa-arrow-left mr-2" aria-hidden="true"></i>
          Back to Profile
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center text-[var(--text-primary)]">
          <i className="fas fa-shield-alt mr-3 text-blue-600" aria-hidden="true"></i>
          Setup Two-Factor Authentication
        </h1>
      </div>

      <div className="glass-card p-6 rounded-xl">
        {error && (
          <div
            className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
            role="alert"
          >
            <i className="fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Toggle Buttons */}
        <div className="flex justify-center mb-6 bg-[var(--bg-tertiary)] rounded-lg p-1">
          <button
            type="button"
            onClick={() => setShowQR(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
              showQR
                ? 'bg-[var(--bg-secondary)] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <i className="fas fa-qrcode mr-2" aria-hidden="true"></i>
            QR Code
          </button>
          <button
            type="button"
            onClick={() => setShowQR(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
              !showQR
                ? 'bg-[var(--bg-secondary)] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <i className="fas fa-key mr-2" aria-hidden="true"></i>
            Secret Key
          </button>
        </div>

        {/* QR Code View */}
        {showQR ? (
          <div className="text-center mb-6">
            <p className="mb-4 text-[var(--text-secondary)]">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, or Microsoft Authenticator).
            </p>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-lg border border-[var(--border-color)] shadow-sm">
                <img
                  src={`data:image/png;base64,${qrCode}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Secret Key View */
          <div className="text-center mb-6">
            <p className="mb-4 text-[var(--text-secondary)]">
              If you can't scan the QR code, enter this secret key manually into your authenticator app.
            </p>
            <div className="mb-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
              <code className="text-lg font-mono text-[var(--text-primary)] break-all select-all">
                {secret}
              </code>
            </div>
            <button
              type="button"
              onClick={copySecret}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <i className="fas fa-copy mr-2" aria-hidden="true"></i>
              Copy Secret Key
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="totp_code"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              Enter the 6-digit verification code from your authenticator app
            </label>
            <input
              type="text"
              id="totp_code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)] text-center text-xl tracking-widest font-mono"
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary flex-1 py-3 px-4 rounded-lg font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                  Enabling...
                </>
              ) : (
                <>
                  <i className="fas fa-shield-alt mr-2" aria-hidden="true"></i>
                  Enable 2FA
                </>
              )}
            </button>
            <button
              type="button"
              onClick={refreshSecret}
              className="py-3 px-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg font-medium transition-colors duration-200"
              title="Generate new QR code"
            >
              <i className="fas fa-sync-alt" aria-hidden="true"></i>
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <i className="fas fa-info-circle mr-2" aria-hidden="true"></i>
            <strong>Tip:</strong> After enabling 2FA, you'll need to enter a code from your authenticator app each time you log in.
          </p>
        </div>
      </div>
    </div>
  );
}
