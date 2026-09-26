const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("tesla_pool_token");
}

export function setSession(token, user) {
  window.localStorage.setItem("tesla_pool_token", token);
  window.localStorage.setItem("tesla_pool_user", JSON.stringify(user));
}

export function getSessionUser() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("tesla_pool_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  window.localStorage.removeItem("tesla_pool_token");
  window.localStorage.removeItem("tesla_pool_user");
}

export async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function paisaToTaka(paisa) {
  if (paisa == null) return "—";
  return `৳${(paisa / 100).toFixed(2)}`;
}
