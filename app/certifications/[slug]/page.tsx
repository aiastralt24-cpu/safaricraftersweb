import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsCertification} from '@/components/CmsCertification';
import {readPublishedCertification,publicCertificationConfig} from '@/lib/cms/public-certification-runtime';
import {usesCmsCertification,publishedCertificationMetadata} from '@/lib/cms/certification-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsCertification())notFound();const value=await readPublishedCertification(slug,publicCertificationConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedCertificationMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function CertificationPage({params}:Props){const certification=await load((await params).slug);return <><CmsCertification profile={certification}/></>;}
