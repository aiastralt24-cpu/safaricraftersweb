import type {GlobalSettings} from '@/lib/cms/global-settings';
import {pageLanguageLinks} from '@/lib/cms/page-language-links';
import styles from './CmsPageLanguages.module.css';
export async function CmsPageLanguages({page,settings}:{page:{recordId:string;revisionId:string;locale:string;path:string};settings:GlobalSettings['header']|undefined}){
 const selection=await pageLanguageLinks(page,settings);
 if(!selection)return null;
 return <nav className={styles.languages} aria-label={selection.label}><span>{selection.label}</span><ul>{selection.links.map(link=><li key={link.locale}><a href={link.href} hrefLang={link.locale} lang={link.locale} aria-current={link.current?'page':undefined}>{link.label}</a></li>)}</ul></nav>;
}
