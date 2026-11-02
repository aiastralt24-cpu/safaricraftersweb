'use client';
import {testimonialSchema,testimonialDisplay} from '../../lib/cms/testimonials';
import {MediaImage} from './media-image';
import type {LoadMediaPreview} from './media-image';
export function TestimonialPreview({value,loadPreview}:{value:unknown;loadPreview:LoadMediaPreview}){
 const parsed=testimonialSchema.safeParse(value);
 if(!parsed.success)return <p role='alert'>This testimonial needs repair before previewing.</p>;
 const display=testimonialDisplay(parsed.data);
 return <article><p>Draft preview · Consent: {parsed.data.consent.status} · {parsed.data.verified?'Wording verified':'Wording not verified'}</p><blockquote><p>{display.quote}</p><footer>{display.name}{display.role&&` · ${display.role}`}{display.organization&&` · ${display.organization}`}{display.city&&` · ${display.city}`}</footer></blockquote><p>{display.trip}{display.guestType&&` · ${display.guestType}`}</p>{display.image&&<MediaImage asset={display.image.assetId} alt={display.image.decorative?'':display.image.alt} load={loadPreview}/>}</article>;
}
