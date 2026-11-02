import {z} from 'zod';
import {safeHref} from './composition.ts';
const label=z.string().trim().min(1).max(200);
export const interfaceTextSchema=z.object({homeLabel:label,homeHref:safeHref,skipLink:label,openMenu:label,closeMenu:label,featuredContent:label,footer:label,legalLinks:label,socialProfiles:label,cookieSaveError:z.string().trim().min(1).max(1000)}).strict();
export type InterfaceText=z.infer<typeof interfaceTextSchema>;
export function defaultInterfaceText(brandName:string):InterfaceText{return {homeLabel:`${brandName.slice(0,195)} home`,homeHref:'/',skipLink:'Skip to main content',openMenu:'Open menu',closeMenu:'Close menu',featuredContent:'Featured content',footer:`${brandName.slice(0,193)} footer`,legalLinks:'Legal links',socialProfiles:'Social profiles',cookieSaveError:'Your preference could not be saved. Optional analytics is off for this visit. Allow website storage and try again.'};}
export function interfaceTextForLocale(value:unknown,locale:string,brandName:string){
 if(!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale))throw Error('Invalid interface language.');
 if(value===undefined){if(locale!=='en')throw Error('Complete translated interface wording before localized delivery.');return defaultInterfaceText(brandName);}
 return interfaceTextSchema.parse(value);
}
