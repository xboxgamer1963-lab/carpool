import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

const isProtectedRoute = createRouteMatcher([
  "/drivers/register",
  "/drivers/mine",
  "/drivers/edit/(.*)",
  "/api/drivers/create",
  "/api/drivers/update",
  "/api/drivers/renew",
  "/requests/post",
  "/requests/mine",
  "/api/requests/create",
  "/api/requests/close",
  "/api/requests/renew",
]);

export const onRequest = clerkMiddleware((auth, context) => {
  if (isProtectedRoute(context.request) && !auth().userId) {
    return context.redirect("/sign-in");
  }
});
