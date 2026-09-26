const { hopDistance } = require("../config/zones");

// All amounts are integer paisa. 1 Taka = 100 paisa.
// passengerFare = baseFare + distanceCharge - poolDiscount
//
//   baseFare        = 3000 paisa (30 Tk) flat
//   distanceCharge  = hopDistance(pickup, destination) * 1500 paisa (15 Tk/hop)
//   poolDiscount    = 20% of (baseFare + distanceCharge) IF this passenger is
//                     sharing the vehicle with at least one other passenger,
//                     otherwise 0.
//
// Worked example (see docs/FARE_AND_MATCHING.md for the full walkthrough):
//   Nusrat:  Banani -> Mohakhali, hop = 1
//     base 3000 + distance 1500 = 4500; pooled -> discount 900 -> fare 3600 paisa (36 Tk)
//   Rafiq:   Banani -> Gulshan, hop = 1
//     base 3000 + distance 1500 = 4500; pooled -> discount 900 -> fare 3600 paisa (36 Tk)

const BASE_FARE_PAISA = 3000;
const PER_HOP_PAISA = 1500;
const POOL_DISCOUNT_RATE = 0.2;

function computeFare({ pickupZone, destinationZone, isPooled }) {
  const distance = hopDistance(pickupZone, destinationZone);
  const distanceCharge = distance * PER_HOP_PAISA;
  const subtotal = BASE_FARE_PAISA + distanceCharge;
  const poolDiscount = isPooled ? Math.round(subtotal * POOL_DISCOUNT_RATE) : 0;
  const fare = subtotal - poolDiscount;
  return {
    baseFarePaisa: BASE_FARE_PAISA,
    distanceChargePaisa: distanceCharge,
    poolDiscountPaisa: poolDiscount,
    farePaisa: fare,
  };
}

function toTaka(paisa) {
  return (paisa / 100).toFixed(2);
}

module.exports = { computeFare, toTaka, BASE_FARE_PAISA, PER_HOP_PAISA, POOL_DISCOUNT_RATE };
