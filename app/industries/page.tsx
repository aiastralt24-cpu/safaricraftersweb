import {notFound} from 'next/navigation';
import {CmsApplicationIndex} from '@/components/CmsApplicationIndex';
import {usesCmsApplication} from '@/lib/cms/application-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
export const dynamic='force-dynamic';
export async function generateMetadata(){if(!usesCmsApplication())notFound();const defaults=await readSeoDefaults();return {title:'Industries',description:'Explore our industries.',alternates:{canonical:'/industries'},robots:{index:defaults?.indexing!=='noindex'}};}
export default function Page(){if(!usesCmsApplication())notFound();return <CmsApplicationIndex kind='industry'/>;}
