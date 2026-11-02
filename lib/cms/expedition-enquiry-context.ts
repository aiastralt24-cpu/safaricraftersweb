import {z} from 'zod';
import {projectPublishedExpedition} from './published-expedition.ts';
const uuid=z.string().uuid();
/** Browser input contains identities only. Editorial text is resolved on the server. */
export const expeditionEnquirySelectionSchema=z.object({recordId:uuid,revisionId:uuid,slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),departureId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/).nullable()}).strict();
export type ExpeditionEnquirySelection=z.infer<typeof expeditionEnquirySelectionSchema>;
const envelope=z.object({page:z.unknown(),references:z.unknown()}).strict();
/** Resolve using a publication-authorized reader result. Persistence must recheck
 * the same published revisions in its transaction, or recover a prior receipt. */
export function resolveExpeditionEnquiryContext(selectionInput:unknown,input:unknown,site:string,formId:string,formRevisionId:string,today:string){
 const selection=expeditionEnquirySelectionSchema.parse(selectionInput),response=envelope.parse(input),path=`/photo-expeditions/${selection.slug}`;
 const expedition=projectPublishedExpedition(response.page,site,path,'en',response.references,today);
 if(expedition.recordId!==selection.recordId||expedition.revisionId!==selection.revisionId||expedition.form.recordId!==formId||expedition.form.publishedRevisionId!==formRevisionId)throw Error('The expedition or enquiry form changed. Reload before submitting.');
 const departure=selection.departureId===null?null:expedition.upcoming.find(item=>item.id===selection.departureId);
 if(departure===undefined)throw Error('The selected departure is no longer available for enquiry.');
 return {recordId:expedition.recordId,revisionId:expedition.revisionId,path,title:expedition.content.title,programmeStatus:expedition.content.programmeStatus,price:expedition.content.price,formId:expedition.form.recordId,formRevisionId:expedition.form.publishedRevisionId,
  departure:departure?{id:departure.id,date:departure.date,...(departure.endDate?{endDate:departure.endDate}:{}),status:departure.status,availability:departure.availability}:null};
}
export type ExpeditionEnquiryContext=ReturnType<typeof resolveExpeditionEnquiryContext>;
