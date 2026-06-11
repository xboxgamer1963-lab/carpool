import type { Driver } from "./drivers";
import { detectCity } from "./cities";

const SEP = "-to-";

export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function routeSlug(from: string, to: string): string {
  return `${slugify(from)}${SEP}${slugify(to)}`;
}

export function parseRouteSlug(
  slug: string,
): { fromSlug: string; toSlug: string } | null {
  const idx = slug.indexOf(SEP);
  if (idx <= 0 || idx + SEP.length >= slug.length) return null;
  const fromSlug = slug.slice(0, idx);
  const toSlug = slug.slice(idx + SEP.length);
  if (!fromSlug || !toSlug) return null;
  return { fromSlug, toSlug };
}

function driverCity(d: Driver): string {
  if (d.city) return d.city;
  if (d.fromLat != null && d.fromLng != null) {
    return detectCity(d.fromLat, d.fromLng)?.slug ?? "";
  }
  return "";
}

export function driversForRoute(
  drivers: Driver[],
  citySlug: string,
  fromSlug: string,
  toSlug: string,
): Driver[] {
  return drivers.filter((d) => {
    if (driverCity(d) !== citySlug) return false;
    return (
      slugify(d.fromLocation) === fromSlug &&
      slugify(d.toLocation) === toSlug
    );
  });
}

export interface RouteSummary {
  from: string;
  to: string;
  fromSlug: string;
  toSlug: string;
  citySlug: string;
  count: number;
  slug: string; // route slug only, no city
  href: string; // full URL path including city
}

/**
 * Roll up active drivers into per-(city, from→to) groups, sorted by popularity.
 * Used by city pages, the homepage popular-routes section, and the sitemap.
 */
export function popularRoutes(
  drivers: Driver[],
  opts: { limit?: number; citySlug?: string } = {},
): RouteSummary[] {
  const counts = new Map<string, RouteSummary>();
  for (const d of drivers) {
    if (!d.fromLocation || !d.toLocation) continue;
    const citySlug = driverCity(d);
    if (!citySlug) continue;
    if (opts.citySlug && citySlug !== opts.citySlug) continue;

    const fromSlug = slugify(d.fromLocation);
    const toSlug = slugify(d.toLocation);
    if (!fromSlug || !toSlug) continue;

    const slug = `${fromSlug}${SEP}${toSlug}`;
    const key = `${citySlug}|${slug}`;
    const cur = counts.get(key);
    if (cur) {
      cur.count++;
    } else {
      counts.set(key, {
        from: d.fromLocation,
        to: d.toLocation,
        fromSlug,
        toSlug,
        citySlug,
        count: 1,
        slug,
        href: `/${citySlug}/route/${slug}`,
      });
    }
  }
  const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
  return opts.limit ? sorted.slice(0, opts.limit) : sorted;
}

export function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
