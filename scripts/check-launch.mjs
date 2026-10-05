import fs from 'node:fs';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const missing=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','ENQUIRY_FROM_EMAIL','ENQUIRY_TO_EMAIL','CRON_SECRET','ADMIN_TOKEN'].filter(k=>!process.env[k]);
for(const key of missing)console.error(`Missing: ${key}`);
const data=JSON.parse(fs.readFileSync('content/site-content.json','utf8'));
let errors=0;
for(const item of data.expeditions){
 const preview=item.publicationStatus==='preview';
 const absent=['price','mentor','groupSize','duration'].filter(key=>!item[key]||/to be confirmed/i.test(item[key]));
 if(!item.days?.length)absent.push('itinerary');
 if(!item.inclusions?.length)absent.push('inclusions');
 if(absent.length){console.log(`${preview?'Preview':'REVIEW'}: ${item.slug}: ${absent.join(', ')}`);if(!preview)errors++;}
 if(!item.availabilityReviewedAt)console.log(`Review availability: ${item.slug}`);
 for(const d of item.departures||[])if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||Number.isNaN(Date.parse(d.date))){errors++;console.error(`Invalid departure: ${item.slug}`);}
}
console.log('This check does not verify credentials, database migration, scheduler, email delivery or business facts. Follow docs/launch-readiness.md.');
process.exitCode=missing.length||errors?1:0;
