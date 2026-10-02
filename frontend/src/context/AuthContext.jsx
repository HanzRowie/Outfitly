import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getUser,
  getAccessToken,
  setAuthData,
  clearAuthData,
} from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on startup
  useEffect(() => {
    try {
      const storedUser = getUser();
      const storedToken = getAccessToken();

      if (storedUser && storedToken) {
        setUser(storedUser);
        setAccessToken(storedToken);
      }
    } catch (err) {
      console.error('Failed to restore authentication state:', err);
      clearAuthData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Called upon successful login to store tokens and user info.
   */
  const login = (authResponse) => {
    const { user: userData, tokens } = authResponse;
    const access = tokens?.access;
    const refresh = tokens?.refresh;

    setAuthData({ access, refresh, user: userData });
    setUser(userData);
    setAccessToken(access);
  };

  /**
   * Clear all authentication data and reset state.
   */
  const logout = () => {
    clearAuthData();
    setUser(null);
    setAccessToken(null);
  };

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken),
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
