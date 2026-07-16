/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/services";
import { getErrorMessage } from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveTokens = (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  };

  const clearAuth = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    try {
      const data = await authApi.me();
      Promise.resolve().then(() => setUser(data));
    } catch {
      Promise.resolve().then(() => clearAuth());
    } finally {
      Promise.resolve().then(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchUser());
  }, [fetchUser]);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    const { user: u, accessToken, refreshToken } = res.data.data;
    saveTokens(accessToken, refreshToken);
    setUser(u);
    return u;
  };

  const register = async (formData) => {
    await authApi.register(formData);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearAuth();
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser: fetchUser,
    getErrorMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
