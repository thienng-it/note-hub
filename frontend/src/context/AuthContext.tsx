import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi, clearStoredAuth, getStoredToken, getStoredUser } from '../api/client';
import type { AuthError, LoginCredentials, User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    credentials: LoginCredentials,
  ) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      const storedUser = getStoredUser();

      if (token && storedUser) {
        try {
          const response = await authApi.validate();
          setUser(response.user);
          // Sync i18n language with user's preferred language
          if (
            response.user.preferred_language &&
            response.user.preferred_language !== i18n.language
          ) {
            i18n.changeLanguage(response.user.preferred_language);
          }
        } catch {
          clearStoredAuth();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [i18n]);

  const login = async (
    credentials: LoginCredentials,
  ): Promise<{ success: boolean; requires2FA?: boolean; error?: string }> => {
    try {
      const response = await authApi.login(credentials);
      setUser(response.user);
      // Sync i18n language with user's preferred language on login
      if (response.user.preferred_language && response.user.preferred_language !== i18n.language) {
        i18n.changeLanguage(response.user.preferred_language);
      }
      return { success: true };
    } catch (err) {
      const error = err as AuthError & { status?: number };
      if (error.requires_2fa) {
        return { success: false, requires2FA: true };
      }
      return { success: false, error: error.error || 'Login failed' };
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.validate();
      setUser(response.user);
      // Sync i18n language with user's preferred language
      if (response.user.preferred_language && response.user.preferred_language !== i18n.language) {
        i18n.changeLanguage(response.user.preferred_language);
      }
    } catch {
      // User validation failed, but don't clear auth - let the component handle this
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
