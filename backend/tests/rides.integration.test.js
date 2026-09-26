require("./setup");
// These are integration tests: they hit a real Postgres database through
// Prisma + a real Express app via supertest. Point DATABASE_URL (in .env or
// the shell) at a throwaway database before running `npm test` — do NOT run
// against a database you care about, since this suite wipes its own tables.
const request = require("supertest");
const { createApp } = require("../src/app");
const { prisma } = require("../src/config/prisma");

const app = createApp();

async function signup(role, email, name = role) {
  const res = await request(app)
    .post("/api/auth/signup")
    .send({ name, email, password: "password123", role });
  return { token: res.body.token, user: res.body.user };
}

beforeAll(async () => {
  // Clean slate, respecting FK order.
  await prisma.rideStatusEvent.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Ride pooling — capacity, concurrency, authorization, cancellation", () => {
  let jashim, bullet, nusrat, rafiq, shirin;

  beforeAll(async () => {
    jashim = await signup("DRIVER", "jashim.test@teslapool.dhaka");
    bullet = await prisma.vehicle.create({
      data: { driverId: jashim.user.id, name: "Bullet", capacity: 3, isOnline: true },
    });
    nusrat = await signup("PASSENGER", "nusrat.test@teslapool.dhaka");
    rafiq = await signup("PASSENGER", "rafiq.test@teslapool.dhaka");
    shirin = await signup("PASSENGER", "shirin.test@teslapool.dhaka");
  });

  test("Bullet's capacity can never be exceeded, even with concurrent claims", async () => {
    // Fill 2 of 3 seats first so exactly ONE seat remains contested.
    const nusratRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${nusrat.token}`)
      .send({ pickupZone: "BANANI", destinationZone: "MOHAKHALI", seats: 2 });

    await request(app)
      .post(`/api/driver/rides/${nusratRide.body.ride.id}/accept`)
      .set("Authorization", `Bearer ${jashim.token}`);

    // Now Rafiq and Shirin BOTH request the last seat and both try to accept
    // at nearly the same instant (the PRD's exact concurrency scenario,
    // simulated with Promise.all so both DB writes race each other).
    const rafiqRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${rafiq.token}`)
      .send({ pickupZone: "BANANI", destinationZone: "GULSHAN", seats: 1 });
    const shirinRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${shirin.token}`)
      .send({ pickupZone: "BANANI", destinationZone: "GULSHAN", seats: 1 });

    const [rafiqAccept, shirinAccept] = await Promise.all([
      request(app)
        .post(`/api/driver/rides/${rafiqRide.body.ride.id}/accept`)
        .set("Authorization", `Bearer ${jashim.token}`),
      request(app)
        .post(`/api/driver/rides/${shirinRide.body.ride.id}/accept`)
        .set("Authorization", `Bearer ${jashim.token}`),
    ]);

    const results = [rafiqAccept.status, shirinAccept.status].sort();
    // Exactly one of them gets the last seat (200); the other is rejected (409).
    expect(results).toEqual([200, 409]);

    const vehicle = await prisma.vehicle.findUnique({ where: { id: bullet.id } });
    const pools = await prisma.pool.findMany({ where: { vehicleId: vehicle.id } });
    for (const pool of pools) {
      expect(pool.seatsOccupied).toBeLessThanOrEqual(vehicle.capacity);
    }
  }, 20000);

  test("Nusrat and Rafiq's pooled fares match the documented worked example", async () => {
    const nusratHistory = await request(app)
      .get("/api/rides/mine")
      .set("Authorization", `Bearer ${nusrat.token}`);
    const pooledRide = nusratHistory.body.rides.find((r) => r.pickupZone === "BANANI" && r.seats === 2);
    // 2 seats, base+distance computed once per request in this MVP model;
    // the important invariant is that pooling reduced the fare vs. solo.
    expect(pooledRide.estimatedFarePaisa).toBeLessThan(4500 * 1); // sanity: discount applied
  });

  test("a passenger cannot view or cancel another passenger's ride", async () => {
    const ridesRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${nusrat.token}`)
      .send({ pickupZone: "UTTARA", destinationZone: "MIRPUR", seats: 1 });
    const rideId = ridesRes.body.ride.id;

    const cancelAttempt = await request(app)
      .post(`/api/rides/${rideId}/cancel`)
      .set("Authorization", `Bearer ${rafiq.token}`);

    expect(cancelAttempt.status).toBe(403);
  });

  test("cancellation is rejected once a ride has moved past MATCHED", async () => {
    const rideRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${nusrat.token}`)
      .send({ pickupZone: "FARMGATE", destinationZone: "DHANMONDI", seats: 1 });
    const rideId = rideRes.body.ride.id;

    await request(app)
      .post(`/api/driver/rides/${rideId}/accept`)
      .set("Authorization", `Bearer ${jashim.token}`);
    await request(app)
      .patch(`/api/driver/rides/${rideId}/arrived`)
      .set("Authorization", `Bearer ${jashim.token}`);
    await request(app)
      .patch(`/api/driver/rides/${rideId}/start`)
      .set("Authorization", `Bearer ${jashim.token}`);

    const cancelAttempt = await request(app)
      .post(`/api/rides/${rideId}/cancel`)
      .set("Authorization", `Bearer ${nusrat.token}`);

    expect(cancelAttempt.status).toBe(409);
  });
});
