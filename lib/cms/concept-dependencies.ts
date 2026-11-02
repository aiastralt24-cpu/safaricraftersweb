import {projectConceptPage} from './concept-page.ts';
import {resolveLandingDependencies,type LandingPublishedReaders} from './landing-page-dependencies.ts';
export type ConceptPublishedReaders=LandingPublishedReaders;
/** Resolve currently visible Concept dependencies through trusted published-only readers.
 * This is not publication authorization; configured future references need release checks. */
export async function resolveConceptDependencies(input:unknown,site:string,context:{locale:string;now:Date},read:ConceptPublishedReaders){
 return resolveLandingDependencies(projectConceptPage(input,context),site,context,read);
}
