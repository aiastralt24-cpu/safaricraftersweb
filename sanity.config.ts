import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemaTypes";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "replace-me";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export default defineConfig({
  name: "safari-crafters",
  title: "Safari Crafters",
  projectId,
  dataset,
  basePath: "/studio",
  plugins: [structureTool({
    structure: (S) => S.list().title("Content").items([
      S.listItem().title("Homepage").id("homepage").child(S.document().schemaType("homepage").documentId("homepage")),
      ...S.documentTypeListItems().filter(item => item.getId() !== "homepage")
    ])
  }), visionTool()],
  document: {
    newDocumentOptions: (options) => options.filter(option => option.templateId !== "homepage"),
    actions: (actions, context) => context.schemaType === "homepage" ? actions.filter(action => action.action !== "duplicate") : actions
  },
  schema: {
    types: schemaTypes
  }
});
