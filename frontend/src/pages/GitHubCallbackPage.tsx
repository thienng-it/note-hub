import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

export function GitHubCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth errors
      if (errorParam) {
        logger.error('GitHub OAuth error', { error: errorParam, description: errorDescription });
        setError(errorDescription || errorParam);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Validate required parameters
      if (!code) {
        setError('Missing authorization code');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Exchange code for tokens
        await authApi.githubCallback(code, state || '');

        // Refresh user context
        await refreshUser();

        // Redirect to home
        navigate('/');
      } catch (err) {
        logger.error('GitHub callback error', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="glass-card p-8 rounded-2xl text-center max-w-md w-full">
        {error ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
              <i className="fas fa-exclamation-circle text-3xl text-red-500" aria-hidden="true"></i>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              Authentication Failed
            </h1>
            <p className="text-[var(--text-secondary)] mb-4">{error}</p>
            <p className="text-sm text-[var(--text-muted)]">{t('common.redirectingToLogin')}</p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
              <i className="fas fa-spinner fa-spin text-3xl text-blue-500" aria-hidden="true"></i>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              Authenticating with GitHub
            </h1>
            <p className="text-[var(--text-secondary)]">
              Please wait while we complete your sign-in...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
