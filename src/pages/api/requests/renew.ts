import type { APIRoute } from "astro";
import { renewRequest } from "../../../lib/requests";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();
  if (!userId) return redirect("/sign-in");

  const form = await request.formData();
  const id = form.get("id")?.toString();
  if (!id) return redirect("/requests/mine");

  try {
    await renewRequest(id, userId);
  } catch {
    // Non-fatal.
  }

  return redirect("/requests/mine");
};
