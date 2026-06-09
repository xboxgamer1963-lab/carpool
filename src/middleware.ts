import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

// Routes that require an authenticated user. Everything else is public so
// riders can browse and search without signing in.
const isProtectedRoute = createRouteMatcher([
  "/drivers/register",
  "/drivers/mine",
  "/drivers/edit/(.*)",
  "/api/drivers/create",
  "/api/drivers/update",
]);

export const onRequest = clerkMiddleware((auth, context) => {
  if (isProtectedRoute(context.request) && !auth().userId) {
    return context.redirect("/sign-in");
  }
});
