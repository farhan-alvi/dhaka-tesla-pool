# Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o| VEHICLE : "owns (if DRIVER)"
    USER ||--o{ RIDE_REQUEST : "makes (if PASSENGER)"
    VEHICLE ||--o{ POOL : "runs"
    POOL ||--o{ RIDE_REQUEST : "carries"
    RIDE_REQUEST ||--o{ RIDE_STATUS_EVENT : "has history"

    USER {
        uuid id PK
        string name
        string email UK
        string passwordHash
        enum role "PASSENGER | DRIVER"
        string phone
        int walletPaisa
        datetime createdAt
    }

    VEHICLE {
        uuid id PK
        uuid driverId FK "unique - one vehicle per driver"
        string name "e.g. Bullet"
        int capacity
        boolean isOnline
        datetime createdAt
    }

    POOL {
        uuid id PK
        uuid vehicleId FK
        enum status "MATCHED..COMPLETED/CANCELLED"
        int seatsOccupied
        datetime createdAt
        datetime arrivedAt
        datetime startedAt
        datetime completedAt
        datetime cancelledAt
    }

    RIDE_REQUEST {
        uuid id PK
        uuid passengerId FK
        enum pickupZone
        enum destinationZone
        int seats
        enum status "REQUESTED..COMPLETED/CANCELLED"
        uuid poolId FK "nullable until matched"
        int estimatedFarePaisa
        int finalFarePaisa "nullable until completed"
        enum paymentMethod "CASH | WALLET"
        datetime createdAt
        datetime matchedAt
        datetime cancelledAt
        datetime completedAt
    }

    RIDE_STATUS_EVENT {
        uuid id PK
        uuid rideRequestId FK
        enum fromStatus "nullable"
        enum toStatus
        datetime createdAt
        string note
    }
```

## Why this shape

- `Vehicle.driverId` is `@unique` — one driver owns exactly one vehicle in
  this MVP (documented assumption, see `docs/ASSUMPTIONS.md`).
- `Pool` is the "trip" — it exists independently of any one passenger so that
  a second, third passenger can attach to it later (`RideRequest.poolId` is
  nullable and set once a driver accepts).
- Money (`estimatedFarePaisa`, `finalFarePaisa`, `walletPaisa`) is **integer
  paisa everywhere** — never a `DECIMAL`/`FLOAT` — see
  `docs/FARE_AND_MATCHING.md` for why.
- `RideStatusEvent` is append-only and never updated or deleted — it's the
  audit trail the PRD asks for ("hold onto enough history to explain exactly
  what happened, in case anyone asks later").
- Indexes: `ride_requests(passengerId)` and `(poolId)`, and
  `ride_status_events(rideRequestId)` — the three lookups the API actually
  does on every request (a passenger's own rides, a pool's members, a ride's
  history).
