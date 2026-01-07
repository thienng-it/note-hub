import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { exportApi, notesApi } from '../api/client';
import { ConfirmModal } from '../components/Modal';
import { PasskeyManager } from '../components/PasskeyManager';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markdownFileInputRef = useRef<HTMLInputElement>(null);
  const markdownFolderInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [isMarkdownImporting, setIsMarkdownImporting] = useState(false);
  const [markdownImportMessage, setMarkdownImportMessage] = useState('');
  const [markdownImportError, setMarkdownImportError] = useState('');
  const [markdownOverwrite, setMarkdownOverwrite] = useState(false);
  const [isMarkdownFolderConfirmOpen, setIsMarkdownFolderConfirmOpen] = useState(false);
  const [pendingMarkdownFolderFiles, setPendingMarkdownFolderFiles] = useState<File[] | null>(null);

  useEffect(() => {
    const input = markdownFolderInputRef.current;
    if (!input) return;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, []);

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

  const importMarkdownFiles = async (files: File[]) => {
    setIsMarkdownImporting(true);
    setMarkdownImportMessage('');
    setMarkdownImportError('');

    try {
      const result = await notesApi.importMarkdown(files, { overwrite: markdownOverwrite });
      setMarkdownImportMessage(
        t('markdownImport.resultMessage', {
          imported: result.imported,
          updated: result.updated,
          failed: result.failed,
        }),
      );
      if (result.errors && result.errors.length > 0) {
        const first = result.errors[0];
        setMarkdownImportError(
          t('markdownImport.fileError', {
            file: first.file || t('markdownImport.file'),
            error: first.error,
          }),
        );
      }
    } catch (error) {
      setMarkdownImportError(error instanceof Error ? error.message : t('markdownImport.failed'));
    } finally {
      setIsMarkdownImporting(false);
      if (markdownFileInputRef.current) {
        markdownFileInputRef.current.value = '';
      }
      if (markdownFolderInputRef.current) {
        markdownFolderInputRef.current.value = '';
      }
    }
  };

  const handleMarkdownFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    const isFolderUpload = event.target === markdownFolderInputRef.current;
    if (isFolderUpload) {
      setMarkdownImportMessage('');
      setMarkdownImportError('');
      setPendingMarkdownFolderFiles(files);
      setIsMarkdownFolderConfirmOpen(true);
      return;
    }

    await importMarkdownFiles(files);
  };

  const handleConfirmMarkdownFolderImport = async () => {
    if (!pendingMarkdownFolderFiles || pendingMarkdownFolderFiles.length === 0) {
      setIsMarkdownFolderConfirmOpen(false);
      return;
    }

    await importMarkdownFiles(pendingMarkdownFolderFiles);
    setPendingMarkdownFolderFiles(null);
    setIsMarkdownFolderConfirmOpen(false);
  };

  const handleCloseMarkdownFolderConfirm = () => {
    if (isMarkdownImporting) return;
    setIsMarkdownFolderConfirmOpen(false);
    setPendingMarkdownFolderFiles(null);
    if (markdownFolderInputRef.current) {
      markdownFolderInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleMarkdownImportFilesClick = () => {
    markdownFileInputRef.current?.click();
  };

  const handleMarkdownImportFolderClick = () => {
    markdownFolderInputRef.current?.click();
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
        throw new Error(t('profile.invalidBackupFormat'));
      }

      const result = await exportApi.importData({
        notes: data.notes,
        tasks: data.tasks,
        overwrite: false, // Don't overwrite existing items by default
      });

      setImportMessage(
        t('profile.importSuccess', {
          notes: result.imported.notes,
          tasks: result.imported.tasks,
          skippedNotes: result.skipped.notes,
          skippedTasks: result.skipped.tasks,
        }),
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('profile.importFailed'));
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="page-padding space-y-6">
      {/* Modern Header Section */}
      <div className="modern-search-card">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="modern-icon-badge bg-gradient-to-br from-cyan-500 to-blue-600">
                <i className="fas fa-user-circle text-white"></i>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] truncate">
                {t('profile.profile')}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.has_2fa && (
            <div
              className="modern-stat-badge"
              style={{
                background: 'rgba(52, 199, 89, 0.1)',
                borderColor: 'rgba(52, 199, 89, 0.2)',
              }}
            >
              <i className="fas fa-shield-alt text-green-500 mr-2"></i>
              <span className="font-semibold">{t('profile.twoFactorEnabledBadge')}</span>
            </div>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <div className="modern-search-card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              {user.username}
            </h2>
            {user.email && (
              <p className="text-sm sm:text-base text-[var(--text-secondary)] break-all">
                <i className="glass-i fas fa-envelope mr-2"></i>
                {user.email}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-3 border-b border-[var(--border-color)] gap-1 sm:gap-4">
            <div>
              <span className="font-medium text-[var(--text-primary)] text-sm sm:text-base">
                {t('profile.userId')}
              </span>
            </div>
            <span className="text-[var(--text-secondary)] font-mono text-sm sm:text-base text-left sm:text-right">
              {user.id}
            </span>
          </div>

          {user.created_at && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-3 border-b border-[var(--border-color)] gap-1 sm:gap-4">
              <div>
                <span className="font-medium text-[var(--text-primary)] text-sm sm:text-base">
                  {t('profile.memberSince')}
                </span>
              </div>
              <span className="text-[var(--text-secondary)] text-sm sm:text-base text-left sm:text-right">
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
      <div className="modern-search-card">
        <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-3 sm:mb-4">
          <i className="glass-i fas fa-cog mr-2"></i>
          {t('profile.settings')}
        </h3>

        <div className="space-y-3 sm:space-y-4">
          {/* Theme Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-3 border-b border-[var(--border-color)] gap-2 sm:gap-4">
            <div className="flex-1">
              <span className="font-medium text-[var(--text-primary)] text-sm sm:text-base">
                {t('profile.theme')}
              </span>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                {t('profile.themeDescription')}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-secondary-glass flex items-center gap-2 px-3 sm:px-4 py-2 hover:scale-105 transition-all touch-no-select self-start sm:self-center"
            >
              <i
                className={`fas fa-${theme === 'dark' ? 'sun text-yellow-500' : 'moon text-blue-500'}`}
              ></i>
              <span className="text-[var(--text-primary)] capitalize text-sm sm:text-base">
                {theme}
              </span>
            </button>
          </div>

          {/* Edit Profile Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-3 border-b border-[var(--border-color)] gap-2 sm:gap-4">
            <div className="flex-1">
              <span className="font-medium text-[var(--text-primary)] text-sm sm:text-base">
                {t('profile.editProfile')}
              </span>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                {t('profile.languageDescription')}
              </p>
            </div>
            <Link to="/profile/edit" className="btn-apple">
              <i className="fas fa-edit mr-2"></i>
              <span className="hidden xs:inline">{t('profile.editProfile')}</span>
              <span className="xs:hidden">{t('profile.edit')}</span>
            </Link>
          </div>

          {/* Change Password Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-3 border-b border-[var(--border-color)] gap-2 sm:gap-4">
            <div className="flex-1">
              <span className="font-medium text-[var(--text-primary)] text-sm sm:text-base">
                {t('auth.login.password')}
              </span>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                {t('profile.passwordDescription')}
              </p>
            </div>
            <Link to="/profile/change-password" className="btn-apple">
              <i className="fas fa-key mr-2"></i>
              <span className="hidden xs:inline">{t('profile.changePassword')}</span>
              <span className="xs:hidden">{t('profile.change')}</span>
            </Link>
          </div>

          {/* 2FA Settings */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-3 border-b border-[var(--border-color)] gap-2 sm:gap-4">
            <div className="flex-1">
              <span className="font-medium text-[var(--text-primary)] text-sm sm:text-base">
                {t('profile.enable2FA')}
              </span>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                {user.has_2fa ? t('profile.twoFactorEnabled') : t('profile.twoFactorDisabled')}
              </p>
            </div>
            {user.has_2fa ? (
              <Link
                to="/profile/2fa/disable"
                className="btn-apple self-start sm:self-center"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
              >
                <i className="fas fa-shield-alt mr-2"></i>
                <span className="hidden xs:inline">{t('profile.disable2FA')}</span>
                <span className="xs:hidden">{t('profile.disable')}</span>
              </Link>
            ) : (
              <Link
                to="/profile/2fa/setup"
                className="btn-apple self-start sm:self-center"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
              >
                <i className="fas fa-shield-alt mr-2"></i>
                <span className="hidden xs:inline">{t('profile.setup2FA')}</span>
                <span className="xs:hidden">{t('profile.setup')}</span>
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
      <div className="modern-search-card">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          <i className="glass-i fas fa-file-export mr-2 text-purple-600"></i>
          {t('profile.dataManagement')}
        </h3>

        <div className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
            <div className="flex-1">
              <span className="font-medium text-[var(--text-primary)]">
                {t('profile.exportData')}
              </span>
              <p className="text-sm text-[var(--text-muted)]">{t('profile.exportDescription')}</p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="btn-apple disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <i className="glass-i fas fa-spinner fa-spin mr-2"></i>
                  {t('profile.exporting')}
                </>
              ) : (
                <>
                  <i className="glass-i fas fa-download mr-2"></i>
                  {t('profile.export')}
                </>
              )}
            </button>
          </div>

          {/* Import Data */}
          <div className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <span className="font-medium text-[var(--text-primary)]">
                  {t('profile.importData')}
                </span>
                <p className="text-sm text-[var(--text-muted)]">{t('profile.importDescription')}</p>
              </div>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
                className="btn-apple disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
              >
                {isImporting ? (
                  <>
                    <i className="glass-i fas fa-spinner fa-spin mr-2"></i>
                    {t('profile.importing')}
                  </>
                ) : (
                  <>
                    <i className="glass-i fas fa-upload mr-2"></i>
                    {t('profile.import')}
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

          <div className="py-3 border-t border-[var(--border-color)]">
            <div className="flex flex-col gap-3 mb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex-1">
                  <span className="font-medium text-[var(--text-primary)] text-sm sm:text-base">
                    {t('markdownImport.sectionTitle')}
                  </span>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                    {t('markdownImport.sectionDescription')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkdownImportFilesClick}
                    disabled={isMarkdownImporting}
                    className="btn-apple disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                  >
                    {isMarkdownImporting ? (
                      <>
                        <i className="glass-i fas fa-spinner fa-spin mr-2"></i>
                        {t('markdownImport.importing')}
                      </>
                    ) : (
                      <>
                        <i className="glass-i fas fa-file-alt mr-2"></i>
                        {t('markdownImport.file')}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkdownImportFolderClick}
                    disabled={isMarkdownImporting}
                    className="btn-apple disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                  >
                    {isMarkdownImporting ? (
                      <>
                        <i className="glass-i fas fa-spinner fa-spin mr-2"></i>
                        {t('markdownImport.importing')}
                      </>
                    ) : (
                      <>
                        <i className="glass-i fas fa-folder-open mr-2"></i>
                        {t('markdownImport.folder')}
                      </>
                    )}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={markdownOverwrite}
                  onChange={(e) => setMarkdownOverwrite(e.target.checked)}
                  disabled={isMarkdownImporting}
                  className="w-4 h-4"
                />
                <span>{t('markdownImport.overwrite')}</span>
              </label>
              <input
                ref={markdownFileInputRef}
                type="file"
                accept="text/markdown,.md,.markdown"
                multiple
                onChange={handleMarkdownFilesChange}
                className="hidden"
              />
              <input
                ref={markdownFolderInputRef}
                type="file"
                multiple
                onChange={handleMarkdownFilesChange}
                className="hidden"
              />
            </div>
            {markdownImportMessage && (
              <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
                <i className="glass-i fas fa-check-circle mr-2"></i>
                {markdownImportMessage}
              </div>
            )}
            {markdownImportError && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">
                <i className="glass-i fas fa-exclamation-circle mr-2"></i>
                {markdownImportError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="modern-search-card">
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

      <ConfirmModal
        isOpen={isMarkdownFolderConfirmOpen}
        onClose={handleCloseMarkdownFolderConfirm}
        onConfirm={handleConfirmMarkdownFolderImport}
        title={t('markdownImport.confirmFolderTitle')}
        message={t('markdownImport.confirmFolderMessage', {
          count: pendingMarkdownFolderFiles?.length || 0,
        })}
        confirmText={t('markdownImport.confirmFolderConfirm')}
        cancelText={t('common.cancel')}
        variant="warning"
        isLoading={isMarkdownImporting}
      />
    </div>
  );
}
