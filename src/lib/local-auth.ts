import { Profile } from "@/types/database";
import { loadProfile, saveProfile } from "@/lib/local-store";

const SESSION_KEY = "expirywatch.session.v1";

export function hasLocalSession(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(SESSION_KEY) === "active";
}

export function signInLocally(email: string): Profile {
  const profile = { ...loadProfile(), email };
  saveProfile(profile);
  window.localStorage.setItem(SESSION_KEY, "active");
  return profile;
}

export function signOutLocally(): void {
  window.localStorage.removeItem(SESSION_KEY);
}
