import {notFound} from 'next/navigation';
import {CmsCareerIndex} from '@/components/CmsCareerIndex';
import {usesCmsCareer} from '@/lib/cms/career-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
export const dynamic='force-dynamic';
export async function generateMetadata(){if(!usesCmsCareer())notFound();const defaults=await readSeoDefaults();return {title:'Careers',description:'Explore our careers.',alternates:{canonical:'/careers'},robots:{index:defaults?.indexing!=='noindex'}};}
export default function Page(){if(!usesCmsCareer())notFound();return <CmsCareerIndex/>;}
