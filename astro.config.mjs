// @ts-check
import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import clerk from "@clerk/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://carpool.high-score.dev",
  output: "server",
  adapter: netlify(),
  integrations: [clerk()],
});
