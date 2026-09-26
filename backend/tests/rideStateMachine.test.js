require("./setup");
const { canTransition } = require("../src/services/ride.service");

describe("ride.service — state machine (PRD lifecycle)", () => {
  test("allows the documented happy path", () => {
    expect(canTransition("REQUESTED", "MATCHED")).toBe(true);
    expect(canTransition("MATCHED", "DRIVER_ARRIVED")).toBe(true);
    expect(canTransition("DRIVER_ARRIVED", "STARTED")).toBe(true);
    expect(canTransition("STARTED", "COMPLETED")).toBe(true);
  });

  test("allows cancellation before the ride starts", () => {
    expect(canTransition("REQUESTED", "CANCELLED")).toBe(true);
    expect(canTransition("MATCHED", "CANCELLED")).toBe(true);
    expect(canTransition("DRIVER_ARRIVED", "CANCELLED")).toBe(true);
  });

  test("rejects skipping states", () => {
    expect(canTransition("REQUESTED", "STARTED")).toBe(false);
    expect(canTransition("REQUESTED", "COMPLETED")).toBe(false);
    expect(canTransition("MATCHED", "COMPLETED")).toBe(false);
  });

  test("rejects cancelling a ride that already started", () => {
    expect(canTransition("STARTED", "CANCELLED")).toBe(false);
  });

  test("rejects any transition out of a terminal state", () => {
    expect(canTransition("COMPLETED", "STARTED")).toBe(false);
    expect(canTransition("CANCELLED", "MATCHED")).toBe(false);
  });
});
