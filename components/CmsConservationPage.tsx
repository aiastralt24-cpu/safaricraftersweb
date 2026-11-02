import type {PublishedConservationPage} from '../lib/cms/conservation-page';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import {CmsConservationSection} from './CmsConservationSection';
import './CmsConservationPage.css';
import {CmsConservationMotion} from './CmsConservationMotion';
/** Published input must come from the trusted delivery projection. */
export function CmsConservationPage({page}:{page:Pick<PublishedConservationPage,'sections'|'revisionId'>}){
 return <CmsConservationMotion revisionKey={page.revisionId}>{page.sections.map(section=><section key={section.id} id={section.controls.anchor} data-cms-motion={section.controls.animation} className={`cms-conservation-section section-${section.kind} background-${section.controls.background} spacing-${section.controls.spacing} width-${section.controls.width} align-${section.controls.textAlign}`}><CmsConservationSection section={section} renderImage={image=><img src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading={section.kind==='conservationHero'?'eager':'lazy'} fetchPriority={section.kind==='conservationHero'?'high':undefined}/>}/></section>)}</CmsConservationMotion>;
}
