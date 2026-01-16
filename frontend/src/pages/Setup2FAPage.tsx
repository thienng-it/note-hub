import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ConfirmModal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export function Setup2FAPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showQR, setShowQR] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSetupData = useCallback(async () => {
    try {
      const data = await apiClient.get<{ qr_code: string; secret: string }>(
        '/api/v1/auth/2fa/setup',
      );
      setQrCode(data.qr_code);
      setSecret(data.secret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load 2FA setup';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetupData();
  }, [fetchSetupData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (totpCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/v1/auth/2fa/enable', {
        secret,
        totp_code: totpCode,
      });
      // Refresh user data to update has_2fa status
      await refreshUser();
      navigate('/profile', {
        state: { message: 'Two-factor authentication enabled successfully' },
      });
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
    setShowRefreshModal(true);
  };

  const handleRefreshConfirm = async () => {
    setIsRefreshing(true);
    setIsLoading(true);
    await fetchSetupData();
    setShowRefreshModal(false);
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <i
            className="glass-i fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"
            aria-hidden="true"
          ></i>
          <p className="text-[var(--text-secondary)]">{t('common.loading2FASetup')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start sm:items-center justify-center page-padding py-10 sm:py-12">
      <div className="w-full max-w-md sm:max-w-lg">
        {/* Header */}
        <div className="mb-8 sm:mb-12 text-center">
          <Link
            to="/profile"
            className="inline-flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4 text-sm"
            aria-label="Back to Profile"
          >
            <i className="glass-i fas fa-arrow-left mr-2" aria-hidden="true"></i>
            {t('common.backToProfile')}
          </Link>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center justify-center gap-3 text-[var(--text-primary)]">
            <i className="glass-i fas fa-shield-alt text-blue-600" aria-hidden="true"></i>
            <span>{t('2fa.setupTitle')}</span>
          </h1>
        </div>

        <div className="glass-card p-6 sm:p-8 md:p-10 rounded-xl">
          {error && (
            <div
              className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
              role="alert"
            >
              <i className="glass-i fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Toggle Buttons */}
          <div className="flex justify-center mb-10 bg-[var(--bg-tertiary)] rounded-lg p-1">
            <button
              type="button"
              onClick={() => setShowQR(true)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                showQR
                  ? 'bg-[var(--bg-secondary)] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <i className="glass-i fas fa-qrcode mr-2" aria-hidden="true"></i>
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
              <i className="glass-i fas fa-key mr-2" aria-hidden="true"></i>
              Secret Key
            </button>
          </div>

          {/* QR Code View */}
          {showQR ? (
            <div className="text-center mb-10">
              <p className="mb-4 text-[var(--text-secondary)]">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, or
                Microsoft Authenticator).
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
            <div className="text-center mb-10">
              <p className="mb-4 text-[var(--text-secondary)]">
                {t('2fa.manualEntryInstructions')}
                app.
              </p>
              <div className="mb-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                <code className="text-lg font-mono text-[var(--text-primary)] break-all select-all">
                  {secret}
                </code>
              </div>
              <button
                type="button"
                onClick={copySecret}
                className="btn-apple inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <i className="glass-i fas fa-copy mr-2" aria-hidden="true"></i>
                Copy Secret Key
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="mb-6">
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
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="btn-primary flex-1 py-3 px-4 rounded-lg font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="glass-i fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                    Enabling...
                  </>
                ) : (
                  <>
                    <i className="glass-i fas fa-shield-alt mr-2" aria-hidden="true"></i>
                    Enable 2FA
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={refreshSecret}
                className="py-3 px-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg font-medium transition-colors duration-200"
                title={t('common.generateNewQRTitle')}
              >
                <i className="glass-i fas fa-sync-alt" aria-hidden="true"></i>
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-10 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <i
                className="glass-i fas fa-info-circle text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              ></i>
              <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                <strong className="font-semibold">{t('common.tip')}</strong>{' '}
                {t(
                  '2fa.tipDescription',
                  "After enabling 2FA, you'll need to enter a code from your authenticator app each time you log in.",
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Refresh Confirmation Modal */}
        <ConfirmModal
          isOpen={showRefreshModal}
          onClose={() => setShowRefreshModal(false)}
          onConfirm={handleRefreshConfirm}
          title={t('setup2fa.generateNewQRTitle')}
          message={t('setup2fa.generateNewQRMessage')}
          confirmText={t('common.confirm')}
          cancelText={t('common.cancel')}
          variant="warning"
          isLoading={isRefreshing}
        />
      </div>
    </div>
  );
}
