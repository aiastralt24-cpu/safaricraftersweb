import type {Metadata} from 'next';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import LegacyGuidedPage,{metadata as legacyMetadata} from './LegacyGuidedPage';
import {CmsGuidedPage} from '../../components/CmsGuidedPage';
import {readPublishedGuided,usesCmsGuided} from '../../lib/cms/published-guided';
import {resolvedSeoMetadata} from '../../lib/cms/seo-metadata';
import {publishedMediaUrl} from '../../lib/cms/published-journey';
export const dynamic='force-dynamic';
const loadCmsPage=cache(()=>readPublishedGuided());
export async function generateMetadata():Promise<Metadata>{
 if(!usesCmsGuided())return legacyMetadata;
 const published=await loadCmsPage();
 if(!published)return {robots:{index:false,follow:false}};
 const {content:{page},seoDefaults}=published;
 return resolvedSeoMetadata(page.seo,seoDefaults,{origin:'https://safaricrafters.com',path:page.path,title:page.title});
}
export default async function GuidedPage(){
 if(!usesCmsGuided())return <LegacyGuidedPage/>;
 const published=await loadCmsPage();if(!published)notFound();
 return <CmsGuidedPage page={published.content.page} renderImage={(image,priority)=><img src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined}/>}/>;
}
