// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import clerk from "@clerk/astro";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [clerk()],
});
