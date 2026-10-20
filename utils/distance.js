/**
 * Frontend Distance, ETA, and Earnings Utility
 * Mirrors backend calculation engine for real-time client-side updates
 */

const EARTH_RADIUS_KM = 6371;
const DEFAULT_MOTORBIKE_SPEED_KMH = 25; // 25 km/h
const ROAD_FACTOR = 1.15;

function toRad(deg) {
  return (Number(deg) * Math.PI) / 180;
}

/**
 * Calculate distance between two lat/lng points in kilometers (KM)
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @param {boolean} useRoadFactor - default true
 * @returns {number} distance in KM
 */
export function calculateDistance(lat1, lon1, lat2, lon2, useRoadFactor = true) {
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
    return 1.5;
  }

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
  const finalDist = useRoadFactor ? straightDistance * ROAD_FACTOR : straightDistance;

  return Math.max(0.1, Number(finalDist.toFixed(2)));
}

/**
 * Estimate travel duration in minutes based on distance and motorbike speed (25 km/h).
 * Formula: Duration (mins) = (Distance in KM / 25 km/h) * 60 minutes
 * @param {number} distanceKm
 * @param {number} speedKmh - Default 25 km/h
 * @param {number} prepBuffer - Optional buffer minutes
 * @returns {number}
 */
export function calculateETA(distanceKm, speedKmh = DEFAULT_MOTORBIKE_SPEED_KMH, prepBuffer = 0) {
  const dist = Math.max(0.1, Number(distanceKm) || 0.1);
  const speed = Math.max(5, Number(speedKmh) || DEFAULT_MOTORBIKE_SPEED_KMH);

  const travelMinutes = (dist / speed) * 60;
  return Math.max(1, Math.round(travelMinutes + prepBuffer));
}

/**
 * Dynamic delivery fee calculation:
 * Base Fare (Rs. 50) + (Distance in KM * Rs. 25/km)
 */
export function calculateDeliveryFee(distanceKm, baseFare = 50, ratePerKm = 25) {
  const dist = Math.max(0.2, Number(distanceKm) || 1.0);
  return Math.round(baseFare + dist * ratePerKm);
}

/**
 * Rider earnings calculation:
 * Base Pay (Rs. 50) + (Distance in KM * Rs. 20/km) + bonus
 */
export function calculateRiderEarnings(
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
 */
export function formatDistance(distanceKm) {
  const dist = Number(distanceKm) || 0;
  if (dist < 1) {
    return `${Math.round(dist * 1000)} m`;
  }
  return `${dist.toFixed(1)} km`;
}

/**
 * Format ETA banner:
 * "Estimated Arrival: X mins (Y.Y km away)"
 */
export function formatETABanner(etaMinutes, distanceKm) {
  const mins = Math.max(1, Math.round(etaMinutes));
  const distText = formatDistance(distanceKm);
  return `Estimated Arrival: ${mins} mins (${distText} away)`;
}
