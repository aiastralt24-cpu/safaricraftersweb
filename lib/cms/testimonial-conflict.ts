import {testimonialSchema,type Testimonial} from './testimonials.ts';
export type TestimonialConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
const snapshot=(payload:unknown):Record<string,unknown>=>({image:undefined,...testimonialSchema.parse(payload)});
export function prepareTestimonialConflict(base:TestimonialConflictRecord,mine:Testimonial,latest:TestimonialConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='testimonial'||base.path!==null||latest.path!==null||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest testimonial cannot be reconciled with your access, identity or revision. Your unsaved changes remain open.');
 return {base:snapshot(base.payload),mine:snapshot(mine),remote:snapshot(latest.payload)};
}
