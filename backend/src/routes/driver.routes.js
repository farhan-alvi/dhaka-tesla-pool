const express = require("express");
const { prisma } = require("../config/prisma");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/error.middleware");
const { tryClaimSeats } = require("../services/pool.service");
const { transitionRide } = require("../services/ride.service");
const { computeFare } = require("../services/fare.service");

const router = express.Router();
router.use(requireAuth, requireRole("DRIVER"));

async function getOwnVehicle(driverId) {
  const vehicle = await prisma.vehicle.findUnique({ where: { driverId } });
  if (!vehicle) {
    const err = new Error("This driver has no vehicle registered");
    err.code = "NOT_FOUND";
    throw err;
  }
  return vehicle;
}

// PATCH /api/driver/online  { online: true|false }
router.patch(
  "/online",
  asyncHandler(async (req, res) => {
    const vehicle = await getOwnVehicle(req.user.id);
    const updated = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { isOnline: !!req.body.online },
    });
    res.json({ vehicle: updated });
  })
);

// GET /api/driver/requests — REQUESTED rides this driver could accept
// (i.e. not yet matched to anyone). We don't hard-filter by zone here —
// the driver decides, same as a real dispatch board — but we flag which
// requests are compatible with each other for pooling.
router.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const requests = await prisma.rideRequest.findMany({
      where: { status: "REQUESTED" },
      include: { passenger: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ requests });
  })
);

// POST /api/driver/rides/:id/accept
// Creates a new pool on this driver's vehicle if the request doesn't fit an
// existing open pool of theirs, or joins an existing one of theirs. Seat
// capacity is claimed atomically (see pool.service.tryClaimSeats) so two
// drivers/passengers racing for the last seat cannot both succeed.
router.post(
  "/rides/:id/accept",
  asyncHandler(async (req, res) => {
    const vehicle = await getOwnVehicle(req.user.id);
    const ride = await prisma.rideRequest.findUnique({ where: { id: req.params.id } });
    if (!ride || ride.status !== "REQUESTED") {
      const err = new Error("Ride is not available to accept");
      err.code = "INVALID_TRANSITION";
      throw err;
    }

    // Find (or create) an open pool on THIS driver's vehicle.
    let pool = await prisma.pool.findFirst({
      where: { vehicleId: vehicle.id, status: { in: ["MATCHED", "DRIVER_ARRIVED"] } },
    });
    if (!pool) {
      pool = await prisma.pool.create({ data: { vehicleId: vehicle.id, status: "MATCHED" } });
    }

    const claimed = await tryClaimSeats(pool.id, ride.seats);
    if (!claimed) {
      const err = new Error("Not enough seats left on this vehicle for this request");
      err.code = "CAPACITY_EXCEEDED";
      throw err;
    }

    // Attach the ride to the pool and move it to MATCHED.
    await prisma.rideRequest.update({
      where: { id: ride.id },
      data: { poolId: pool.id },
    });
    await transitionRide(ride.id, "MATCHED", `Accepted by driver, vehicle ${vehicle.name}`);

    // Recompute fares for every passenger currently in this pool: a fare
    // becomes "pooled" (gets the discount) as soon as 2+ passengers share it.
    const poolWithRides = await prisma.pool.findUnique({
      where: { id: pool.id },
      include: { rideRequests: true },
    });
    const isPooled = poolWithRides.rideRequests.length > 1;
    for (const r of poolWithRides.rideRequests) {
      const { farePaisa } = computeFare({
        pickupZone: r.pickupZone,
        destinationZone: r.destinationZone,
        isPooled,
      });
      await prisma.rideRequest.update({
        where: { id: r.id },
        data: { estimatedFarePaisa: farePaisa },
      });
    }

    const finalPool = await prisma.pool.findUnique({
      where: { id: pool.id },
      include: { rideRequests: true, vehicle: true },
    });
    res.json({ pool: finalPool });
  })
);

function poolLifecycleHandler(toStatus) {
  return asyncHandler(async (req, res) => {
    const vehicle = await getOwnVehicle(req.user.id);
    const ride = await prisma.rideRequest.findUnique({ where: { id: req.params.id } });
    if (!ride || !ride.poolId) {
      const err = new Error("Ride is not part of an active pool");
      err.code = "NOT_FOUND";
      throw err;
    }
    const pool = await prisma.pool.findUnique({ where: { id: ride.poolId } });
    if (pool.vehicleId !== vehicle.id) {
      const err = new Error("This pool does not belong to your vehicle");
      err.code = "FORBIDDEN";
      throw err;
    }

    // Move the pool itself...
    const poolTimestampField = {
      DRIVER_ARRIVED: "arrivedAt",
      STARTED: "startedAt",
      COMPLETED: "completedAt",
    }[toStatus];
    await prisma.pool.update({
      where: { id: pool.id },
      data: { status: toStatus, ...(poolTimestampField ? { [poolTimestampField]: new Date() } : {}) },
    });

    // ...and every passenger ride in it, each transition individually
    // validated/audited by ride.service so the history stays honest.
    const rides = await prisma.rideRequest.findMany({ where: { poolId: pool.id } });
    const updated = [];
    for (const r of rides) {
      if (r.status === "CANCELLED") continue; // skip anyone who already cancelled
      const u = await transitionRide(r.id, toStatus, `Driver marked ${toStatus}`);
      if (toStatus === "COMPLETED") {
        await prisma.rideRequest.update({
          where: { id: r.id },
          data: { finalFarePaisa: r.estimatedFarePaisa },
        });
      }
      updated.push(u);
    }

    res.json({ pool: await prisma.pool.findUnique({ where: { id: pool.id }, include: { rideRequests: true } }), updatedRides: updated });
  });
}

router.patch("/rides/:id/arrived", poolLifecycleHandler("DRIVER_ARRIVED"));
router.patch("/rides/:id/start", poolLifecycleHandler("STARTED"));
router.patch("/rides/:id/complete", poolLifecycleHandler("COMPLETED"));

// GET /api/driver/history
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const vehicle = await getOwnVehicle(req.user.id);
    const pools = await prisma.pool.findMany({
      where: { vehicleId: vehicle.id },
      include: { rideRequests: { include: { passenger: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ vehicle, pools });
  })
);

module.exports = router;
