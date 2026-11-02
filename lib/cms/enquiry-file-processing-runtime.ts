import {z} from 'zod';
import {createClamAvScanner} from './clamav-scanner.ts';
import {configuredDocumentRuntime} from './document-inspection.ts';
import {createEnquiryFileStorageAdapter} from './enquiry-file-storage-adapter.ts';
import type {EnquiryFileProcessingConfig} from './enquiry-file-processing-http.ts';
export function enquiryFileProcessingConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):EnquiryFileProcessingConfig|null{
 if(env.CMS_ENQUIRY_ENABLED!=='true'||env.CMS_ENQUIRY_FILE_WORKER_ENABLED!=='true'||env.CMS_ENQUIRY_FILES_ENABLED!=='true')return null;
 try{
  const site=z.string().uuid().parse(env.CMS_WEBSITE_ID),secret=z.string().regex(/^[-A-Za-z0-9_]{32,256}$/).parse(env.CMS_ENQUIRY_FILE_WORKER_SECRET);
  const scan=createClamAvScanner({executable:env.CMS_CLAMSCAN_PATH??'',databaseDirectory:env.CMS_CLAMAV_DATABASE_DIRECTORY??'',temporaryRoot:env.CMS_CLAMAV_TEMP_ROOT});
  const runtime=configuredDocumentRuntime(env),adapter=createEnquiryFileStorageAdapter({site,url:env.CMS_SUPABASE_URL??'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY??''},scan,fetcher);
  return {site,secret,runtime,adapter};
 }catch{return null;}
}
