import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

// Constants for localStorage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'notehub_access_token',
  REFRESH_TOKEN: 'notehub_refresh_token',
  USER: 'notehub_user',
} as const;

export function GoogleCallbackPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Google authentication was cancelled or failed');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        const response = await apiClient.post<{
          access_token: string;
          refresh_token: string;
          user: { id: number; username: string; email: string };
        }>('/api/v1/auth/google/callback', { code });
        const { access_token, refresh_token, user } = response;

        // Store tokens using constants
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

        // Refresh the AuthContext to update the user state
        await refreshUser();

        // Redirect to home
        navigate('/', { replace: true });
      } catch (err) {
        logger.error('Google callback error', err);
        setError('Failed to complete Google sign-in');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="glass-card p-8 rounded-2xl shadow-xl text-center">
          {error ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <i
                  className="glass-i fas fa-exclamation-circle text-3xl text-red-600 dark:text-red-400"
                  aria-hidden="true"
                ></i>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Authentication Failed
              </h1>
              <p className="text-[var(--text-secondary)] mb-4">{error}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {t('common.redirectingToLoginPage')}
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <i
                  className="glass-i fas fa-spinner fa-spin text-3xl text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                ></i>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Signing you in...
              </h1>
              <p className="text-[var(--text-secondary)]">{t('common.completingGoogleAuth')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
