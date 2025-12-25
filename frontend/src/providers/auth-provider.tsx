"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "sysdes_token";
const USER_KEY = "sysdes_user";

// Helper to get initial values from localStorage
function getStoredAuth(): { token: string | null; user: User | null } {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }
  
  const storedToken = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);
  
  if (storedToken && storedUser) {
    try {
      return { token: storedToken, user: JSON.parse(storedUser) };
    } catch {
      return { token: null, user: null };
    }
  }
  
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize with localStorage values (lazy initialization)
  const [authState, setAuthState] = useState<{
    user: User | null;
    token: string | null;
    isLoading: boolean;
  }>(() => {
    const { token, user } = getStoredAuth();
    return { token, user, isLoading: false };
  });

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setAuthState({ token: newToken, user: newUser, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthState({ token: null, user: null, isLoading: false });
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setAuthState(prev => {
      if (prev.user) {
        const newUser = { ...prev.user, ...updates };
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        return { ...prev, user: newUser };
      }
      return prev;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        isLoading: authState.isLoading,
        isAuthenticated: !!authState.token && !!authState.user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
