// Cities the carpool currently operates in. Each entry pins the map to a
// reasonable default view and constrains panning to a generous box around
// the city so drivers can't accidentally drop pins in another metro.
//
// `center` and `bounds` are [lng, lat] / [[swLng, swLat], [neLng, neLat]] —
// MapLibre's native ordering.

export interface City {
  slug: string;
  name: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

export const CITIES: City[] = [
  {
    slug: "karachi",
    name: "Karachi",
    center: [67.05, 24.86],
    bounds: [[66.65, 24.65], [67.55, 25.15]],
  },
  {
    slug: "lahore",
    name: "Lahore",
    center: [74.34, 31.55],
    bounds: [[73.95, 31.25], [74.75, 31.85]],
  },
  {
    slug: "islamabad-rawalpindi",
    name: "Islamabad / Rawalpindi",
    center: [73.06, 33.64],
    bounds: [[72.75, 33.40], [73.40, 33.90]],
  },
  {
    slug: "faisalabad",
    name: "Faisalabad",
    center: [73.13, 31.45],
    bounds: [[72.85, 31.20], [73.45, 31.70]],
  },
  {
    slug: "multan",
    name: "Multan",
    center: [71.50, 30.18],
    bounds: [[71.20, 29.95], [71.80, 30.40]],
  },
  {
    slug: "peshawar",
    name: "Peshawar",
    center: [71.58, 34.01],
    bounds: [[71.30, 33.80], [71.90, 34.25]],
  },
  {
    slug: "quetta",
    name: "Quetta",
    center: [66.99, 30.18],
    bounds: [[66.70, 29.95], [67.30, 30.45]],
  },
  {
    slug: "hyderabad",
    name: "Hyderabad",
    center: [68.37, 25.37],
    bounds: [[68.10, 25.15], [68.65, 25.60]],
  },
  {
    slug: "sialkot",
    name: "Sialkot",
    center: [74.53, 32.49],
    bounds: [[74.25, 32.25], [74.80, 32.75]],
  },
  {
    slug: "gujranwala",
    name: "Gujranwala",
    center: [74.19, 32.16],
    bounds: [[73.90, 31.90], [74.50, 32.40]],
  },
];

export const CITY_BY_SLUG: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.slug, c]),
);

export function getCity(slug: string | null | undefined): City | null {
  if (!slug) return null;
  return CITY_BY_SLUG[slug] ?? null;
}

/**
 * Find which city a given lat/lng belongs to, used to auto-detect the city
 * for legacy listings that were created before the city field existed.
 * Returns the first city whose bounds contain the point, or null.
 */
export function detectCity(lat: number, lng: number): City | null {
  for (const c of CITIES) {
    const [[swLng, swLat], [neLng, neLat]] = c.bounds;
    if (lng >= swLng && lng <= neLng && lat >= swLat && lat <= neLat) {
      return c;
    }
  }
  return null;
}
