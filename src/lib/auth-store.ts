import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Role = "user" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  credits: number;
  account_status: "active" | "suspended" | "pending";
  active_plan: null | {
    id: string;
    name: string;
    slug: string;
    credits: number;
    price: number;
  };
  plan_expires_at: string | null;
  created_at: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setTokens: (a: string, r: string) => void;
  setUser: (u: AuthUser | null) => void;
  logout: () => void;
}

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: "tc-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (noopStorage as Storage),
      ),
    },
  ),
);
