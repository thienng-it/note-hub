/**
 * UserAvatar Component
 * Displays user avatar with fallback to initials
 */

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy' | null;
  showStatus?: boolean;
  className?: string;
}

export function UserAvatar({
  username,
  avatarUrl,
  size = 'md',
  status,
  showStatus = false,
  className = '',
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const statusSize = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  // Get initials from username (first 2 characters)
  const initials = username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`relative ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className={`${sizeClasses[size]} rounded-full object-cover bg-gray-200 dark:bg-gray-700`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold`}
        >
          {initials}
        </div>
      )}
      {showStatus && status && (
        <span
          className={`absolute bottom-0 right-0 ${statusSize[size]} ${statusColors[status]} rounded-full border-2 border-white dark:border-gray-800`}
          title={status}
        />
      )}
    </div>
  );
}
