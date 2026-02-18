import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient } from '../api/client';
import type { User, LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  register: (data: RegisterRequest) => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const currentUser = await apiClient.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await apiClient.login(credentials);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const register = async (data: RegisterRequest) => {
    try {
      const newUser = await apiClient.register(data);
      // After registration, automatically login
      await login({ username: data.email, password: data.password });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const isAuthenticated = !!user;

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
    isAuthenticated,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
