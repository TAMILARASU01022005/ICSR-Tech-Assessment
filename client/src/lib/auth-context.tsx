"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, UserRole } from "@/types";
import { apiClient } from "./api-client";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const data = await apiClient<{ success: boolean; user: User }>("/auth/me");
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("icsr_auth_token");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiClient<{ success: boolean; token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.token && typeof window !== "undefined") {
      localStorage.setItem("icsr_auth_token", data.token);
    }

    setUser(data.user);
    router.push("/dashboard");
  };

  const register = async (name: string, email: string, password: string, role?: UserRole) => {
    const data = await apiClient<{ success: boolean; token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });

    if (data.token && typeof window !== "undefined") {
      localStorage.setItem("icsr_auth_token", data.token);
    }

    setUser(data.user);
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("icsr_auth_token");
      }
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      loading: false,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
}
