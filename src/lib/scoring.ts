/** Haversine great-circle distance in kilometres. */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Extra kilometres a driver (A→B) must travel to pick up (P) and drop off (D) a rider.
 * detour = d(A,P) + d(P,D) + d(D,B) − d(A,B)
 */
export function detourKm(
  aLat: number, aLng: number,
  bLat: number, bLng: number,
  pLat: number, pLng: number,
  dLat: number, dLng: number,
): number {
  const ab = haversineKm(aLat, aLng, bLat, bLng);
  const ap = haversineKm(aLat, aLng, pLat, pLng);
  const pd = haversineKm(pLat, pLng, dLat, dLng);
  const db = haversineKm(dLat, dLng, bLat, bLng);
  return ap + pd + db - ab;
}

/**
 * Pickup-only detour: rider has a pickup (P) but no specified destination.
 * detour = d(A,P) + d(P,B) − d(A,B)
 */
export function pickupOnlyDetourKm(
  aLat: number, aLng: number,
  bLat: number, bLng: number,
  pLat: number, pLng: number,
): number {
  const ab = haversineKm(aLat, aLng, bLat, bLng);
  const ap = haversineKm(aLat, aLng, pLat, pLng);
  const pb = haversineKm(pLat, pLng, bLat, bLng);
  return ap + pb - ab;
}

/** Max allowable detour: 3 km or 20% of the driver's route, whichever is larger. */
export function detourThresholdKm(routeKm: number): number {
  return Math.max(3, routeKm * 0.2);
}

/** Human-readable label for a detour distance. */
export function detourLabel(km: number): string {
  if (km < 0.5) return "On the way";
  return `+${km.toFixed(1)} km detour`;
}
