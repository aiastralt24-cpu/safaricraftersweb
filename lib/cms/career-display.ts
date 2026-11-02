import {z} from 'zod';
export const employmentLabels={unspecified:'Not specified',fullTime:'Full time',partTime:'Part time',contract:'Contract',temporary:'Temporary',internship:'Internship',volunteer:'Volunteer',other:'Other'} as const;
export const workModeLabels={onSite:'On site',hybrid:'Hybrid',remote:'Remote'} as const;
const windowSchema=z.object({status:z.enum(['open','paused','closed']),opensAt:z.union([z.literal(''),z.iso.datetime({offset:true})]),closesAt:z.union([z.literal(''),z.iso.datetime({offset:true})])}).refine(v=>!v.opensAt||!v.closesAt||Date.parse(v.opensAt)<Date.parse(v.closesAt));
/** Display only. Submission endpoints must independently check current job state. */
export function careerWindowState(input:unknown,now:number):'open'|'scheduled'|'paused'|'closed'|'unavailable'{
 const parsed=windowSchema.safeParse(input);if(!parsed.success||!Number.isFinite(now))return 'unavailable';const v=parsed.data;
 if(v.status==='closed'||v.closesAt&&now>=Date.parse(v.closesAt))return 'closed';
 if(v.status==='paused')return 'paused';
 return v.opensAt&&now<Date.parse(v.opensAt)?'scheduled':'open';
}
export const careerStateLabels={open:'Applications open',scheduled:'Applications have not opened yet',paused:'Applications paused',closed:'Applications closed',unavailable:'Applications unavailable'} as const;
