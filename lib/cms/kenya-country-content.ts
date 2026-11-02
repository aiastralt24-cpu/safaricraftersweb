import {z} from 'zod';
import {kenyaCountryGroups} from './kenya-country-sections.ts';
import {pageSeoSchema} from './page-seo.ts';
/** Editorial contract only; publication and migration have separate guards. */
export const kenyaCountryContentSchema=z.object({schemaVersion:z.literal(1),...kenyaCountryGroups,seo:pageSeoSchema}).strict();
export type KenyaCountryContent=z.infer<typeof kenyaCountryContentSchema>;
