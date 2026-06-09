// @ts-check
import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import clerk from "@clerk/astro";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: netlify(),
  integrations: [clerk()],
});
