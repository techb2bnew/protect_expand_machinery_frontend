'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User, remember: boolean) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user_data') || sessionStorage.getItem('user_data');
        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(userData);
        } else {
          console.log('No stored auth data found');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, userData: User, remember: boolean) => {
    console.log('Login called with:', { newToken: newToken ? 'Found' : 'Not found', userData });
    setToken(newToken);
    setUser(userData);

    // Store in selected storage
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('auth_token', newToken);
    storage.setItem('user_data', JSON.stringify(userData));
    console.log(`User data stored in ${remember ? 'localStorage' : 'sessionStorage'}`);
  };

  const logout = () => {
    setToken(null);
    setUser(null);

    // Clear from storage
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user_data', JSON.stringify(userData));
  };

  const isAuthenticated = !!token && !!user;

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    updateUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
