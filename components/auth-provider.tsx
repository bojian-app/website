"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authRequest } from "@/lib/auth-client";
import type { AuthUser } from "@/lib/auth-types";
type AuthState = {
  user: AuthUser | null;
  checking: boolean;
  error: string;
  refresh: () => Promise<void>;
  authenticated: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const channel = useRef<BroadcastChannel | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setChecking(true);
    try {
      const data = await authRequest<{ user: AuthUser | null }>(
        "/web-api/auth/session",
        undefined,
        controller.signal,
      );
      if (version === generation.current) {
        setUser(data.user);
        setError("");
      }
    } catch (error) {
      if (!controller.signal.aborted && version === generation.current)
        setError(
          error instanceof Error
            ? error.message
            : "暂时无法读取登录状态，请重试。",
        );
    } finally {
      if (!controller.signal.aborted && version === generation.current)
        setChecking(false);
    }
  }, []);
  const authenticated = useCallback((user: AuthUser | null) => {
    generation.current++;
    request.current?.abort();
    setUser(user);
    setError("");
    setChecking(false);
    channel.current?.postMessage("changed");
  }, []);
  const logout = useCallback(async () => {
    await authRequest("/web-api/auth/logout", {});
    authenticated(null);
  }, [authenticated]);
  useEffect(() => {
    if ("BroadcastChannel" in window) {
      channel.current = new BroadcastChannel("bojian-web-auth");
      channel.current.onmessage = () => void refresh();
    }
    void refresh();
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      generation.current++;
      request.current?.abort();
      channel.current?.close();
      channel.current = null;
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  return (
    <AuthContext.Provider
      value={{ user, checking, error, refresh, authenticated, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
