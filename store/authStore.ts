import { create } from "zustand";

/**
 * Holds the decrypted master key for the current session only.
 *
 * IMPORTANT: do not wrap this with Zustand's `persist` middleware.
 * Persisting this store would write the plaintext master key to
 * localStorage, which defeats the entire zero-knowledge model.
 */
interface AuthState {
  masterKey: Uint8Array | null;
  setMasterKey: (key: Uint8Array) => void;
  clearMasterKey: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  masterKey: null,
  setMasterKey: (key) => set({ masterKey: key }),
  clearMasterKey: () => set({ masterKey: null }),
}));
