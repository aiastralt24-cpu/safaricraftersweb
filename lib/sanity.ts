import { createClient } from "next-sanity";

export const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const hasSanityConfig = Boolean(sanityProjectId);

export const sanityClient = createClient({
  projectId: sanityProjectId || "replace-me",
  dataset: sanityDataset,
  apiVersion: "2026-05-02",
  useCdn: true,
  perspective: "published"
});
