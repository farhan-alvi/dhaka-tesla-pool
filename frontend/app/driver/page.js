"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getSessionUser, clearSession, paisaToTaka } from "../../lib/api";

export default function DriverPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState({ vehicle: null, pools: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const [reqData, histData] = await Promise.all([
        api("/api/driver/requests"),
        api("/api/driver/history"),
      ]);
      setRequests(reqData.requests);
      setHistory(histData);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const u = getSessionUser();
    if (!u || u.role !== "DRIVER") {
      router.push("/");
      return;
    }
    setUser(u);
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [router, load]);

  async function toggleOnline() {
    setError("");
    try {
      await api("/api/driver/online", { method: "PATCH", body: { online: !history.vehicle?.isOnline } });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function act(action, id) {
    setBusy(id + action);
    setError("");
    try {
      const paths = {
        accept: { path: `/api/driver/rides/${id}/accept`, method: "POST" },
        arrived: { path: `/api/driver/rides/${id}/arrived`, method: "PATCH" },
        start: { path: `/api/driver/rides/${id}/start`, method: "PATCH" },
        complete: { path: `/api/driver/rides/${id}/complete`, method: "PATCH" },
      }[action];
      await api(paths.path, { method: paths.method });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  function logout() {
    clearSession();
    router.push("/");
  }

  if (!user) return null;

  const openPools = history.pools.filter((p) => !["COMPLETED", "CANCELLED"].includes(p.status));

  return (
    <div>
      <h1>Hi {user.name} 👋</h1>
      <p className="subtitle">
        {history.vehicle ? `${history.vehicle.name} · ${history.vehicle.capacity} seats` : "Loading vehicle..."}
      </p>
      <button className="secondary" onClick={logout} type="button">Log out</button>
      {history.vehicle && (
        <button onClick={toggleOnline} type="button">
          {history.vehicle.isOnline ? "Go offline" : "Go online"}
        </button>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Open requests</h3>
        {requests.length === 0 && <p className="muted">No pending requests right now.</p>}
        {requests.map((r) => (
          <div className="ride-row" key={r.id}>
            <div>
              <strong>{r.passenger.name}</strong>: {r.pickupZone} → {r.destinationZone} ({r.seats} seat(s))
              <div className="muted">est. {paisaToTaka(r.estimatedFarePaisa)}</div>
            </div>
            <button disabled={busy === r.id + "accept"} onClick={() => act("accept", r.id)} type="button">
              {busy === r.id + "accept" ? "Accepting..." : "Accept"}
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Active pools</h3>
        {openPools.length === 0 && <p className="muted">No active pool right now.</p>}
        {openPools.map((pool) => (
          <div key={pool.id} style={{ marginBottom: 16 }}>
            <div>
              <span className={`badge ${pool.status.toLowerCase()}`}>{pool.status.replace("_", " ")}</span>{" "}
              <span className="muted">{pool.rideRequests.length} passenger(s)</span>
            </div>
            <ul>
              {pool.rideRequests.map((r) => (
                <li key={r.id}>
                  {r.passenger.name}: {r.pickupZone} → {r.destinationZone} · {paisaToTaka(r.estimatedFarePaisa)}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 8 }}>
              {pool.status === "MATCHED" && (
                <button onClick={() => act("arrived", pool.rideRequests[0].id)} disabled={busy}>
                  Mark arrived
                </button>
              )}
              {pool.status === "DRIVER_ARRIVED" && (
                <button onClick={() => act("start", pool.rideRequests[0].id)} disabled={busy}>
                  Start trip
                </button>
              )}
              {pool.status === "STARTED" && (
                <button onClick={() => act("complete", pool.rideRequests[0].id)} disabled={busy}>
                  Complete trip
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Ride history</h3>
        {history.pools.filter((p) => ["COMPLETED", "CANCELLED"].includes(p.status)).length === 0 && (
          <p className="muted">No completed rides yet.</p>
        )}
        {history.pools
          .filter((p) => ["COMPLETED", "CANCELLED"].includes(p.status))
          .map((pool) => (
            <div className="ride-row" key={pool.id}>
              <div>
                {pool.rideRequests.map((r) => r.passenger.name).join(", ")}
                <div className="muted">
                  {pool.rideRequests.map((r) => `${r.pickupZone}→${r.destinationZone}`).join(" · ")}
                </div>
              </div>
              <span className={`badge ${pool.status.toLowerCase()}`}>{pool.status}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
