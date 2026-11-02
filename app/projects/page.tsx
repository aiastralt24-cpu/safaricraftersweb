import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {notFound} from 'next/navigation';
import {usesCmsProjects} from '@/lib/cms/project-route';
import {readPublishedProjects,publicProjectConfig} from '@/lib/cms/public-project-runtime';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export const dynamic='force-dynamic';
const baseMetadata={title:'Projects and case studies',description:'Explore our projects and case studies.',alternates:{canonical:'/projects'}};
export async function generateMetadata(){const defaults=await readSeoDefaults();return {...baseMetadata,robots:{index:defaults?.indexing!=='noindex'}};}
export default async function ProjectsPage(){if(!usesCmsProjects())notFound();const projects=await readPublishedProjects(publicProjectConfig());return <main className='container' style={{paddingBlock:'8rem 4rem'}}><h1 className='display'>Projects and case studies</h1>{projects.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,20rem),1fr))',gap:'2rem',marginTop:'3rem'}}>{projects.map(project=><article key={project.recordId}><a href={project.path}><img src={publishedMediaUrl(project.image.assetId)} alt={project.image.decorative?'':project.image.alt} style={{width:'100%',aspectRatio:'4/3',objectFit:'cover'}}/><h2 className='h3'>{project.title}</h2></a><p>{project.industry}</p><p>{project.summary}</p></article>)}</div>:<p>No projects have been published yet.</p>}</main>;}
