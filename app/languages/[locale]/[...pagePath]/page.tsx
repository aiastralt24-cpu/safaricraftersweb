import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {CmsAboutPage} from '@/components/CmsAboutPage';
import {CmsPageLanguages} from '@/components/CmsPageLanguages';
import {localizedRequest} from '@/lib/cms/localized-request';
import {loadLocalizedVisitor} from '@/lib/cms/localized-visitor';
import {localizedCustomPageMetadata} from '@/lib/cms/custom-page';
import {brandMetadata} from '@/lib/cms/brand-metadata';
import {withLanguageMetadata} from '@/lib/cms/language-metadata';
type Props={params:Promise<{locale:string;pagePath:string[]}>};
export const dynamic='force-dynamic';
async function load(params:Props['params']){
 const {locale,pagePath}=await params,route=localizedRequest(`/languages/${locale}/${pagePath.join('/')}`);
 return route?loadLocalizedVisitor(route.path,route.locale):null;
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const content=await load(params);
 if(!content)return {robots:{index:false,follow:false}};
 const origin=process.env.CMS_PUBLIC_SITE_ORIGIN||'https://safaricrafters.com';
 return withLanguageMetadata(brandMetadata(localizedCustomPageMetadata(content.page,content.seoDefaults,origin),content.shell.settings.brand),content.page,origin);
}
export default async function LocalizedPage({params}:Props){const content=await load(params);if(!content)notFound();return <><CmsPageLanguages page={content.page} settings={content.shell.settings.header}/><CmsAboutPage page={content.page}/></>;}
