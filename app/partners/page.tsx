import {notFound} from 'next/navigation';
import {CmsPartnerIndex} from '@/components/CmsPartnerIndex';
import {usesCmsPartner} from '@/lib/cms/partner-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
export const dynamic='force-dynamic';
export async function generateMetadata(){if(!usesCmsPartner())notFound();const defaults=await readSeoDefaults();return {title:'Partners',description:'Explore our partners.',alternates:{canonical:'/partners'},robots:{index:defaults?.indexing!=='noindex'}};}
export default function Page(){if(!usesCmsPartner())notFound();return <CmsPartnerIndex/>;}
