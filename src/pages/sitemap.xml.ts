import type { APIRoute } from "astro";
import { CITIES } from "../lib/cities";
import { listDrivers } from "../lib/drivers";
import { popularRoutes } from "../lib/routes";

interface Entry {
  loc: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: number;
  lastmod?: string;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === '"' ? "&quot;" :
    "&apos;"
  );
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.toString().replace(/\/$/, "") ?? "";

  // Static / always-on surfaces.
  const entries: Entry[] = [
    { loc: `${origin}/`, changefreq: "daily", priority: 1.0 },
    { loc: `${origin}/drivers`, changefreq: "daily", priority: 0.9 },
    { loc: `${origin}/requests`, changefreq: "daily", priority: 0.8 },
  ];

  // One landing page per city (the long-tail SEO target).
  for (const c of CITIES) {
    entries.push({
      loc: `${origin}/${c.slug}`,
      changefreq: "daily",
      priority: 0.9,
    });
  }

  // Every live driver listing + every popular city/route page.
  try {
    const drivers = await listDrivers();
    for (const d of drivers) {
      entries.push({
        loc: `${origin}/drivers/${d.id}`,
        changefreq: "weekly",
        priority: 0.6,
        lastmod: new Date(d.lastRenewedAt ?? d.createdAt).toISOString(),
      });
    }
    // Top routes per city — capped to avoid sitemap bloat as listings grow.
    for (const c of CITIES) {
      const routes = popularRoutes(drivers, { citySlug: c.slug, limit: 50 });
      for (const r of routes) {
        entries.push({
          loc: `${origin}${r.href}`,
          changefreq: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // Firestore unreachable — still ship the static sitemap.
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        (e) =>
          `  <url>\n` +
          `    <loc>${escape(e.loc)}</loc>\n` +
          (e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : "") +
          (e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>\n` : "") +
          (e.priority != null ? `    <priority>${e.priority.toFixed(1)}</priority>\n` : "") +
          `  </url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
