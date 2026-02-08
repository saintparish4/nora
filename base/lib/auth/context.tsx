'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, signup as apiSignup, login as apiLogin, logout as apiLogout, getCurrentUser } from '../api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, returnUrl?: string) => Promise<void>;
  signup: (email: string, password: string, returnUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    getCurrentUser()
      .then(user => setUser(user))
      .finally(() => setLoading(false));
  }, []);

  // Validate that a return URL is a safe relative path (prevent open redirects).
  const safeReturnUrl = (url?: string): string => {
    if (!url) return '/dashboard';
    // Only allow relative paths starting with /
    if (url.startsWith('/') && !url.startsWith('//')) return url;
    return '/dashboard';
  };

  const login = async (email: string, password: string, returnUrl?: string) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    router.push(safeReturnUrl(returnUrl));
  };

  const signup = async (email: string, password: string, returnUrl?: string) => {
    const data = await apiSignup(email, password);
    setUser(data.user);
    router.push(safeReturnUrl(returnUrl));
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
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
