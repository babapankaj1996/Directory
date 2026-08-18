"use client";

import { readApiJson } from "@/lib/api-response";
import { apiUrl, getApiBase } from "@/lib/profiles";

const ADMIN_TOKEN_KEY = "admin_token";
const ADMIN_USER_KEY = "admin_user";
const SESSION_TOKEN_KEY = "session_token";
const SESSION_USER_KEY = "session_user";

export function getAdminToken() {
  return undefined;
}

export function getSessionToken() {
  return undefined;
}

export function adminHeaders(headers?: HeadersInit) {
  return new Headers(headers);
}

export function authHeaders(headers?: HeadersInit) {
  return new Headers(headers);
}

export function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: adminHeaders(init.headers)
  });
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: authHeaders(init.headers)
  });
}

export function saveAuthSession(user: { role?: string } | unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));

  if (typeof user === "object" && user && "role" in user && user.role === "ADMIN") {
    window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  }
}

export function saveAdminSession(user: unknown) {
  saveAuthSession(user);
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_USER_KEY);
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  window.localStorage.removeItem(SESSION_USER_KEY);
  document.cookie = `${ADMIN_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${SESSION_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  fetch(apiUrl(`/api/auth/logout`), {
    method: "POST",
    credentials: "include"
  }).catch(() => undefined);
}

export async function getCurrentAdmin() {
  try {
    const response = await adminFetch(apiUrl(`/api/auth/me`), { cache: "no-store" });
    if (!response.ok) return undefined;
    const payload = await readApiJson<{ data?: unknown }>(response, "admin session check");
    return payload.data;
  } catch {
    return undefined;
  }
}

export async function getCurrentUser() {
  try {
    const response = await authFetch(apiUrl(`/api/auth/me`), { cache: "no-store" });
    if (!response.ok) return undefined;
    const payload = await readApiJson<{ authenticated?: boolean; data?: unknown }>(response, "session check");
    if (payload.authenticated === false || !payload.data) {
      clearAdminSession();
      return undefined;
    }
    return payload.data;
  } catch {
    return undefined;
  }
}
