import type { APIRoute } from "astro";
import { updateDriver } from "../../../lib/drivers";
import { parseDriverForm } from "../../../lib/parseDriver";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();
  if (!userId) return redirect("/sign-in");

  const form = await request.formData();
  const id = form.get("id")?.toString();
  if (!id) return redirect("/drivers/mine");

  const editUrl = `/drivers/edit/${id}`;
  const { data, error } = parseDriverForm(form, userId);

  if (error || !data) {
    return redirect(editUrl + "?error=" + encodeURIComponent(error ?? "Invalid form."));
  }

  try {
    const ok = await updateDriver(id, userId, data);
    if (!ok) {
      return redirect(
        editUrl +
          "?error=" +
          encodeURIComponent("You can only edit your own listing.")
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save changes.";
    return redirect(editUrl + "?error=" + encodeURIComponent(msg));
  }

  return redirect("/drivers/mine");
};
