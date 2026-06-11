import type { APIRoute } from "astro";
import { createRequest } from "../../../lib/requests";
import { parseRequestForm } from "../../../lib/parseRequest";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();
  if (!userId) return redirect("/sign-in");

  const form = await request.formData();
  const { data, error } = parseRequestForm(form, userId);

  if (error || !data) {
    return redirect("/requests/post?error=" + encodeURIComponent(error ?? "Invalid form."));
  }

  try {
    await createRequest(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save your request.";
    return redirect("/requests/post?error=" + encodeURIComponent(msg));
  }

  return redirect("/requests/mine");
};
