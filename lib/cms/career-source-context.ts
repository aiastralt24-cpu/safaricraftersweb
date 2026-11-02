import type {CareerEnquirySelection} from './career-enquiry-context.ts';
/** A careers source cannot silently fall back to generic enquiry intake. */
export function careerSourceMatches(sourcePath:string|undefined,career:CareerEnquirySelection|undefined):boolean{
 if(career)return sourcePath===`/careers/${career.slug}`;
 return sourcePath!== '/careers'&&!sourcePath?.startsWith('/careers/');
}
