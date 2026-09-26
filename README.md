# Dhaka Tesla Pool

> Share a seat. Split the fare. Survive Dhaka traffic.

A ride-pooling MVP built around Jashim (driver, owns a 3-seat battery rickshaw
nicknamed "Bullet"), Nusrat and Rafiq (two strangers whose overlapping-but-not-identical
trips get pooled into one ride), and Shirin (who shows up thirty seconds too late
for the last seat — a live demo of the concurrency problem in Section 14 of the PRD).

## 1. Summary

Passengers request a ride (pickup zone, destination zone, seats). The system tries
to **pool** compatible requests onto one vehicle, enforces that occupied seats never
exceed the vehicle's capacity (even under concurrent requests), computes each
passenger's **individual** fare, and tracks the ride through a clear lifecycle that
both the passenger and the driver can see (but only their own slice of it).

## 2. Problem Statement

See `docs/PRD.md` for the original brief. In short: build Passenger, Driver/Tesla,
and Ride/Pool flows with correct state transitions, per-passenger fares, pool
capacity enforcement under concurrency, and a full history trail — without
building a real routing engine.

## 3. Features Implemented

- Passenger: sign up / sign in (JWT), request a ride, see an **estimated fare**
  before confirming, track ride status live (`REQUESTED → MATCHED → DRIVER_ARRIVED
  → STARTED → COMPLETED`, or `CANCELLED`), view ride history, cancel while valid.
- Driver: sign in, go online/offline, own one vehicle ("Tesla") with a fixed seat
  capacity, see matching/relevant requests, accept a ride (which may pool multiple
  passengers), mark arrival / start / complete, see current passengers+seats and
  ride history.
- Pooling: two requests can share one vehicle only if they pass the matching rule
  (same pickup zone + compatible destination corridor — see `docs/FARE_AND_MATCHING.md`).
  Seats are enforced atomically so pool capacity can never be exceeded, even when
  two passengers (Nusrat and Shirin) both grab for the last seat at the same instant.
- Fares: `passengerFare = baseFare + distanceCharge - poolDiscount`, stored as
  **integer paisa**, computed per-passenger (not split evenly) — see
  `docs/FARE_AND_MATCHING.md` for the worked example with Nusrat & Rafiq's trip.
- Auth/authorization: a passenger can only see/cancel their own ride; a driver can
  only manage rides on their own vehicle.
- Seed data / demo cast: Jashim + Bullet (driver/vehicle), Nusrat, Rafiq, Shirin
  (passengers) — used consistently in seed data, tests, and the README.

## 4. Architecture

See `docs/ARCHITECTURE.md` for the Mermaid diagram
(`Browser → Next.js → Node/Express API → PostgreSQL`) and `docs/ERD.md` for the
entity-relationship diagram. No microservices, no queues, no Redis — a monolith
is the right size for this MVP (see Section 7 justification in `docs/ARCHITECTURE.md`).

## 5. Tech Stack

| Layer | Choice | Why (full justification in docs/ARCHITECTURE.md §Tech Choices) |
|---|---|---|
| Frontend | Next.js (App Router), plain fetch, no CSS framework | routing + SSR out of the box, mandated by PRD |
| Backend | Node.js + Express | small surface area, easy to explain line-by-line, mandated Node.js |
| Database | PostgreSQL | relational integrity for capacity/foreign keys/money; recommended in PRD |
| ORM | Prisma | type-safe migrations, easy seed scripts, good fit for a small relational schema |
| Auth | JWT (jsonwebtoken) + bcrypt | stateless, no session store needed for an MVP monolith |
| Tests | Jest + Supertest | fast, standard for Node/Express |
| Hosting | Docker Compose locally; Render/Railway free tier for public deploy (see docs) | free-tier only per PRD |

## 6. Project Structure

```
dhaka-tesla-pool/
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── routes/        (auth, rides, driver)
│   │   ├── controllers/
│   │   ├── services/      (fare.service, pool.service, ride.service)
│   │   ├── middleware/    (auth, error handling)
│   │   ├── config/
│   │   └── app.js, server.js
│   ├── prisma/            (schema.prisma, seed.js, migrations/)
│   ├── tests/
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/                (Next.js App Router pages)
│   ├── components/
│   ├── lib/
│   ├── Dockerfile
│   └── .env.example
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── ERD.md
    ├── FARE_AND_MATCHING.md
    └── GIT_WORKFLOW.md
```

## 7. Environment Variables

