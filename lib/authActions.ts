"use server";

import { redirect } from "next/navigation";
import { signOut } from "./auth";

/**
 * Ends the Auth.js session and sends the user to /login.
 *
 * The client-side master key lives in sessionStorage (store/authStore.ts)
 * and is NOT touched by this server action — callers must run
 * useAuthStore.getState().clearMasterKey() before submitting, or the
 * decrypted key would survive sign-out for the rest of the tab session.
 */
export async function signOutAction() {
  // WO-115: signOut's redirectTo is made absolute from NEXTAUTH_URL, which on Vercel names the
  // preview host. A relative redirect() keeps the host the user is on.
  await signOut({ redirect: false });
  redirect("/login");
}
