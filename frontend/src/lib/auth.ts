import { apiFetch, clearToken, setToken } from "@/lib/api";
import type { User } from "@/types";

interface LoginResponse {
  user: User;
  token: string;
}

const USER_KEY = "ledgercraft.user";

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function setCurrentUser(user: User): void {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function login(loginId: string, password: string): Promise<User> {
  const { user, token } = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ login_id: loginId, password }),
  });
  setToken(token);
  setCurrentUser(user);
  return user;
}

export async function signup(input: {
  name: string;
  login_id: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<User> {
  const { user, token } = await apiFetch<LoginResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setToken(token);
  setCurrentUser(user);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    clearToken();
    window.localStorage.removeItem(USER_KEY);
  }
}

// FRONTEND_REQUIREMENTS.md sends a `user`-role account to /portal, but that screen
// doesn't exist yet, so everyone lands on /dashboard for now.
export const POST_LOGIN_PATH = "/dashboard";
