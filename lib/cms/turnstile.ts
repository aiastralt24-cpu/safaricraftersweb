import {z} from 'zod';
/** Server verification only. Widget rendering must use the matching action. */
export function createTurnstileVerifier(config:{secret:string;hostname:string;action:string},fetcher:typeof fetch=fetch){
 if(!config.secret||!config.hostname||!config.action||!/^[-a-zA-Z0-9_]{1,32}$/.test(config.action))throw Error('Challenge verification is not configured.');
 return async(token:string)=>{
  if(!token||token.length>2048)return false;
  try{
   const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:config.secret,response:token}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return false;
   const parsed=z.object({success:z.boolean(),hostname:z.string().optional(),action:z.string().optional()}).passthrough().safeParse(await response.json());
   return parsed.success&&parsed.data.success&&parsed.data.hostname===config.hostname&&parsed.data.action===config.action;
  }catch{return false;}
 };
}
