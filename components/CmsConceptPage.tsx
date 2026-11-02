'use client';
import {useHomepageMotion} from './useHomepageMotion';
import {CmsConceptNavigation} from './CmsConceptNavigation';
import {CmsLandingSections} from './CmsLandingSections';
import type {resolveConceptDependencies} from '../lib/cms/concept-dependencies';
import './CmsHomepage.css';
export type ResolvedConcept=Awaited<ReturnType<typeof resolveConceptDependencies>>;
/** Receive a server-resolved public revision only. Never load drafts or bundled fallbacks here. */
export function CmsConceptPage({content}:{content:ResolvedConcept}){
 const root=useHomepageMotion(content.page.revisionId);
 if(!content.page.navigation)throw Error('Published Concept navigation is missing.');
 return <div ref={root} className='concept-page cms-homepage cms-concept-page' data-cms-revision={content.page.revisionId}><CmsConceptNavigation menu={content.page.navigation} revisionKey={content.page.revisionId}/><CmsLandingSections content={content}/></div>;
}
