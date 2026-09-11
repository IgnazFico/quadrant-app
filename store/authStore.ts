import { create } from "zustand";

/**
 * Holds the decrypted master key for the current tab session only.
 *
 * Backed by `sessionStorage` (strictly scoped to the active tab, never written
 * to persistent localStorage). This survives in-tab soft reloads and mobile
 * tab memory suspension while maintaining the zero-knowledge isolation model
 * (the browser automatically clears sessionStorage when the tab is closed).
 */
const SESSION_VAULT_KEY = "quadrant_session_vault_key";

function loadSessionKey(): Uint8Array | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_VAULT_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0) {
      return new Uint8Array(arr);
    }
  } catch {
    // If invalid or storage blocked, fall back to null
  }
  return null;
}

interface AuthState {
  masterKey: Uint8Array | null;
  setMasterKey: (key: Uint8Array) => void;
  clearMasterKey: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  masterKey: loadSessionKey(),
  setMasterKey: (key) => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          SESSION_VAULT_KEY,
          JSON.stringify(Array.from(key)),
        );
      } catch {
        // Handle private browsing storage quotas gracefully
      }
    }
    set({ masterKey: key });
  },
  clearMasterKey: () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(SESSION_VAULT_KEY);
      } catch {
        // ignore
      }
    }
    set({ masterKey: null });
  },
}));
