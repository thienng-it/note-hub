import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'es', name: 'Español (Spanish)' },
];

export function EditProfilePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    preferred_language: user?.preferred_language || i18n.language || 'en',
    avatar_url: user?.avatar_url || '',
    status: user?.status || 'online',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.username.length < 3) {
      setError(t('profile.usernameRequired'));
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.put('/api/v1/profile', formData);
      // Update i18n language if changed
      if (formData.preferred_language !== i18n.language) {
        await i18n.changeLanguage(formData.preferred_language);
      }
      await refreshUser();
      navigate('/profile', { state: { message: 'Profile updated successfully' } });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/profile"
          className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          aria-label={t('aria.backToProfile')}
        >
          <i className="glass-i fas fa-arrow-left mr-2" aria-hidden="true"></i>
          {t('profile.backToProfile')}
        </Link>
        <h1 className="text-3xl font-bold flex items-center text-[var(--text-primary)]">
          <i className="glass-i fas fa-edit mr-3 text-blue-600" aria-hidden="true"></i>
          {t('profile.editProfile')}
        </h1>
      </div>

      {/* Form */}
      <div className="glass-panel p-4 sm:p-6">
        {error && (
          <div
            className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
            role="alert"
          >
            <i className="glass-i fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-user mr-2" aria-hidden="true"></i>
              {t('profile.username')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="glass-input"
              placeholder={t('profile.usernamePlaceholder')}
              required
              minLength={3}
              aria-required="true"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-envelope mr-2" aria-hidden="true"></i>
              {t('profile.email')}
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="glass-input"
              placeholder={t('profile.emailPlaceholder')}
            />
            <p className="mt-2 text-sm text-[var(--text-muted)]">{t('profile.emailOptional')}</p>
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-user-circle mr-2" aria-hidden="true"></i>
              {t('profile.bio')}
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="glass-input resize-none"
              rows={4}
              placeholder={t('profile.bioPlaceholder')}
              maxLength={500}
            />
            <p className="mt-2 text-sm text-[var(--text-muted)]">{t('profile.bioOptional')}</p>
          </div>

          {/* Avatar URL */}
          <div>
            <label
              htmlFor="avatar_url"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-image mr-2" aria-hidden="true"></i>
              {t('profile.avatar')}
            </label>
            <div className="flex items-center gap-4 mb-3">
              <UserAvatar
                username={formData.username}
                avatarUrl={formData.avatar_url}
                size="xl"
                status={formData.status as 'online' | 'offline' | 'away' | 'busy'}
                showStatus={true}
              />
              <div className="flex-1">
                <input
                  type="url"
                  id="avatar_url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  placeholder={t('profile.avatarUrlPlaceholder')}
                />
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{t('profile.avatarDescription')}</p>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-circle mr-2" aria-hidden="true"></i>
              {t('profile.status')}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['online', 'away', 'busy', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({ ...formData, status })}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.status === status
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        status === 'online'
                          ? 'bg-green-500'
                          : status === 'away'
                            ? 'bg-yellow-500'
                            : status === 'busy'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {t(`chat.${status}`)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t('profile.statusDescription')}
            </p>
          </div>

          {/* Preferred Language */}
          <div>
            <label
              htmlFor="preferred_language"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="glass-i fas fa-language mr-2" aria-hidden="true"></i>
              {t('profile.language')}
            </label>
            <select
              id="preferred_language"
              value={formData.preferred_language}
              onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t('profile.languageDescription')}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <Link
              to="/profile"
              className="px-6 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:opacity-80 transition-colors"
            >
              {t('common.cancel')}
            </Link>
            <button
              type="submit"
              className="btn-primary px-6 py-2.5 rounded-lg font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="glass-i fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                  {t('profile.saving')}
                </>
              ) : (
                <>
                  <i className="glass-i fas fa-save mr-2" aria-hidden="true"></i>
                  {t('profile.saveChanges')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
