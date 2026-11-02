import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {journeyListReader,readPublishedJourneyList} from './published-journey-list.ts';
import {expeditionDirectoryReader,readPublishedExpeditionDirectory} from './public-expedition-directory.ts';
import {publicHomepageGuestSchema} from './homepage-guest-notes.ts';
import type {HomepagePublishedReaders} from './homepage-dependencies.ts';
export function homepagePublishedReaders(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):HomepagePublishedReaders{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published homepage dependencies are not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const scope=(site:string,locale:string)=>{if(site!==env.CMS_WEBSITE_ID||locale!=='en')throw Error('Homepage dependency scope mismatch.');};
 return {
  async journeys(site,locale){scope(site,locale);return {site,items:await readPublishedJourneyList(journeyListReader(env,fetcher))};},
  async expeditions(site,locale){scope(site,locale);return {site,items:await readPublishedExpeditionDirectory(site,expeditionDirectoryReader(env,fetcher))};},
  async guest(site,id,locale){scope(site,locale);z.string().uuid().parse(id);const record=publicHomepageGuestSchema.parse(await cmsRpc(config,config.key,'get_public_homepage_guest',{p_site:site,p_record:id,p_locale:locale},fetcher));if(record.recordId!==id)throw Error('Published guest identity mismatch.');return {site,record};},
 };
}
