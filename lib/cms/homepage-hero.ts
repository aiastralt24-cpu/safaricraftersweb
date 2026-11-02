import {z} from 'zod';
import {image,heroFraming} from './composition-media.ts';
import {editorialHeadingSchema} from './editorial-heading.ts';

const assetId=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const frame=z.object({id:assetId,heading:editorialHeadingSchema}).strict();
/** Draft contract only. Asset IDs require trusted inspection and rights checks
 * before publication; schema validity is never permission to deliver a video. */
export const homepageHeroSchema=z.object({
 navigationLabel:z.string().min(1).max(200).refine(value=>Boolean(value.trim()),'Enter a navigation label.'),
 frames:z.array(frame).min(1).max(10),
 copy:z.string().max(2000),
 poster:image,
 mobilePoster:image.optional(),
 framing:heroFraming.optional(),
 mobileFraming:heroFraming.optional(),
 background:z.discriminatedUnion('kind',[
  z.object({kind:z.literal('image')}).strict(),
  z.object({kind:z.literal('video'),desktopAssetId:assetId,mobileAssetId:assetId.optional()}).strict(),
 ]),
}).strict().superRefine((value,context)=>{
 const ids=new Set<string>();
 value.frames.forEach((item,index)=>{
  if(ids.has(item.id))context.addIssue({code:'custom',path:['frames',index,'id'],message:'Each hero frame needs a unique identity.'});
  ids.add(item.id);
 });
});
export type HomepageHero=z.infer<typeof homepageHeroSchema>;
