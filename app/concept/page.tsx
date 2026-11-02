import type {Metadata} from 'next';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import LegacyConceptPage,{metadata as legacyMetadata} from './LegacyConceptPage';
import {CmsConceptPage} from '../../components/CmsConceptPage';
import {readPublishedConcept,usesCmsConcept} from '../../lib/cms/published-concept';
import {conceptPageMetadata} from '../../lib/cms/concept-page';
import './concept.css';
import './concept-harmony.css';
export const dynamic='force-dynamic';
const loadCmsPage=cache(()=>readPublishedConcept());
export async function generateMetadata():Promise<Metadata>{
 if(!usesCmsConcept())return legacyMetadata;
 const published=await loadCmsPage();
 return published?conceptPageMetadata(published.content.page,published.seoDefaults):{robots:{index:false,follow:false}};
}
export default async function ConceptPage(){
 if(!usesCmsConcept())return <LegacyConceptPage/>;
 const published=await loadCmsPage();
 if(!published)notFound();
 return <CmsConceptPage content={published.content}/>;
}
