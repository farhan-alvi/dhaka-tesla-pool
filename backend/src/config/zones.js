// Predefined Dhaka zones (PRD Section 4: "a predefined list of Dhaka areas").
// No real map/geocoding — each zone just gets a rough "hop distance" from
// every other zone, used only to keep the fare model testable by hand.

const ZONES = [
  "BANANI",
  "GULSHAN",
  "MOHAKHALI",
  "DHANMONDI",
  "MIRPUR",
  "UTTARA",
  "FARMGATE",
  "BASHUNDHARA",
];

// Hop distance table (symmetric). Values are "zone hops", not real km —
// documented and used consistently everywhere fare/matching is computed.
// This keeps the PRD's Nusrat/Rafiq example easy to verify by hand.
const HOPS = {
  BANANI:      { BANANI: 0, GULSHAN: 1, MOHAKHALI: 1, DHANMONDI: 4, MIRPUR: 3, UTTARA: 3, FARMGATE: 3, BASHUNDHARA: 2 },
  GULSHAN:     { BANANI: 1, GULSHAN: 0, MOHAKHALI: 2, DHANMONDI: 4, MIRPUR: 4, UTTARA: 4, FARMGATE: 3, BASHUNDHARA: 1 },
  MOHAKHALI:   { BANANI: 1, GULSHAN: 2, MOHAKHALI: 0, DHANMONDI: 3, MIRPUR: 2, UTTARA: 3, FARMGATE: 2, BASHUNDHARA: 2 },
  DHANMONDI:   { BANANI: 4, GULSHAN: 4, MOHAKHALI: 3, DHANMONDI: 0, MIRPUR: 2, UTTARA: 6, FARMGATE: 1, BASHUNDHARA: 5 },
  MIRPUR:      { BANANI: 3, GULSHAN: 4, MOHAKHALI: 2, DHANMONDI: 2, MIRPUR: 0, UTTARA: 3, FARMGATE: 2, BASHUNDHARA: 5 },
  UTTARA:      { BANANI: 3, GULSHAN: 4, MOHAKHALI: 3, DHANMONDI: 6, MIRPUR: 3, UTTARA: 0, FARMGATE: 5, BASHUNDHARA: 2 },
  FARMGATE:    { BANANI: 3, GULSHAN: 3, MOHAKHALI: 2, DHANMONDI: 1, MIRPUR: 2, UTTARA: 5, FARMGATE: 0, BASHUNDHARA: 4 },
  BASHUNDHARA: { BANANI: 2, GULSHAN: 1, MOHAKHALI: 2, DHANMONDI: 5, MIRPUR: 5, UTTARA: 2, FARMGATE: 4, BASHUNDHARA: 0 },
};

// Matching rule (documented, PRD Section 4):
// Two ride requests are pool-compatible if:
//   1. They share the exact same pickupZone, AND
//   2. Their destinationZones are in the same "corridor group" below
//      (i.e. a driver heading that way passes close enough to both).
// This is why Nusrat (Banani -> Mohakhali) and Rafiq (Banani -> Gulshan)
// can share Bullet: both destinations sit in the "Gulshan-Mohakhali Corridor".
const CORRIDOR_GROUPS = [
  ["GULSHAN", "MOHAKHALI", "BASHUNDHARA"],     // Gulshan-Mohakhali Corridor
  ["DHANMONDI", "FARMGATE"],                   // Dhanmondi-Farmgate Corridor
  ["MIRPUR"],                                  // Mirpur (standalone)
  ["UTTARA"],                                  // Uttara (standalone)
  ["BANANI"],                                  // Banani as a destination (standalone)
];

function corridorOf(zone) {
  return CORRIDOR_GROUPS.find((group) => group.includes(zone));
}

function isCompatible(reqA, reqB) {
  if (reqA.pickupZone !== reqB.pickupZone) return false;
  if (reqA.destinationZone === reqB.destinationZone) return true;
  const corridorA = corridorOf(reqA.destinationZone);
  return !!corridorA && corridorA.includes(reqB.destinationZone);
}

function hopDistance(zoneA, zoneB) {
  return HOPS[zoneA]?.[zoneB] ?? 5; // default to 5 hops if unknown pair
}

module.exports = { ZONES, HOPS, CORRIDOR_GROUPS, corridorOf, isCompatible, hopDistance };
