# Assumptions (PRD §17)

The PRD deliberately leaves some things unspecified. Here's what was assumed,
and why — be ready to defend or change any of these in the interview.

1. **One vehicle per driver.** `Vehicle.driverId` is unique. Real ride-pool
   apps sometimes let one driver switch between vehicles, but Jashim only has
   Bullet, and modeling a driver↔vehicle *history* would add complexity the
   MVP doesn't need. If a driver needed multiple vehicles, `driverId` would
   become non-unique and we'd add an `isActive` flag per vehicle.

2. **Estimated fare is quoted at "not pooled" rates.** A passenger's
   `estimatedFarePaisa` is computed assuming no pooling discount at request
   time (since we don't yet know if/how they'll be pooled), then
   *recomputed downward* the moment a driver actually pools them with
   someone else. This means the number a passenger sees can only go down,
   never up — a passenger is never surprised by a higher final fare than
   quoted.

3. **A pool stays open to new passengers until it `STARTED`.** Once the
   driver marks the trip `STARTED`, no new ride request can join that pool
   (even if seats remain) — matches the story ("once you're in a moving
   rickshaw, no one else is jumping in").

4. **A driver can only run one open pool at a time.** `driver.routes.js`
   reuses the driver's existing `MATCHED`/`DRIVER_ARRIVED` pool if one
   exists rather than starting a second — consistent with "Jashim's Bullet
   has three seats", not three vehicles.

5. **Matching is pickup-zone-exact + destination-corridor.** See
   `docs/FARE_AND_MATCHING.md` for the full rule and reasoning.

6. **Passengers can request at most 3 seats** (Bullet's whole capacity) in
   one request — a group booking. Capped in the request validation schema.

7. **Cancellation is disallowed once `STARTED`.** You can't cancel a ride
   that's already physically underway; you can cancel any time before that.
