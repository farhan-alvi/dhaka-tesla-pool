const express = require("express");
const { z } = require("zod");
const { prisma } = require("../config/prisma");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/error.middleware");
const { computeFare } = require("../services/fare.service");
const { transitionRide } = require("../services/ride.service");
const { ZONES } = require("../config/zones");

const router = express.Router();
router.use(requireAuth, requireRole("PASSENGER"));

const requestSchema = z.object({
  pickupZone: z.enum(ZONES),
  destinationZone: z.enum(ZONES),
  seats: z.number().int().min(1).max(3).default(1),
});

// POST /api/rides — request a ride, returns an *estimated* fare.
// (Actual pooling/matching happens when a driver accepts it — see
// driver.routes.js — because whether it ends up pooled isn't known yet.)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = new Error(parsed.error.errors.map((e) => e.message).join(", "));
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    const { pickupZone, destinationZone, seats } = parsed.data;
    if (pickupZone === destinationZone) {
      const err = new Error("Pickup and destination zones must differ");
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    // Estimate assuming NOT pooled (worst case, so the passenger is never
    // surprised by a higher-than-shown final fare — pooling can only save
    // them money, applied when a pool actually forms in driver.service).
    const { farePaisa } = computeFare({ pickupZone, destinationZone, isPooled: false });

    const ride = await prisma.rideRequest.create({
      data: {
        passengerId: req.user.id,
        pickupZone,
        destinationZone,
        seats,
        estimatedFarePaisa: farePaisa,
      },
    });

    await prisma.rideStatusEvent.create({
      data: { rideRequestId: ride.id, toStatus: "REQUESTED", note: "Ride requested" },
    });

    res.status(201).json({ ride });
  })
);

// GET /api/rides/mine — history + any currently active ride.
router.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const rides = await prisma.rideRequest.findMany({
      where: { passengerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        pool: { include: { vehicle: { include: { driver: true } } } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    res.json({ rides });
  })
);

// POST /api/rides/:id/cancel — only the owning passenger, only while status
// allows it (REQUESTED / MATCHED / DRIVER_ARRIVED — not after STARTED).
router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const ride = await prisma.rideRequest.findUnique({ where: { id: req.params.id } });
    if (!ride) {
      const err = new Error("Ride not found");
      err.code = "NOT_FOUND";
      throw err;
    }
    if (ride.passengerId !== req.user.id) {
      const err = new Error("You can only cancel your own ride");
      err.code = "FORBIDDEN";
      throw err;
    }
    const updated = await transitionRide(req.params.id, "CANCELLED", "Cancelled by passenger");
    res.json({ ride: updated });
  })
);

module.exports = router;
