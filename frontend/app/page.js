"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, setSession, getSessionUser } from "../lib/api";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "PASSENGER" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getSessionUser();
    if (user) router.push(user.role === "DRIVER" ? "/driver" : "/passenger");
  }, [router]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : form;
      const data = await api(path, { method: "POST", body });
      setSession(data.token, data.user);
      router.push(data.user.role === "DRIVER" ? "/driver" : "/passenger");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Share a seat. Split the fare.</h1>
      <p className="subtitle">Survive Dhaka traffic — with Jashim, Nusrat, Rafiq &amp; Shirin.</p>

      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            className={mode === "login" ? "" : "secondary"}
            onClick={() => setMode("login")}
            type="button"
          >
            Log in
          </button>
          <button
            className={mode === "signup" ? "" : "secondary"}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>Name</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required />

              <label>I am a...</label>
              <div className="role-picker">
                <label>
                  <input
                    type="radio"
                    name="role"
                    checked={form.role === "PASSENGER"}
                    onChange={() => update("role", "PASSENGER")}
                  />{" "}
                  Passenger
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    checked={form.role === "DRIVER"}
                    onChange={() => update("role", "DRIVER")}
                  />{" "}
                  Driver
                </label>
              </div>
            </>
          )}

          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />

          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={6}
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>

      <div className="card muted">
        <strong>Demo accounts</strong> (password: <code>password123</code>)
        <ul>
          <li>Driver — jashim@teslapool.dhaka (owns Bullet, 3 seats)</li>
          <li>Passenger — nusrat@teslapool.dhaka</li>
          <li>Passenger — rafiq@teslapool.dhaka</li>
          <li>Passenger — shirin@teslapool.dhaka</li>
        </ul>
      </div>
    </div>
  );
}
