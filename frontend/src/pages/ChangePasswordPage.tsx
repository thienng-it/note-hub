import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/api/user/change-password', {
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });
      navigate('/profile', { state: { message: 'Password changed successfully' } });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
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
          aria-label="Back to Profile"
        >
          <i className="fas fa-arrow-left mr-2" aria-hidden="true"></i>
          Back to Profile
        </Link>
        <h1 className="text-3xl font-bold flex items-center text-[var(--text-primary)]">
          <i className="fas fa-key mr-3 text-blue-600" aria-hidden="true"></i>
          Change Password
        </h1>
      </div>

      {/* Form */}
      <div className="glass-card p-6 rounded-xl">
        {error && (
          <div
            className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
            role="alert"
          >
            <i className="fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="fas fa-lock mr-2" aria-hidden="true"></i>
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="Enter current password..."
                required
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fas ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="fas fa-key mr-2" aria-hidden="true"></i>
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="Enter new password..."
                required
                minLength={12}
                aria-required="true"
                aria-describedby="password-hint"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
              </button>
            </div>
            <p id="password-hint" className="mt-1 text-sm text-[var(--text-muted)]">
              Use at least 12 characters with mixed types
            </p>
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="fas fa-check-circle mr-2" aria-hidden="true"></i>
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="Confirm new password..."
                required
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start">
              <i className="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-500 mt-1 mr-3" aria-hidden="true"></i>
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  Security Notice
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  After changing your password, you will remain logged in on this device.
                  However, you will be logged out from all other devices for security reasons.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <Link
              to="/profile"
              className="px-6 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:opacity-80 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary px-6 py-2 rounded-lg font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2" aria-hidden="true"></i>
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
