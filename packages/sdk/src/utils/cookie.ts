import Cookies from 'js-cookie';
import type { NearAuthData } from 'near-sign-verify';

export const AUTH_COOKIE_NAME = '__crosspost_auth';
export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Checks if the code is running in a Deno environment
 */
export const isDeno = (): boolean => { // monorepo builds primarily for Deno
  // we could expect that frontends in Deno environment will use this package,
  // and then we can determine auth solution there (ValTown, Smallweb, etc)
  return typeof globalThis.Deno !== 'undefined';
};

/**
 * Checks if the code is running in a browser environment
 */
export const isBrowser = (): boolean => {
  return !isDeno() && typeof globalThis.window !== 'undefined';
};

export const AUTH_COOKIE_OPTIONS: Cookies.CookieAttributes = {
  secure: true,
  sameSite: 'lax', // how could we make this none?
  path: '/',
  expires: 30, // 30 days
};

/**
 * Gets authentication data from the cookie
 * @returns The NearAuthData object or undefined if not found
 */
export function getAuthFromCookie(): NearAuthData | undefined {
  try {
    if (!isBrowser()) {
      return undefined;
    }

    const cookieValue = Cookies.get(AUTH_COOKIE_NAME);
    if (!cookieValue) {
      return undefined;
    }

    return JSON.parse(cookieValue) as NearAuthData;
  } catch (error) {
    console.error('Failed to parse auth cookie:', error);
    return undefined;
  }
}

/**
 * Stores authentication data in a secure cookie
 * @param authData The NearAuthData object to store
 */
export function storeAuthInCookie(authData: NearAuthData): void {
  try {
    if (!isBrowser()) {
      return;
    }

    const cookieValue = JSON.stringify(authData);
    Cookies.set(AUTH_COOKIE_NAME, cookieValue, AUTH_COOKIE_OPTIONS);
  } catch (error) {
    console.error('Failed to store auth cookie:', error);
  }
}

/**
 * Clears the authentication cookie
 */
export function clearAuthCookie(): void {
  if (!isBrowser()) {
    return;
  }

  Cookies.remove(AUTH_COOKIE_NAME, { path: AUTH_COOKIE_OPTIONS.path });
}

/**
 * Gets the CSRF token from the cookie
 * @returns The CSRF token or undefined if not found
 */
export function getCsrfToken(): string | undefined {
  if (!isBrowser()) {
    return undefined;
  }

  return Cookies.get(CSRF_COOKIE_NAME);
}
