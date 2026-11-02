import type {Metadata} from 'next';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import LegacyAviationPage,{metadata as legacyMetadata} from './LegacyAviationPage';
import {CmsAviationHeroMedia} from '../../components/CmsAviationHeroMedia';
import {CmsAviationPage} from '../../components/CmsAviationPage';
import {readPublishedAviation,usesCmsAviation} from '../../lib/cms/published-aviation';
import {resolvedSeoMetadata} from '../../lib/cms/seo-metadata';
import {publishedMediaUrl} from '../../lib/cms/published-journey';
export const dynamic='force-dynamic';
const loadCmsPage=cache(()=>readPublishedAviation());
export async function generateMetadata():Promise<Metadata>{
 if(!usesCmsAviation())return legacyMetadata;
 const published=await loadCmsPage();
 if(!published)return {robots:{index:false,follow:false}};
 const {content:{page},seoDefaults}=published;
 return resolvedSeoMetadata(page.seo,seoDefaults,{origin:'https://safaricrafters.com',path:page.path,title:page.title});
}
export default async function AviationPage(){
 if(!usesCmsAviation())return <LegacyAviationPage/>;
 const published=await loadCmsPage();if(!published)notFound();
 return <CmsAviationPage page={published.content.page} renderHero={media=><CmsAviationHeroMedia media={media}/>} renderImage={(image,priority)=><img src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined}/>}/>;
}
