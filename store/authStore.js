import { create } from "zustand";
import { Platform } from "react-native";

const STORAGE_KEY = "foodpanda_auth_session";

// Helper to read initial state from storage (Web only)
const getInitialState = () => {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          user: parsed.user || null,
          token: parsed.token || null,
          isAuthenticated: !!parsed.token,
        };
      }
    } catch (e) {
      console.warn("Could not read auth session:", e);
    }
  }

  return {
    user: null,
    token: null,
    isAuthenticated: false,
  };
};

export const useAuthStore = create((set, get) => ({
  ...getInitialState(),

  setAuth: (user, token) => {
    const nextState = {
      user,
      token,
      isAuthenticated: !!token,
    };

    set(nextState);

    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {
        console.warn("Could not persist auth session:", e);
      }
    }
  },

  updateUser: (partial) => {
    const updatedUser = { ...get().user, ...partial };
    set({ user: updatedUser });

    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...get(), user: updatedUser })
        );
      } catch (e) {}
    }
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }
  },
}));

export default useAuthStore;
