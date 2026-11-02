import type {Metadata} from 'next';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import LegacyMicePage,{metadata as legacyMetadata} from './LegacyMicePage';
import {CmsMicePage} from '../../components/CmsMicePage';
import {readPublishedMice,usesCmsMice} from '../../lib/cms/published-mice';
import {resolvedSeoMetadata} from '../../lib/cms/seo-metadata';
export const dynamic='force-dynamic';
const loadCmsPage=cache(()=>readPublishedMice());
export async function generateMetadata():Promise<Metadata>{
 if(!usesCmsMice())return legacyMetadata;
 const published=await loadCmsPage();
 if(!published)return {robots:{index:false,follow:false}};
 const {content:{page},seoDefaults}=published;
 return resolvedSeoMetadata(page.seo,seoDefaults,{origin:'https://safaricrafters.com',path:page.path,title:page.title});
}
export default async function MicePage(){
 if(!usesCmsMice())return <LegacyMicePage/>;
 const published=await loadCmsPage();if(!published)notFound();
 return <CmsMicePage page={published.content.page} form={published.forms.current}/>;
}
