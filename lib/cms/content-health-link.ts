import {z} from 'zod';
const target=z.object({site:z.string().uuid(),record:z.string().uuid()}).strict();
export function healthReportHref(site:string,record:string){const value=target.parse({site,record});return '/cms?'+new URLSearchParams({view:'health',...value}).toString();}
export function parseHealthReportLink(search:string){
 const params=new URLSearchParams(search);if(params.get('view')!=='health')return null;
 if([...params.keys()].length!==3||params.getAll('view').length!==1)throw Error('Invalid content health report link.');
 const value=target.safeParse({site:params.get('site'),record:params.get('record')});if(!value.success)throw Error('Invalid content health report link.');return value.data;
}
