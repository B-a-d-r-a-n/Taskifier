import Constants from "expo-constants";
import type { ApiError } from "@taskifier/types";

const BASE_URL =
    Constants.expoConfig?.extra?.SERVER_URL ?? "http://192.168.1.180:3000";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

type FetchOptions = RequestInit & {
    retryOn401?: boolean;
};

let store: {
    getItemAsync: (key: string) => Promise<string | null>;
    setItemAsync: (key: string, value: string) => Promise<void>;
    deleteItemAsync: (key: string) => Promise<void>;
} | null = null;

async function initStore(): Promise<void> {
    try {
        const SecureStore = await import("expo-secure-store");
        store = {
            getItemAsync: (key) => SecureStore.getItemAsync(key),
            setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
            deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
        };
    } catch {
        store = null;
    }
}


async function getItem(key: string): Promise<string | null> {
    if (store) {
        try {
            return await store.getItemAsync(key);
        } catch {}
    }
    if (isWeb()) {
        try {
            return localStorage.getItem(key);
        } catch {}
    }
    return null;
}

async function setItem(key: string, value: string): Promise<void> {
    if (store) {
        try {
            await store.setItemAsync(key, value);
            return;
        } catch {}
    }
    if (isWeb()) {
        try {
            localStorage.setItem(key, value);
        } catch {}
    }
}

async function deleteItem(key: string): Promise<void> {
    if (store) {
        try {
            await store.deleteItemAsync(key);
            return;
        } catch {}
    }
    if (isWeb()) {
        try {
            localStorage.removeItem(key);
        } catch {}
    }
}

export async function initTokens(): Promise<void> {
    await initStore();
    accessToken = await getItem(ACCESS_TOKEN_KEY);
    refreshToken = await getItem(REFRESH_TOKEN_KEY);
}

export async function setTokens(act: string, rft: string): Promise<void> {
    accessToken = act;
    refreshToken = rft;
    await setItem(ACCESS_TOKEN_KEY, act);
    await setItem(REFRESH_TOKEN_KEY, rft);
}

export async function clearTokens(): Promise<void> {
    accessToken = null;
    refreshToken = null;
    await deleteItem(ACCESS_TOKEN_KEY);
    await deleteItem(REFRESH_TOKEN_KEY);
}

// Singleton guard: if a refresh is already in-flight, subsequent 401s queue behind the same promise.
// This avoids multiple concurrent refresh calls racing against each other.
export async function silentRefresh(): Promise<boolean> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        if (!refreshToken) return false;

        try {
            const res = await fetch(`${BASE_URL}/api/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });

            if (!res.ok) {
                refreshToken = null;
                await deleteItem(REFRESH_TOKEN_KEY);
                return false;
            }

            const data = await res.json();
            await setTokens(data.actToken, data.refreshToken);
            return true;
        } catch {
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}
function isApiError(body: unknown): body is ApiError {
    return (
        typeof body === "object" &&
        body !== null &&
        "code" in body &&
        "message" in body
    );
}


export async function apiFetch<T>(
    endpoint: string,
    options: FetchOptions = {},
): Promise<T> {
    const { retryOn401 = true, ...fetchOpts } = options;
    const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(fetchOpts.headers as Record<string, string> | undefined),
    };

    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, {
        ...fetchOpts,
        headers,
    });

    if (res.status === 401 && retryOn401) {
        const refreshed = await silentRefresh();
        if (refreshed) {
            return apiFetch<T>(endpoint, { ...options, retryOn401: false });
        }
        throw new Error("SESSION_EXPIRED");
    }

    if (!res.ok) {
        let message = `HTTP ${res.status}`;
        let code = "UNKNOWN";
        try {
            const body = await res.json();
            if (isApiError(body)) {
                message = body.message;
                code = body.code;
            }
        } catch {
            // use default message
        }
        const err = new Error(message) as Error & { code: string };
        err.code = code;
        throw err;
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}

const THEME_KEY = "app_theme";

function isWeb(): boolean {
    try {
        return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
    } catch {
        return false;
    }
}

export async function saveTheme(theme: "light" | "dark"): Promise<void> {
    if (isWeb()) {
        try {
            localStorage.setItem(THEME_KEY, theme);
            return;
        } catch {}
    }
    await setItem(THEME_KEY, theme);
}

// Ensure storage is initialized before reading — otherwise on Android loadTheme()
// can race with initTokens() and read from a null store, silently defaulting to "light".
export async function loadTheme(): Promise<"light" | "dark"> {
    await initStore();
    if (isWeb()) {
        try {
            const val = localStorage.getItem(THEME_KEY);
            if (val === "dark" || val === "light") return val;
        } catch {}
        return "light";
    }
    const val = await getItem(THEME_KEY);
    return val === "dark" ? "dark" : "light";
}

export function getAccessToken(): string | null {
    return accessToken;
}

export function getSSEUrl(teamId: string): string {
    return `${BASE_URL}/api/sse/${teamId}`;
}
