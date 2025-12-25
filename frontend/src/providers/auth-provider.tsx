"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User } from "@/lib/api";
import { 
  getCachedUser, 
  removeCachedUser, 
  isLoggedIn,
  fetchCurrentUser,
  logout as authLogout,
  loginWithGitHub,
  loginWithGoogle 
} from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGitHub: () => void;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize with cached user data (for instant UI)
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [isLoading, setIsLoading] = useState(true);

  // On mount, verify auth status with the backend
  useEffect(() => {
    const checkAuth = async () => {
      // Quick check: do we have the logged_in cookie?
      if (!isLoggedIn()) {
        setUser(null);
        removeCachedUser();
        setIsLoading(false);
        return;
      }

      // Verify with backend and get fresh user data
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
        removeCachedUser();
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await authLogout();
    setUser(null);
    // Note: authLogout redirects to /, so we might not reach here
  }, []);

  const handleLoginWithGitHub = useCallback(() => {
    loginWithGitHub();
  }, []);

  const handleLoginWithGoogle = useCallback(() => {
    loginWithGoogle();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithGitHub: handleLoginWithGitHub,
        loginWithGoogle: handleLoginWithGoogle,
        logout,
        refreshUser,
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
