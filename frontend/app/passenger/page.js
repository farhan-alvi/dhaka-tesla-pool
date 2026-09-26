"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getSessionUser, clearSession, paisaToTaka } from "../../lib/api";

const ZONES = ["BANANI", "GULSHAN", "MOHAKHALI", "DHANMONDI", "MIRPUR", "UTTARA", "FARMGATE", "BASHUNDHARA"];

export default function PassengerPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [rides, setRides] = useState([]);
  const [form, setForm] = useState({ pickupZone: "BANANI", destinationZone: "MOHAKHALI", seats: 1 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadRides = useCallback(async () => {
    try {
      const data = await api("/api/rides/mine");
      setRides(data.rides);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const u = getSessionUser();
    if (!u || u.role !== "PASSENGER") {
      router.push("/");
      return;
    }
    setUser(u);
    loadRides();
    const interval = setInterval(loadRides, 4000); // simple polling for live status
    return () => clearInterval(interval);
  }, [router, loadRides]);

  async function requestRide(e) {
    e.preventDefault();
    setError("");
    if (form.pickupZone === form.destinationZone) {
      setError("Pickup and destination must be different zones.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/rides", { method: "POST", body: { ...form, seats: Number(form.seats) } });
      await loadRides();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelRide(id) {
    setError("");
    try {
      await api(`/api/rides/${id}/cancel`, { method: "POST" });
      await loadRides();
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    clearSession();
    router.push("/");
  }

  if (!user) return null;

  const activeRide = rides.find((r) => !["COMPLETED", "CANCELLED"].includes(r.status));

  return (
    <div>
      <h1>Hi {user.name} 👋</h1>
      <p className="subtitle">Request a ride and watch it get pooled in real time.</p>
      <button className="secondary" onClick={logout} type="button">Log out</button>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Request a ride</h3>
        <form onSubmit={requestRide}>
          <label>Pickup zone</label>
          <select value={form.pickupZone} onChange={(e) => setForm((f) => ({ ...f, pickupZone: e.target.value }))}>
            {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>

          <label>Destination zone</label>
          <select value={form.destinationZone} onChange={(e) => setForm((f) => ({ ...f, destinationZone: e.target.value }))}>
            {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>

          <label>Seats</label>
          <select value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading || !!activeRide}>
            {activeRide ? "You already have an active ride" : loading ? "Requesting..." : "Request ride"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Your rides</h3>
        {rides.length === 0 && <p className="muted">No rides yet — request one above.</p>}
        {rides.map((r) => (
          <div className="ride-row" key={r.id}>
            <div>
              <div>
                <strong>{r.pickupZone}</strong> → <strong>{r.destinationZone}</strong>{" "}
                <span className={`badge ${r.status.toLowerCase()}`}>{r.status.replace("_", " ")}</span>
              </div>
              <div className="muted">
                {r.seats} seat(s) · est. {paisaToTaka(r.estimatedFarePaisa)}
                {r.finalFarePaisa != null && ` · final ${paisaToTaka(r.finalFarePaisa)}`}
                {r.pool?.vehicle && ` · driver: ${r.pool.vehicle.driver.name} (${r.pool.vehicle.name})`}
              </div>
            </div>
            {["REQUESTED", "MATCHED", "DRIVER_ARRIVED"].includes(r.status) && (
              <button className="secondary" onClick={() => cancelRide(r.id)} type="button">
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
