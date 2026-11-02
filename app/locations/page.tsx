import {notFound} from 'next/navigation';
import {CmsLocationIndex} from '@/components/CmsLocationIndex';
import {usesCmsLocation} from '@/lib/cms/location-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
export const dynamic='force-dynamic';
export async function generateMetadata(){if(!usesCmsLocation())notFound();const defaults=await readSeoDefaults();return {title:'Locations',description:'Explore our locations.',alternates:{canonical:'/locations'},robots:{index:defaults?.indexing!=='noindex'}};}
export default function Page(){if(!usesCmsLocation())notFound();return <CmsLocationIndex/>;}
