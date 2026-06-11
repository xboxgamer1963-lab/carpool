import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const origin = site?.toString().replace(/\/$/, "") ?? "";
  const body = [
    "User-agent: *",
    // Owner-only and authenticated surfaces — no value to crawlers.
    "Disallow: /sign-in",
    "Disallow: /sign-up",
    "Disallow: /api/",
    "Disallow: /drivers/mine",
    "Disallow: /drivers/register",
    "Disallow: /drivers/edit/",
    "Disallow: /requests/mine",
    "Disallow: /requests/post",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
