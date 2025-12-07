import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LocationState {
  error?: string;
  code?: number;
}

export function ErrorPage() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const state = location.state as LocationState | null;

  const code = state?.code || 404;
  const error = state?.error || 'Page Not Found';

  const getErrorDetails = () => {
    switch (code) {
      case 404:
        return {
          icon: 'fa-search',
          iconColor: 'text-gray-400',
          title: 'Page Not Found',
          description:
            "The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.",
          tips: [
            'Check the URL for typos',
            'Use the navigation menu to find what you need',
            'Search for specific notes using the search feature',
          ],
        };
      case 403:
        return {
          icon: 'fa-lock',
          iconColor: 'text-red-400',
          title: 'Access Denied',
          description:
            "You don't have permission to access this resource. Please check your credentials.",
          tips: [
            'Make sure you are logged in',
            'Contact an administrator if you need access',
            'Try refreshing the page',
          ],
        };
      case 500:
        return {
          icon: 'fa-exclamation-triangle',
          iconColor: 'text-orange-400',
          title: 'Server Error',
          description:
            "Something went wrong on our end. We're working to fix this issue. Please try again later.",
          tips: [
            'Refresh the page and try again',
            'Clear your browser cache',
            'Contact support if the issue continues',
          ],
        };
      case 503:
        return {
          icon: 'fa-server',
          iconColor: 'text-blue-400',
          title: 'Service Unavailable',
          description:
            'The server is temporarily unavailable. This may be due to maintenance. Please wait a moment and try again.',
          tips: [
            'Wait 30-60 seconds for the server to wake up',
            'Refresh the page to try reconnecting',
            'This is normal for free-tier hosting services',
          ],
        };
      default:
        return {
          icon: 'fa-exclamation-circle',
          iconColor: 'text-gray-400',
          title: error,
          description:
            'An unexpected error occurred. Please try again or contact support if the problem persists.',
          tips: [
            'Try refreshing the page',
            'Check your internet connection',
            'Return to the homepage and start over',
          ],
        };
    }
  };

  const details = getErrorDetails();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <i
            className={`fas ${details.icon} text-8xl ${details.iconColor} mb-4`}
            aria-hidden="true"
          ></i>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-[var(--text-primary)] mb-4">{code}</h1>
          <h2 className="text-2xl font-semibold text-[var(--text-secondary)] mb-4">
            {details.title}
          </h2>
          <p className="text-[var(--text-muted)] mb-6">{details.description}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {isAuthenticated ? (
            <Link
              to="/"
              className="btn-primary inline-flex items-center px-6 py-3 rounded-lg text-lg font-medium"
            >
              <i className="glass-i fas fa-home mr-2" aria-hidden="true"></i>
              Go to Notes
            </Link>
          ) : (
            <Link
              to="/login"
              className="btn-primary inline-flex items-center px-6 py-3 rounded-lg text-lg font-medium"
            >
              <i className="glass-i fas fa-sign-in-alt mr-2" aria-hidden="true"></i>
              Login
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:opacity-80 transition-colors"
          >
            <i className="glass-i fas fa-arrow-left mr-2" aria-hidden="true"></i>
            Go Back
          </button>
        </div>

        {/* Additional Help */}
        <div className="glass-card p-6 rounded-xl text-left">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Need Help?</h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            {details.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
