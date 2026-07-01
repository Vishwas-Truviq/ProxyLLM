export const AUTH_KEY = "amicorp_auth";
export const AUTH_USER = "amicorp";
export const AUTH_PASS = "Admin@123";

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_KEY) === "true";
}

export function signIn(username: string, password: string): boolean {
  if (username === AUTH_USER && password === AUTH_PASS) {
    window.localStorage.setItem(AUTH_KEY, "true");
    return true;
  }
  return false;
}

export function signOut() {
  window.localStorage.removeItem(AUTH_KEY);
}
