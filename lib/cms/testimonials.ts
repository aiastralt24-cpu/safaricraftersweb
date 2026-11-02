import {z} from 'zod';
import {image} from './composition.ts';
const short=z.string().max(200);
export const testimonialSchema=z.object({
 schemaVersion:z.literal(1),name:short.min(1),anonymous:z.boolean(),quote:z.string().trim().min(1).max(10000),
 role:short,organization:short,city:short,trip:short,guestType:short,travelled:short,route:z.string().max(1000),arranged:z.string().max(5000),
 verified:z.boolean(),consent:z.object({status:z.enum(['pending','granted','withdrawn']),evidence:z.string().max(5000)}).strict(),image:image.optional(),
}).strict().refine(v=>v.consent.status!=='granted'||v.consent.evidence.trim().length>0,{path:['consent','evidence'],message:'Record the source of publication consent.'});
export type Testimonial=z.infer<typeof testimonialSchema>;
export function newTestimonial():Testimonial{return {schemaVersion:1,name:'New guest',anonymous:false,quote:'',role:'',organization:'',city:'',trip:'',guestType:'',travelled:'',route:'',arranged:'',verified:false,consent:{status:'pending',evidence:''}};}
/** Visitor-safe projection: no internal consent evidence or withheld identity. */
export function testimonialDisplay(input:unknown){const value=testimonialSchema.parse(input);return {name:value.anonymous?'Anonymous guest':value.name,quote:value.quote,role:value.anonymous?'':value.role,organization:value.anonymous?'':value.organization,city:value.anonymous?'':value.city,trip:value.trip,guestType:value.guestType,image:value.anonymous?undefined:value.image};}
