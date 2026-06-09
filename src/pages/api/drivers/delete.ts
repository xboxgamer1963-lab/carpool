import type { APIRoute } from "astro";
import { deleteDriver } from "../../../lib/drivers";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();
  if (!userId) return redirect("/sign-in");

  const form = await request.formData();
  const id = form.get("id")?.toString();
  if (id) {
    // deleteDriver verifies ownership before removing.
    await deleteDriver(id, userId);
  }

  return redirect("/drivers/mine");
};
