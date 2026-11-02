import type {Metadata} from 'next';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import LegacyContactPage,{metadata as legacyMetadata} from './LegacyContactPage';
import {CmsContactPage} from '../../components/CmsContactPage';
import {usesCmsContact,loadContactRoute} from '../../lib/cms/contact-page-runtime';
import {contactPageMetadata} from '../../lib/cms/contact-page';
export const dynamic='force-dynamic';
const loadCmsPage=cache(()=>loadContactRoute());
export async function generateMetadata():Promise<Metadata>{
 if(!usesCmsContact())return legacyMetadata;
 const content=await loadCmsPage();
 return content?contactPageMetadata(content.page,content.seoDefaults):{robots:{index:false,follow:false}};
}
export default async function ContactPage(){
 if(!usesCmsContact())return <LegacyContactPage/>;
 const content=await loadCmsPage();
 if(!content)notFound();
 return <CmsContactPage page={content.page} form={content.forms.current}/>;
}
