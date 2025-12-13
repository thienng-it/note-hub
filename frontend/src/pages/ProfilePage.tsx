import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { exportApi } from '../api/client';
import { PasskeyManager } from '../components/PasskeyManager';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');

  if (!user) {
    return null;
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportApi.exportData();

      // Create a JSON file and download it
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notehub-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage('');
    setImportError('');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.notes && !data.tasks) {
        throw new Error('Invalid backup file format');
      }

      const result = await exportApi.importData({
        notes: data.notes,
        tasks: data.tasks,
        overwrite: false, // Don't overwrite existing items by default
      });

      setImportMessage(
        `Successfully imported ${result.imported.notes} notes and ${result.imported.tasks} tasks. ` +
          `Skipped ${result.skipped.notes} existing notes and ${result.skipped.tasks} existing tasks.`,
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold flex items-center text-[var(--text-primary)]">
        <i className="glass-i fas fa-user-circle mr-3 text-blue-600"></i>
        Profile
      </h1>

      {/* User Info Card */}
      <div className="glass-panel-elevated p-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{user.username}</h2>
            {user.email && (
              <p className="text-[var(--text-secondary)]">
                <i className="glass-i fas fa-envelope mr-2"></i>
                {user.email}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
            <div>
              <span className="font-medium text-[var(--text-primary)]">{t('profile.userId')}</span>
              <p className="text-sm text-[var(--text-muted)]">{t('profile.userIdDescription')}</p>
            </div>
            <span className="text-[var(--text-secondary)] font-mono">{user.id}</span>
          </div>

          {user.created_at && (
            <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
              <div>
                <span className="font-medium text-[var(--text-primary)]">
                  {t('profile.memberSince')}
                </span>
                <p className="text-sm text-[var(--text-muted)]">
                  {t('profile.memberSinceDescription')}
                </p>
              </div>
              <span className="text-[var(--text-secondary)]">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Card */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          <i className="glass-i fas fa-cog mr-2"></i>
          {t('profile.settings')}
        </h3>

        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
            <div>
              <span className="font-medium text-[var(--text-primary)]">{t('profile.theme')}</span>
              <p className="text-sm text-[var(--text-muted)]">{t('profile.themeDescription')}</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="glass-card flex items-center gap-2 px-4 py-2 hover:scale-105 transition-all"
            >
              <i
                className={`fas fa-${theme === 'dark' ? 'sun text-yellow-500' : 'moon text-blue-500'}`}
              ></i>
              <span className="text-[var(--text-primary)] capitalize">{theme}</span>
            </button>
          </div>

          {/* Edit Profile Link */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
            <div>
              <span className="font-medium text-[var(--text-primary)]">
                {t('profile.editProfile')}
              </span>
              <p className="text-sm text-[var(--text-muted)]">{t('profile.languageDescription')}</p>
            </div>
            <Link
              to="/profile/edit"
              className="btn-apple px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              <i className="glass-i fas fa-edit mr-2"></i>
              {t('profile.editProfile')}
            </Link>
          </div>

          {/* Change Password Link */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
            <div>
              <span className="font-medium text-[var(--text-primary)]">
                {t('auth.login.password')}
              </span>
              <p className="text-sm text-[var(--text-muted)]">{t('profile.passwordDescription')}</p>
            </div>
            <Link
              to="/profile/change-password"
              className="btn-apple px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              <i className="glass-i fas fa-key mr-2"></i>
              {t('profile.changePassword')}
            </Link>
          </div>

          {/* 2FA Settings */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
            <div>
              <span className="font-medium text-[var(--text-primary)]">
                {t('profile.enable2FA')}
              </span>
              <p className="text-sm text-[var(--text-muted)]">
                {user.has_2fa ? t('profile.twoFactorEnabled') : t('profile.twoFactorDisabled')}
              </p>
            </div>
            {user.has_2fa ? (
              <Link
                to="/profile/2fa/disable"
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors inline-flex items-center"
              >
                <i className="glass-i fas fa-shield-alt mr-2"></i>
                {t('profile.disable2FA')}
              </Link>
            ) : (
              <Link
                to="/profile/2fa/setup"
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors inline-flex items-center"
              >
                <i className="glass-i fas fa-shield-alt mr-2"></i>
                {t('profile.setup2FA')}
              </Link>
            )}
          </div>

          {/* Passkey Management */}
          <div className="py-3">
            <PasskeyManager />
          </div>
        </div>
      </div>

      {/* Export/Import Data Card */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          <i className="glass-i fas fa-file-export mr-2 text-purple-600"></i>
          Data Management
        </h3>

        <div className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
            <div className="flex-1">
              <span className="font-medium text-[var(--text-primary)]">Export Data</span>
              <p className="text-sm text-[var(--text-muted)]">
                Download all your notes and tasks as a JSON file
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <i className="glass-i fas fa-spinner fa-spin mr-2"></i>
                  Exporting...
                </>
              ) : (
                <>
                  <i className="glass-i fas fa-download mr-2"></i>
                  Export
                </>
              )}
            </button>
          </div>

          {/* Import Data */}
          <div className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <span className="font-medium text-[var(--text-primary)]">Import Data</span>
                <p className="text-sm text-[var(--text-muted)]">
                  Upload a backup file to restore your notes and tasks
                </p>
              </div>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <i className="glass-i fas fa-spinner fa-spin mr-2"></i>
                    Importing...
                  </>
                ) : (
                  <>
                    <i className="glass-i fas fa-upload mr-2"></i>
                    Import
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {importMessage && (
              <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
                <i className="glass-i fas fa-check-circle mr-2"></i>
                {importMessage}
              </div>
            )}
            {importError && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">
                <i className="glass-i fas fa-exclamation-circle mr-2"></i>
                {importError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          <i className="glass-i fas fa-shield-alt mr-2 text-green-600"></i>
          {t('profile.securityTips')}
        </h3>

        <ul className="space-y-3 text-[var(--text-secondary)]">
          <li className="flex items-start gap-3">
            <i className="glass-i fas fa-check-circle text-green-500 mt-1"></i>
            <span>{t('profile.securityTip1')}</span>
          </li>
          <li className="flex items-start gap-3">
            <i className="glass-i fas fa-check-circle text-green-500 mt-1"></i>
            <span>{t('profile.securityTip2')}</span>
          </li>
          <li className="flex items-start gap-3">
            <i className="glass-i fas fa-check-circle text-green-500 mt-1"></i>
            <span>{t('profile.securityTip3')}</span>
          </li>
          <li className="flex items-start gap-3">
            <i className="glass-i fas fa-check-circle text-green-500 mt-1"></i>
            <span>{t('profile.securityTip4')}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
