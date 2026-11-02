import {tanzaniaSectionKinds} from './tanzania-country-sections.ts';
import {kenyaSectionKinds} from './kenya-country-sections.ts';
import {miceSectionKinds} from './mice-content.ts';
import {aviationSectionKinds} from './private-aviation-content.ts';
import {guidedSectionKinds} from './guided-safaris-content.ts';
import {conceptSectionKinds} from './concept-page.ts';
import {contactSectionKinds} from './contact-content.ts';
import {conservationSectionKinds} from './conservation-content.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {aboutSectionKinds} from './about-page.ts';
import {homepageSectionKinds} from './homepage-projection.ts';
import {expeditionPageSectionKinds} from './expedition-page.ts';
import {specialistPageSectionKinds} from './specialist-page.ts';
import {legalPathSchema} from './legal-page.ts';
/** Authoring guidance only; trusted publication validation remains authoritative.
 * Unknown routes keep the full draft palette until their renderer is connected. */
export function pageSectionOptions(type:string,path:string):readonly string[]|undefined{
 if(type==='homepage')return homepageSectionKinds;
 if(type!=='page')return undefined;
 if(path==='/destinations/tanzania')return tanzaniaSectionKinds;
 if(path==='/destinations/kenya')return kenyaSectionKinds;
 if(path==='/mice')return miceSectionKinds;
 if(isCustomPagePath(path))return aboutSectionKinds;
 if(path==='/conservation-commitment')return conservationSectionKinds;
 if(path==='/private-aviation')return aviationSectionKinds;
 if(path==='/guided-bespoke-safaris')return guidedSectionKinds;
 if(path==='/concept')return conceptSectionKinds;
 if(path==='/contact')return contactSectionKinds;
 if(path==='/about')return aboutSectionKinds.filter(kind=>kind!=='reusableFaq');
 if(path==='/photo-expeditions')return expeditionPageSectionKinds;
 if(path==='/specialists')return specialistPageSectionKinds;
 if(legalPathSchema.safeParse(path).success)return ['text','downloads'];
 return undefined;
}
