import {projectHomepageSections} from './homepage-projection.ts';
import {resolveLandingDependencies,type LandingPublishedReaders} from './landing-page-dependencies.ts';
export type HomepagePublishedReaders=LandingPublishedReaders;
/** Published-only dependency resolution after homepage-specific projection. */
export async function resolveHomepageDependencies(input:unknown,site:string,context:{locale:string;now:Date},read:HomepagePublishedReaders){
 return resolveLandingDependencies(projectHomepageSections(input,context),site,context,read);
}
