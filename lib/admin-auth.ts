"use client";

import { getApiBase } from "@/lib/profiles";

const ADMIN_TOKEN_KEY = "admin_token";
const ADMIN_USER_KEY = "admin_user";
const SESSION_TOKEN_KEY = "session_token";
const SESSION_USER_KEY = "session_user";
const COOKIE_MAX_AGE = 60 * 60 * 8;

function cookieToken(key: string) {
  if (typeof document === "undefined") return undefined;
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${key}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function getAdminToken() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || cookieToken(ADMIN_TOKEN_KEY);
}

export function getSessionToken() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(SESSION_TOKEN_KEY) || cookieToken(SESSION_TOKEN_KEY) || getAdminToken();
}

export function adminHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const token = getAdminToken();
  if (token) nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
}

export function authHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const token = getSessionToken();
  if (token) nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
}

export function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    headers: adminHeaders(init.headers)
  });
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    headers: authHeaders(init.headers)
  });
}

export function saveAuthSession(token: string, user: { role?: string } | unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
  window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  document.cookie = `${SESSION_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;

  if (typeof user === "object" && user && "role" in user && user.role === "ADMIN") {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    document.cookie = `${ADMIN_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

export function saveAdminSession(token: string, user: unknown) {
  saveAuthSession(token, user);
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_USER_KEY);
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  window.localStorage.removeItem(SESSION_USER_KEY);
  document.cookie = `${ADMIN_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${SESSION_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export async function getCurrentAdmin() {
  if (!getAdminToken()) return undefined;
  const response = await adminFetch(`${getApiBase()}/api/auth/me`, { cache: "no-store" });
  if (!response.ok) return undefined;
  const payload = await response.json() as { data?: unknown };
  return payload.data;
}

export async function getCurrentUser() {
  if (!getSessionToken()) return undefined;
  const response = await authFetch(`${getApiBase()}/api/auth/me`, { cache: "no-store" });
  if (!response.ok) return undefined;
  const payload = await response.json() as { authenticated?: boolean; data?: unknown };
  if (payload.authenticated === false || !payload.data) {
    clearAdminSession();
    return undefined;
  }
  return payload.data;
}
