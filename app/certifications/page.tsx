import {notFound} from 'next/navigation';
import {CmsCertificationIndex} from '@/components/CmsCertificationIndex';
import {usesCmsCertification} from '@/lib/cms/certification-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
export const dynamic='force-dynamic';
export async function generateMetadata(){if(!usesCmsCertification())notFound();const defaults=await readSeoDefaults();return {title:'Certifications',description:'Explore our certifications.',alternates:{canonical:'/certifications'},robots:{index:defaults?.indexing!=='noindex'}};}
export default function Page(){if(!usesCmsCertification())notFound();return <CmsCertificationIndex/>;}
