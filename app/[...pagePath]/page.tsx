import {cache} from 'react';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {CmsAboutPage} from '@/components/CmsAboutPage';
import {CmsPageLanguages} from '@/components/CmsPageLanguages';
import {loadCustomPageRoute} from '@/lib/cms/custom-page-runtime';
import {customPageMetadata} from '@/lib/cms/custom-page';
import {withLanguageMetadata} from '@/lib/cms/language-metadata';
const load=cache((path:string)=>loadCustomPageRoute(path));
type Props={params:Promise<{pagePath:string[]}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const content=await load('/'+(await params).pagePath.join('/'));
 if(!content)return {robots:{index:false,follow:false}};
 const origin=process.env.CMS_PUBLIC_SITE_ORIGIN||'https://safaricrafters.com';
 return withLanguageMetadata(customPageMetadata(content.page,content.seoDefaults,origin),content.page,origin);
}
export default async function CustomPage({params}:Props){const content=await load('/'+(await params).pagePath.join('/'));if(!content)notFound();return <><CmsPageLanguages page={content.page} settings={content.selectorSettings}/><CmsAboutPage page={content.page} faqAnswers={content.faqAnswers} leadershipProfiles={content.leadershipProfiles}/></>;}
