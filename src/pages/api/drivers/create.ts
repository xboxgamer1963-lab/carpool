import type { APIRoute } from "astro";
import { createDriver } from "../../../lib/drivers";
import { parseDriverForm } from "../../../lib/parseDriver";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();
  if (!userId) return redirect("/sign-in");

  const form = await request.formData();
  const { data, error } = parseDriverForm(form, userId);

  if (error || !data) {
    return redirect(
      "/drivers/register?error=" + encodeURIComponent(error ?? "Invalid form.")
    );
  }

  try {
    await createDriver(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save your ride.";
    return redirect("/drivers/register?error=" + encodeURIComponent(msg));
  }

  return redirect("/drivers/mine");
};
