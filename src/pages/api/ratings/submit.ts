import type { APIRoute } from "astro";
import { submitRating } from "../../../lib/ratings";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();
  if (!userId) return redirect("/sign-in");

  const form = await request.formData();
  const driverId = form.get("driverId")?.toString().trim();
  const starsRaw = parseInt(form.get("stars")?.toString() ?? "", 10);

  if (!driverId || !Number.isInteger(starsRaw) || starsRaw < 1 || starsRaw > 5) {
    return redirect("/drivers");
  }

  try {
    await submitRating(driverId, userId, starsRaw);
  } catch {
    // Non-fatal — redirect back to the listing.
  }

  return redirect(`/drivers/${driverId}?rated=1`);
};
