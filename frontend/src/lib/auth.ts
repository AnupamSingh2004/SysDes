// Auth utilities for managing authentication state
// NOTE: Tokens are stored in HTTP-only cookies for security
// This file handles the user data caching in localStorage

import { api, User } from './api';

const USER_KEY = 'auth_user';

// ==================== User Storage ====================
// We cache user data in localStorage for quick access
// but the actual auth is done via HTTP-only cookies

export function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setCachedUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeCachedUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

// ==================== Auth Check ====================
// Check if user is logged in by looking for the non-httponly cookie
// that the backend sets alongside the secure tokens

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return document.cookie.includes('logged_in=true');
}

// ==================== OAuth Redirects ====================

export function loginWithGitHub(): void {
  window.location.href = api.getGitHubAuthUrl();
}

export function loginWithGoogle(): void {
  window.location.href = api.getGoogleAuthUrl();
}

// ==================== Logout ====================

export async function logout(): Promise<void> {
  try {
    await api.logout();
  } catch (error) {
    console.error('Logout error:', error);
  }
  removeCachedUser();
  window.location.href = '/';
}

// ==================== Fetch Current User ====================
// This makes an API call to verify auth and get fresh user data

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await api.getMe();
    setCachedUser(response.user);
    return response.user;
  } catch {
    removeCachedUser();
    return null;
  }
}

