const { prisma } = require("../config/prisma");
const { isCompatible } = require("../config/zones");

/**
 * Concurrency problem (PRD Section 14): Bullet has 1 seat left. Nusrat and
 * Shirin both try to claim it at nearly the same instant, and both initially
 * see one seat available.
 *
 * How we solve it here WITHOUT app-level locks, distributed locks, or Redis:
 * we do a single atomic conditional UPDATE, inside a DB transaction, that
 * only succeeds if the capacity check still holds at write time:
 *
 *   UPDATE pools
 *   SET "seatsOccupied" = "seatsOccupied" + $seats
 *   WHERE id = $poolId AND "seatsOccupied" + $seats <= capacity
 *
 * Postgres guarantees this single statement is atomic — two concurrent
 * transactions attempting to overbook the last seat cannot both succeed;
 * exactly one UPDATE affects a row, the other affects zero rows and we
 * treat that as "seat no longer available" and fall back to assigning a
 * fresh pool (or rejecting, depending on the caller).
 *
 * At larger scale (see docs/SCALING.md) this would become a reservation
 * queue / distributed lock (e.g. Redis Redlock) or a dedicated seat-ledger
 * service, but for this MVP's traffic a single Postgres row is enough.
 */
async function tryClaimSeats(poolId, seats) {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE pools
     SET "seatsOccupied" = "seatsOccupied" + $1
     WHERE id = $2
       AND "seatsOccupied" + $1 <= (
         SELECT capacity FROM vehicles WHERE vehicles.id = pools."vehicleId"
       )
       AND status IN ('MATCHED', 'DRIVER_ARRIVED')
     RETURNING id, "seatsOccupied"`,
    seats,
    poolId
  );
  return rows.length > 0; // true = seat(s) successfully claimed
}

/**
 * Find an existing open pool (on an online vehicle) that this ride request
 * is compatible with and that has room, OR return null if none exists.
 * "Open" = still accepting passengers (MATCHED / DRIVER_ARRIVED, not STARTED).
 */
async function findCompatiblePool(rideRequest) {
  const candidatePools = await prisma.pool.findMany({
    where: {
      status: { in: ["MATCHED", "DRIVER_ARRIVED"] },
      vehicle: { isOnline: true },
    },
    include: { vehicle: true, rideRequests: true },
  });

  for (const pool of candidatePools) {
    const remaining = pool.vehicle.capacity - pool.seatsOccupied;
    if (remaining < rideRequest.seats) continue;
    const compatibleWithAll = pool.rideRequests.every((existing) =>
      isCompatible(existing, rideRequest)
    );
    if (compatibleWithAll) return pool;
  }
  return null;
}

module.exports = { tryClaimSeats, findCompatiblePool };
