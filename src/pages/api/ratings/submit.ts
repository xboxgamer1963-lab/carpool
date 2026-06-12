import type { APIRoute } from "astro";
import { submitRating } from "../../../lib/ratings";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const driverId = form.get("driverId")?.toString().trim();
  const starsRaw = parseInt(form.get("stars")?.toString() ?? "", 10);

  if (!driverId || !Number.isInteger(starsRaw) || starsRaw < 1 || starsRaw > 5) {
    return redirect("/drivers");
  }

  // Prefer Clerk userId; fall back to an anonymous visitorId from localStorage
  // (sent as a hidden form field by the client script).
  const { userId } = locals.auth();
  const visitorId = form.get("visitorId")?.toString().trim();
  const raterId = userId || visitorId;

  if (!raterId) return redirect(`/drivers/${driverId}`);

  try {
    await submitRating(driverId, raterId, starsRaw);
  } catch {
    // Non-fatal.
  }

  return redirect(`/drivers/${driverId}?rated=1`);
};
