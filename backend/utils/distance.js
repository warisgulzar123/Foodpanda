/**
 * Haversine Distance & ETA Calculation Engine
 * Foodpanda Commercial Standards
 * - High-precision Earth-radius spherical trigonometry (Haversine formula)
 * - Average motorbike city speed: 25 km/h
 * - Dynamic delivery fee: Base Fare (Rs. 50) + (Distance in KM * Rs. 25/km)
 * - Rider payout: Base Pay (Rs. 50) + (Delivery Distance in KM * Rs. 20/km)
 */

const EARTH_RADIUS_KM = 6371; // Earth's mean radius in kilometers
const DEFAULT_MOTORBIKE_SPEED_KMH = 25; // 25 km/h average speed in urban traffic
const ROAD_FACTOR = 1.15; // 15% road curvature & traffic route adjustment

/**
 * Convert degrees to radians
 * @param {number} deg
 * @returns {number}
 */
function toRad(deg) {
  return (Number(deg) * Math.PI) / 180;
}

/**
 * Calculate distance between two lat/lng coordinates in kilometers (KM).
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @param {object} options - { useRoadFactor: boolean }
 * @returns {number} Distance in KM (rounded to 2 decimal places)
 */
function calculateDistance(lat1, lon1, lat2, lon2, options = { useRoadFactor: true }) {
  const p1Lat = Number(lat1);
  const p1Lon = Number(lon1);
  const p2Lat = Number(lat2);
  const p2Lon = Number(lon2);

  if (
    Number.isNaN(p1Lat) ||
    Number.isNaN(p1Lon) ||
    Number.isNaN(p2Lat) ||
    Number.isNaN(p2Lon)
  ) {
    return 1.5; // Reasonable default fallback
  }

  // Exact same point
  if (p1Lat === p2Lat && p1Lon === p2Lon) {
    return 0.1;
  }

  const dLat = toRad(p2Lat - p1Lat);
  const dLon = toRad(p2Lon - p1Lon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1Lat)) *
      Math.cos(toRad(p2Lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = EARTH_RADIUS_KM * c;

  const finalDist = options.useRoadFactor !== false
    ? straightDistance * ROAD_FACTOR
    : straightDistance;

  // Round to 2 decimal places, minimum 0.1 km
  return Math.max(0.1, Number(finalDist.toFixed(2)));
}

/**
 * Estimate travel duration in minutes based on distance and motorbike speed (25 km/h).
 * Formula: Duration (mins) = (Distance in KM / Speed in KM/H) * 60 minutes + optional prep buffer
 * @param {number} distanceKm - Distance in KM
 * @param {number} speedKmh - Speed in km/h (default 25)
 * @param {number} prepBufferMinutes - Kitchen prep or traffic buffer minutes (default 0)
 * @returns {number} ETA in integer minutes (minimum 1 minute)
 */
function calculateETA(distanceKm, speedKmh = DEFAULT_MOTORBIKE_SPEED_KMH, prepBufferMinutes = 0) {
  const dist = Math.max(0.1, Number(distanceKm) || 0.1);
  const speed = Math.max(5, Number(speedKmh) || DEFAULT_MOTORBIKE_SPEED_KMH);

  // Time in minutes = (distance / speed) * 60
  const travelMinutes = (dist / speed) * 60;
  const totalMinutes = Math.round(travelMinutes + (prepBufferMinutes || 0));

  return Math.max(1, totalMinutes);
}

/**
 * Calculate dynamic customer delivery fee based on distance:
 * Delivery Fee = Base Fare (Rs. 50) + (Distance in KM * Rate per KM (Rs. 25/km))
 * @param {number} distanceKm
 * @param {number} baseFare - Base fare in PKR (default 50)
 * @param {number} ratePerKm - Rate per KM in PKR (default 25)
 * @returns {number} Final Delivery Fee in PKR (integer)
 */
function calculateDeliveryFee(distanceKm, baseFare = 50, ratePerKm = 25) {
  const dist = Math.max(0.2, Number(distanceKm) || 1.0);
  const fee = baseFare + dist * ratePerKm;
  return Math.round(fee);
}

/**
 * Calculate transparent rider payout breakdown based on per-KM rates:
 * Rider Payout = Base Pay (Rs. 50) + (Delivery Distance in KM * Rs. 20/km) + Bonus
 * @param {number} deliveryDistanceKm - Restaurant to customer distance in KM
 * @param {number} basePay - Default Rs. 50
 * @param {number} ratePerKm - Default Rs. 20/km
 * @param {number} bonusTip - Optional bonus tip
 * @returns {{ baseFare: number, distancePay: number, ratePerKm: number, bonusTip: number, totalEarning: number }}
 */
function calculateRiderEarnings(
  deliveryDistanceKm,
  basePay = 50,
  ratePerKm = 20,
  bonusTip = 0
) {
  const dist = Math.max(0.2, Number(deliveryDistanceKm) || 1.0);
  const distancePay = Math.round(dist * ratePerKm);
  const total = basePay + distancePay + (Number(bonusTip) || 0);

  return {
    baseFare: basePay,
    distanceKm: Number(dist.toFixed(1)),
    ratePerKm,
    distancePay,
    bonusTip: Number(bonusTip) || 0,
    totalEarning: total,
  };
}

/**
 * Format distance in a human readable format
 * e.g., 0.65 km -> "650 m", 3.42 km -> "3.4 km"
 * @param {number} distanceKm
 * @returns {string}
 */
function formatDistance(distanceKm) {
  const dist = Number(distanceKm) || 0;
  if (dist < 1) {
    return `${Math.round(dist * 1000)} m`;
  }
  return `${dist.toFixed(1)} km`;
}

/**
 * Format ETA and distance combined for customer live tracking banner:
 * e.g., "Estimated Arrival: 14 mins (3.2 km away)"
 * @param {number} etaMinutes
 * @param {number} distanceKm
 * @returns {string}
 */
function formatETABanner(etaMinutes, distanceKm) {
  const mins = Math.max(1, Math.round(etaMinutes));
  const distText = formatDistance(distanceKm);
  return `Estimated Arrival: ${mins} mins (${distText} away)`;
}

module.exports = {
  calculateDistance,
  calculateETA,
  calculateDeliveryFee,
  calculateRiderEarnings,
  formatDistance,
  formatETABanner,
  EARTH_RADIUS_KM,
  DEFAULT_MOTORBIKE_SPEED_KMH,
};