Backend (`backend/.env`, copy from `backend/.env.example`):
```
DATABASE_URL=postgresql://postgres:postgres@db:5432/dhaka_tesla_pool
JWT_SECRET=change-me-in-real-life
PORT=4000
```
Frontend (`frontend/.env`, copy from `frontend/.env.example`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```
**Never commit real `.env` files** — only `.env.example` is checked in.

## 8. Running It

### Option A — Docker Compose (recommended, matches submission requirement)
```bash
docker compose up --build
```
This starts: `db` (Postgres, with a health check), `backend` (runs migrations +
seed automatically on boot, then serves on :4000), `frontend` (serves on :3000).

Then open http://localhost:3000

### Option B — Run locally without Docker
```bash
# 1. Start Postgres yourself (or use Docker just for the db):
docker run --name tesla-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dhaka_tesla_pool -p 5432:5432 -d postgres:16

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev          # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev           # http://localhost:3000
```

## 9. Demo Credentials (from seed data)

| Role | Name | Email | Password |
|---|---|---|---|
| Driver | Jashim (owns Bullet, 3 seats) | jashim@teslapool.dhaka | password123 |
| Passenger | Nusrat | nusrat@teslapool.dhaka | password123 |
| Passenger | Rafiq | rafiq@teslapool.dhaka | password123 |
| Passenger | Shirin | shirin@teslapool.dhaka | password123 |

## 10. Tests

```bash
cd backend
npm test
```
Covers (see `backend/tests/`):
- Bullet's capacity can never be exceeded (including the concurrent Nusrat-vs-Shirin
  last-seat race, run as parallel requests).
- Invalid state transitions are rejected (e.g. can't `COMPLETE` a `REQUESTED` ride).
- Nusrat's and Rafiq's pooled fares calculate correctly against the worked example
  in `docs/FARE_AND_MATCHING.md`.
- A passenger cannot view or cancel another passenger's ride.
- Cancellation is rejected once a ride has moved past `MATCHED`.

## 11. API Overview

All endpoints are prefixed `/api`. Auth via `Authorization: Bearer <token>`.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /api/auth/signup | anyone | create passenger or driver account |
| POST | /api/auth/login | anyone | get a JWT |
| GET | /api/zones | anyone | list of predefined Dhaka zones |
| POST | /api/rides | passenger | request a ride (returns estimated fare) |
| GET | /api/rides/mine | passenger | this passenger's ride history + live ride |
| POST | /api/rides/:id/cancel | passenger (owner) | cancel while status allows it |
| PATCH | /api/driver/online | driver | toggle online/offline |
| GET | /api/driver/requests | driver | ride requests matching their zone/vehicle right now |
| POST | /api/driver/rides/:id/accept | driver | accept a request (creates/joins a pool) |
| PATCH | /api/driver/rides/:id/arrived | driver | mark DRIVER_ARRIVED |
| PATCH | /api/driver/rides/:id/start | driver | mark STARTED |
| PATCH | /api/driver/rides/:id/complete | driver | mark COMPLETED |
| GET | /api/driver/history | driver | this vehicle's ride/pool history |

## 12. Key Decisions & Trade-offs

- **Fare stored as integer paisa**, not decimal — avoids floating-point rounding
  bugs on money entirely; only formatted to Taka (`amount / 100`) at the API/UI edge.
- **Pooling capacity enforced with an atomic conditional UPDATE inside a DB
  transaction** (`seatsOccupied + newSeats <= capacity`) rather than
  application-level locking — correct under concurrent requests without needing
  Redis or a queue (see `docs/ARCHITECTURE.md` §Concurrency).
- **No real routing/maps** — zones are a predefined enum with a documented
  compatibility table, per Section 4 of the PRD.
- **Monolith, not microservices** — this is a single small team's MVP; splitting
  services now would add operational cost with no corresponding benefit.

## 13. Known Limitations

- Matching is zone-based, not geo-distance-based (acceptable per PRD Section 4).
- No real payments — cash or a simulated in-app wallet balance only.
- No push notifications; the frontend polls for status updates.
- Single vehicle per driver (documented assumption, see `docs/PRD_ASSUMPTIONS.md`).

## 14. Next Improvements

- Real geospatial matching (PostGIS) once zone-based matching stops being enough.
- WebSocket/SSE live updates instead of polling.
- Driver ratings and a real payment gateway integration.

## 15. AI Usage

See `docs/AI_USAGE.md`.

## 16. Deployment

See `docs/DEPLOYMENT.md` for free-tier deployment steps (Render/Railway). Fill in
your live URL there once deployed.

## 17. Demo Video

Link : https://drive.google.com/file/d/1m6bQu1DMZvzAgfOhhWPeCVg8wHJlM3VN/view?usp=sharing

## 18. Bonus: Scaling to 1M Passengers / 100k Drivers

See `docs/SCALING.md`.
