"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getCurrentUser, loginUser, registerUser, logoutUser, isAuthenticated } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  settings?: {
    theme: string;
    notifications: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        if (isAuthenticated()) {
          const userData = await getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // If there's an error, we'll clear any invalid tokens
        logoutUser();
      } finally {
        setLoading(false);
      }
    };

    checkUserLoggedIn();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await loginUser(email, password);
      setUser(response.user);
      toast.success('Login successful');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Login failed', { 
        description: error instanceof Error ? error.message : 'Please check your credentials and try again'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      setLoading(true);
      const response = await registerUser(username, email, password);
      setUser(response.user);
      toast.success('Registration successful');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Registration failed', { 
        description: error instanceof Error ? error.message : 'Please try again with different credentials'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    logoutUser();
    setUser(null);
    toast.info('You have been logged out');
    router.push('/login');
  };

  const checkAuth = async (): Promise<boolean> => {
    if (!isAuthenticated()) {
      return false;
    }

    try {
      const userData = await getCurrentUser();
      setUser(userData);
      return true;
    } catch (error) {
      logoutUser();
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
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

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedRoute(props: P) {
    const { user, loading, checkAuth } = useAuth();
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
      const verify = async () => {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
          toast.error('Authentication required', {
            description: 'Please login to access this page'
          });
          router.push('/login');
        }
        setChecking(false);
      };

      verify();
    }, [checkAuth, router]);

    if (loading || checking) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    if (!user) {
      return null; // This will be redirected by the useEffect
    }

    return <Component {...props} />;
  };
}