const { prisma } = require("../config/prisma");

// The only legal transitions. Anything not listed here is rejected with a
// 409, which is exactly what backend/tests/rideStateMachine.test.js checks.
const ALLOWED_TRANSITIONS = {
  REQUESTED: ["MATCHED", "CANCELLED"],
  MATCHED: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["STARTED", "CANCELLED"],
  STARTED: ["COMPLETED"], // cannot cancel mid-ride
  COMPLETED: [],
  CANCELLED: [],
};

function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Moves a ride request to a new status, writing an audit event, inside a
 * transaction. Throws a StateError (with .code) on an illegal transition so
 * the controller can respond 409.
 */
async function transitionRide(rideRequestId, toStatus, note) {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.rideRequest.findUnique({ where: { id: rideRequestId } });
    if (!ride) {
      const err = new Error("Ride not found");
      err.code = "NOT_FOUND";
      throw err;
    }
    if (!canTransition(ride.status, toStatus)) {
      const err = new Error(`Cannot move ride from ${ride.status} to ${toStatus}`);
      err.code = "INVALID_TRANSITION";
      throw err;
    }

    const timestampField = {
      MATCHED: "matchedAt",
      CANCELLED: "cancelledAt",
      COMPLETED: "completedAt",
    }[toStatus];

    const updated = await tx.rideRequest.update({
      where: { id: rideRequestId },
      data: {
        status: toStatus,
        ...(timestampField ? { [timestampField]: new Date() } : {}),
      },
    });

    await tx.rideStatusEvent.create({
      data: {
        rideRequestId,
        fromStatus: ride.status,
        toStatus,
        note,
      },
    });

    return updated;
  });
}

module.exports = { transitionRide, canTransition, ALLOWED_TRANSITIONS };
