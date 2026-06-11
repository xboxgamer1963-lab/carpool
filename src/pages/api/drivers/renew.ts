import type { APIRoute } from "astro";
import { renewDriver } from "../../../lib/drivers";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();
  if (!userId) return redirect("/sign-in");

  const form = await request.formData();
  const id = form.get("id")?.toString();
  if (!id) return redirect("/drivers/mine");

  try {
    await renewDriver(id, userId);
  } catch {
    // Non-fatal: redirect back to dashboard.
  }

  return redirect("/drivers/mine");
};
