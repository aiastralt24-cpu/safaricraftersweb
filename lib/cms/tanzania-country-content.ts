import {z} from 'zod';
import {tanzaniaCountryGroups} from './tanzania-country-sections.ts';
import {pageSeoSchema} from './page-seo.ts';
export {tanzaniaCountryGroups} from './tanzania-country-sections.ts';
export const tanzaniaCountryContentSchema=z.object({schemaVersion:z.literal(1),...tanzaniaCountryGroups,seo:pageSeoSchema}).strict();
export type TanzaniaCountryContent=z.infer<typeof tanzaniaCountryContentSchema>;
