export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Global listener for 401 responses — AuthContext registers a callback
// here so that any API call getting a 401 (expired/invalid token) can
// trigger a logout + redirect without every page having to handle it.
let onUnauthorized = null;
export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

// Every request goes through here. It attaches the JWT automatically
// (if we have one) and normalizes error handling so every page doesn't
// need to repeat try/catch + status-code-checking logic.
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // fetch itself throws on network failures (no connectivity, DNS
    // failure, CORS block, server unreachable). Surface a user-friendly
    // message instead of the raw TypeError.
    throw new Error('Network error — please check your connection and try again.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Auto-logout on expired/invalid token
    if (res.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    // Surface the backend's error message (which is already written to
    // be safe to show a user — see server.js's central error handler)
    // rather than leaking raw response details.
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

