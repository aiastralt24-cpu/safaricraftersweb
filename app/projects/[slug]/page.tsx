import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsProject} from '@/components/CmsProject';
import {JsonLd} from '@/components/JsonLd';
import {readPublishedProject,publicProjectConfig} from '@/lib/cms/public-project-runtime';
import {usesCmsProjects,publishedProjectMetadata,publishedProjectStructuredData} from '@/lib/cms/project-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {siteUrl} from '@/lib/structured-data';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsProjects())notFound();const value=await readPublishedProject(slug,publicProjectConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedProjectMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function ProjectPage({params}:Props){const project=await load((await params).slug);return <><JsonLd data={publishedProjectStructuredData(project,siteUrl)}/><CmsProject project={project}/></>;}
