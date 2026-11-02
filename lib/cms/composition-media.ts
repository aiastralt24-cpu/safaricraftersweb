import {z} from 'zod';
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const text=z.string().max(50000);
export const image=z.object({assetId:id,alt:z.string().max(500),decorative:z.boolean().default(false),caption:text.optional(),credit:text.optional()}).strict()
  .refine(value=>value.decorative || value.alt.trim().length>0,'A meaningful image needs alternative text.');
export const imageFocalPoint=z.object({x:z.number().min(0).max(100),y:z.number().min(0).max(100)}).strict();
export type ImageFocalPoint=z.infer<typeof imageFocalPoint>;
export const heroFraming=imageFocalPoint.extend({shape:z.enum(['natural','wide','square','portrait','portraitWide'])});
export type HeroFraming=z.infer<typeof heroFraming>;
