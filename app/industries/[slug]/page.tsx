import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsApplication} from '@/components/CmsApplication';
import {readPublishedApplication,publicApplicationConfig} from '@/lib/cms/public-application-runtime';
import {usesCmsApplication,publishedApplicationMetadata} from '@/lib/cms/application-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsApplication())notFound();const value=await readPublishedApplication(slug,publicApplicationConfig(),'industry');if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedApplicationMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function ApplicationPage({params}:Props){const application=await load((await params).slug);return <><CmsApplication profile={application}/></>;}
