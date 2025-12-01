import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.put('/api/user/profile', formData);
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
          aria-label="Back to Profile"
        >
          <i className="fas fa-arrow-left mr-2" aria-hidden="true"></i>
          Back to Profile
        </Link>
        <h1 className="text-3xl font-bold flex items-center text-[var(--text-primary)]">
          <i className="fas fa-edit mr-3 text-blue-600" aria-hidden="true"></i>
          Edit Profile
        </h1>
      </div>

      {/* Form */}
      <div className="card p-6 rounded-xl">
        {error && (
          <div
            className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start"
            role="alert"
          >
            <i className="fas fa-exclamation-circle mr-2 mt-0.5" aria-hidden="true"></i>
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
              <i className="fas fa-user mr-2" aria-hidden="true"></i>
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              placeholder="Enter username..."
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
              <i className="fas fa-envelope mr-2" aria-hidden="true"></i>
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              placeholder="your.email@example.com"
            />
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Optional: Add your email address for account recovery
            </p>
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <i className="fas fa-user-circle mr-2" aria-hidden="true"></i>
              Bio
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)] resize-none"
              rows={4}
              placeholder="Tell us about yourself..."
              maxLength={500}
            />
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Optional: Write a short bio (max 500 characters)
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <Link
              to="/profile"
              className="px-6 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:opacity-80 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary px-6 py-2.5 rounded-lg font-medium"
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
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
