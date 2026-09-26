# Fare Model & Matching Rule

## Storing money: integer paisa, not decimal

All money in this system is stored as an **integer number of paisa**
(1 Taka = 100 paisa), never as a `float`/`decimal` Taka amount.

Why: floating-point arithmetic cannot represent most decimal fractions
exactly (`0.1 + 0.2 !== 0.3` in every mainstream language), so repeated
fare math on floats silently drifts by fractions of a paisa over many
operations. Using integers means every addition/subtraction/percentage
calculation in `fare.service.js` is exact, and rounding (for the pool
discount) happens exactly once, explicitly, with `Math.round`. We only
convert to a human-readable Taka string (`paisa / 100`) at the very edge —
in the API response formatting / frontend display — never in storage or
in the middle of a calculation.

## The fare formula

```
passengerFare = baseFare + distanceCharge - poolDiscount
```

- `baseFare` = 3000 paisa (৳30) flat, per passenger.
- `distanceCharge` = `hopDistance(pickupZone, destinationZone) * 1500 paisa`
  — "hop distance" is a small predefined lookup table between the 8 zones
  (`backend/src/config/zones.js`), not a real-map distance, per PRD §4.
- `poolDiscount` = **20%** of `(baseFare + distanceCharge)`, applied only if
  this passenger's ride is currently sharing a vehicle with at least one
  other passenger. Solo riders pay full fare.

This is implemented in `backend/src/services/fare.service.js::computeFare`
and directly unit-tested in `backend/tests/fare.test.js`.

## Worked example — Nusrat & Rafiq (the PRD's own scenario)

Nusrat: Banani → Mohakhali. Rafiq: Banani → Gulshan 1. Both requested within
two minutes of each other; Jashim's Bullet picks both up.

1. **Matching check** — do they pass the compatibility rule below? Yes:
   same pickup zone (`BANANI`), and `MOHAKHALI` / `GULSHAN` are both in the
   "Gulshan-Mohakhali Corridor" group. → They get pooled onto one `Pool`.

2. **Nusrat's fare:**
   - `hopDistance(BANANI, MOHAKHALI) = 1`
   - `distanceCharge = 1 * 1500 = 1500`
   - `subtotal = 3000 + 1500 = 4500` paisa
   - pooled → `poolDiscount = round(4500 * 0.20) = 900` paisa
   - **`fare = 4500 - 900 = 3600` paisa = ৳36.00**

3. **Rafiq's fare:**
   - `hopDistance(BANANI, GULSHAN) = 1`
   - `distanceCharge = 1 * 1500 = 1500`
   - `subtotal = 3000 + 1500 = 4500` paisa
   - pooled → `poolDiscount = 900` paisa
   - **`fare = 3600` paisa = ৳36.00**

You can verify this by hand against `backend/tests/fare.test.js`, or live by
signing in as Nusrat and Rafiq, requesting those two rides, and having
Jashim accept both — the API recomputes and returns exactly these numbers.

If either had ridden solo, their fare would have stayed **৳45.00**
(no discount) — pooling saves each of them ৳9.00 on this trip.

## Matching / compatibility rule (documented, PRD §4)

Two ride requests are pool-compatible if and only if:

1. They share the **exact same pickup zone**, AND
2. Their destination zones are **either identical, or in the same
   "corridor group"** — a small documented list of zones considered close
   enough along the same route that one driver can serve both without a
   large detour:

   - Gulshan–Mohakhali Corridor: `GULSHAN`, `MOHAKHALI`, `BASHUNDHARA`
   - Dhanmondi–Farmgate Corridor: `DHANMONDI`, `FARMGATE`
   - `MIRPUR`, `UTTARA`, `BANANI` are each their own standalone group
     (no other zone is "close enough" along their route in this MVP)

This lives in `backend/src/config/zones.js::isCompatible` and is applied
consistently everywhere a pool is formed (`pool.service.js`,
`driver.routes.js`). It's intentionally simple and hand-verifiable — a real
system would replace it with actual route-corridor geometry, but per PRD
§4 that's explicitly out of scope for this MVP.
