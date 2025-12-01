import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, getStoredToken, getStoredUser, clearStoredAuth } from '../api/client';
import type { User, LoginCredentials, AuthError } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      const storedUser = getStoredUser();
      
      if (token && storedUser) {
        try {
          const response = await authApi.validate();
          setUser(response.user);
        } catch {
          clearStoredAuth();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; requires2FA?: boolean; error?: string }> => {
    try {
      const response = await authApi.login(credentials);
      setUser(response.user);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
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
