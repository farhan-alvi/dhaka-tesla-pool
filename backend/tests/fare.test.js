require("./setup");
const { computeFare } = require("../src/services/fare.service");

describe("fare.service — Nusrat & Rafiq worked example (docs/FARE_AND_MATCHING.md)", () => {
  test("Nusrat, Banani->Mohakhali, solo: no discount", () => {
    const fare = computeFare({ pickupZone: "BANANI", destinationZone: "MOHAKHALI", isPooled: false });
    // base 3000 + (1 hop * 1500) = 4500
    expect(fare.baseFarePaisa).toBe(3000);
    expect(fare.distanceChargePaisa).toBe(1500);
    expect(fare.poolDiscountPaisa).toBe(0);
    expect(fare.farePaisa).toBe(4500);
  });

  test("Nusrat, Banani->Mohakhali, pooled with Rafiq: 20% discount", () => {
    const fare = computeFare({ pickupZone: "BANANI", destinationZone: "MOHAKHALI", isPooled: true });
    // subtotal 4500, discount 900 (20%) => 3600
    expect(fare.poolDiscountPaisa).toBe(900);
    expect(fare.farePaisa).toBe(3600);
  });

  test("Rafiq, Banani->Gulshan, pooled with Nusrat: 20% discount", () => {
    const fare = computeFare({ pickupZone: "BANANI", destinationZone: "GULSHAN", isPooled: true });
    // hop(BANANI,GULSHAN)=1 -> subtotal 4500, discount 900 -> 3600
    expect(fare.farePaisa).toBe(3600);
  });

  test("fares are always integer paisa (never fractional)", () => {
    const fare = computeFare({ pickupZone: "DHANMONDI", destinationZone: "UTTARA", isPooled: true });
    expect(Number.isInteger(fare.farePaisa)).toBe(true);
  });
});
