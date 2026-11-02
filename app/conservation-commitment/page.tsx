import type {Metadata} from 'next';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import LegacyConservationPage,{metadata as legacyMetadata} from './LegacyConservationPage';
import {CmsConservationPage} from '../../components/CmsConservationPage';
import {usesCmsConservation,loadConservationRoute} from '../../lib/cms/conservation-page-runtime';
import {conservationPageMetadata} from '../../lib/cms/conservation-page';
export const dynamic='force-dynamic';
const loadCmsPage=cache(()=>loadConservationRoute());
export async function generateMetadata():Promise<Metadata>{
 if(!usesCmsConservation())return legacyMetadata;
 const content=await loadCmsPage();
 return content?conservationPageMetadata(content.page,content.seoDefaults):{robots:{index:false,follow:false}};
}
export default async function ConservationPage(){
 if(!usesCmsConservation())return <LegacyConservationPage/>;
 const content=await loadCmsPage();
 if(!content)notFound();
 return <CmsConservationPage page={content.page}/>;
}
