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
    <div className="page-padding">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mx-auto">
        {/* LEFT COLUMN: Profile Hero */}
        <div className="lg:col-span-1 space-y-6">
          <div className="modern-search-card sticky top-6">
            <div className="flex flex-col items-center text-center p-4">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-5xl font-bold shadow-xl ring-4 ring-white/10">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                {user.has_2fa && (
                  <div
                    className="absolute bottom-1 right-1 bg-green-500 text-white p-2 rounded-full shadow-lg"
                    title={t('profile.twoFactorEnabled')}
                  >
                    <i className="fas fa-shield-alt text-sm"></i>
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                {user.username}
              </h1>
              {user.email && (
                <p className="text-[var(--text-secondary)] mb-6 flex items-center justify-center gap-2">
                  <i className="glass-i fas fa-envelope text-sm"></i>
                  {user.email}
                </p>
              )}

              <div className="w-full grid grid-cols-2 gap-3 mb-6">
                <div className="glass-panel p-3 text-center">
                  <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">
                    ID
                  </span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">#{user.id}</span>
                </div>
                <div className="glass-panel p-3 text-center">
                  <span className="block text-xs font-medium text-[var(--text-muted)] uppercase mb-1">
                    Joined
                  </span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">
                    {user.created_at ? new Date(user.created_at).getFullYear() : '-'}
                  </span>
                </div>
              </div>

              <Link to="/profile/edit" className="btn-apple w-full justify-center">
                <i className="fas fa-edit mr-2"></i>
                {t('profile.editProfile')}
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Settings & Tools */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Grid */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <i className="glass-i fas fa-sliders-h text-blue-500"></i>
              Quick Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Theme Card */}
              <button
                onClick={toggleTheme}
                className="glass-card p-5 text-left hover:scale-[1.02] transition-transform group flex flex-col items-start"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-600'}`}
                >
                  <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`}></i>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                  {t('profile.theme')}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Currently set to {theme} mode
                </p>
              </button>

              {/* Password Card */}
              <Link
                to="/profile/change-password"
                className="glass-card p-5 text-left hover:scale-[1.02] transition-transform group flex flex-col items-start"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center mb-3 text-xl">
                  <i className="fas fa-key"></i>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                  {t('auth.login.password')}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('profile.passwordDescription')}
                </p>
              </Link>
            </div>
          </section>

          {/* Security Section */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <i className="glass-i fas fa-shield-alt text-green-500"></i>
              Security
            </h2>
            <div className="modern-search-card space-y-6">
              {/* 2FA Toggle */}
              <div className="flex items-center justify-between p-4 glass-panel rounded-xl">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {t('profile.enable2FA')}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {user.has_2fa ? t('profile.twoFactorEnabled') : t('profile.twoFactorDisabled')}
                  </p>
                </div>
                {user.has_2fa ? (
                  <Link
                    to="/profile/2fa/disable"
                    className="btn-apple bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/20"
                  >
                    {t('profile.disable')}
                  </Link>
                ) : (
                  <Link
                    to="/profile/2fa/setup"
                    className="btn-apple bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/20"
                  >
                    {t('profile.setup')}
                  </Link>
                )}
              </div>

              {/* Passkeys */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-3 px-1">
                  Passkeys
                </h3>
                <PasskeyManager />
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <i className="glass-i fas fa-database text-orange-500"></i>
              Data & Storage
            </h2>
            <div className="modern-search-card">
              <div className="grid grid-cols-1 gap-4">
                {/* JSON Export/Import */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-[var(--border-color)]">
                  <div className="flex-1">
                    <h3 className="font-medium text-[var(--text-primary)]">Backup & Restore</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      Export your data to JSON or restore from a backup.
                    </p>

                    {(importMessage || importError) && (
                      <div
                        className={`mt-3 p-2 rounded text-sm ${importMessage ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}
                      >
                        {importMessage || importError}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 self-start">
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="btn-secondary-glass"
                    >
                      <i
                        className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'} mr-2`}
                      ></i>
                      Export
                    </button>
                    <button
                      onClick={handleImportClick}
                      disabled={isImporting}
                      className="btn-secondary-glass"
                    >
                      <i
                        className={`fas ${isImporting ? 'fa-spinner fa-spin' : 'fa-upload'} mr-2`}
                      ></i>
                      Import
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Markdown Import */}
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--text-primary)]">Markdown Import</h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Import notes from markdown files or folders.
                      </p>

                      <label className="flex items-center gap-2 mt-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={markdownOverwrite}
                          onChange={(e) => setMarkdownOverwrite(e.target.checked)}
                          disabled={isMarkdownImporting}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {t('markdownImport.overwrite')}
                      </label>

                      {(markdownImportMessage || markdownImportError) && (
                        <div
                          className={`mt-3 p-2 rounded text-sm ${markdownImportMessage ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}
                        >
                          {markdownImportMessage || markdownImportError}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 self-start">
                      <button
                        onClick={handleMarkdownImportFilesClick}
                        disabled={isMarkdownImporting}
                        className="btn-secondary-glass"
                      >
                        <i
                          className={`fas ${isMarkdownImporting ? 'fa-spinner fa-spin' : 'fa-file-alt'} mr-2`}
                        ></i>
                        Files
                      </button>
                      <button
                        onClick={handleMarkdownImportFolderClick}
                        disabled={isMarkdownImporting}
                        className="btn-secondary-glass"
                      >
                        <i
                          className={`fas ${isMarkdownImporting ? 'fa-spinner fa-spin' : 'fa-folder-open'} mr-2`}
                        ></i>
                        Folder
                      </button>
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
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
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
