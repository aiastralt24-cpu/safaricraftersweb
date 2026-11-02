import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "replace-me",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
  },
  // Share the public Next.js project settings with the standalone Studio bundle.
  vite: (config) => ({
    ...config,
    define: {
      ...config.define,
      "process.env.NEXT_PUBLIC_SANITY_PROJECT_ID": JSON.stringify(
        process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "replace-me"
      ),
      "process.env.NEXT_PUBLIC_SANITY_DATASET": JSON.stringify(
        process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
      )
    }
  })
});
