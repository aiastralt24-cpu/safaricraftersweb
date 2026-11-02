'use client';
import {useHomepageMotion} from './useHomepageMotion';
import {Header} from './Header';
import {CmsLandingSections} from './CmsLandingSections';
import type {PublishedHeader} from '../lib/cms/published-header';
import type {resolveHomepageDependencies} from '../lib/cms/homepage-dependencies';
import './CmsHomepage.css';
export type ResolvedHomepage=Awaited<ReturnType<typeof resolveHomepageDependencies>>;
/** The server must authorize and resolve the published revision before rendering. */
export function CmsHomepage({content,header}:{content:ResolvedHomepage;header:PublishedHeader}){
 const root=useHomepageMotion(content.page.revisionId);
 return <div ref={root} className='concept-page cms-homepage' data-cms-revision={content.page.revisionId}><Header cmsHeader={header} menuId="cms-homepage-menu"/><CmsLandingSections content={content}/></div>;
}
