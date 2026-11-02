import {tanzaniaCountryContentSchema} from './tanzania-country-content.ts';
import {createTanzaniaSection} from './tanzania-section-drafts.ts';
import {tanzaniaSectionKinds} from './tanzania-country-sections.ts';
import {validateComposition} from './composition.ts';
/** Structural draft only. Media ownership, preview and release are separate checks. */
export function tanzaniaContentDraft(input:unknown){
 const content=tanzaniaCountryContentSchema.parse(input);
 const sections=tanzaniaSectionKinds.map(kind=>{const suffix=kind.slice('tanzania'.length),group=(suffix[0].toLowerCase()+suffix.slice(1)) as keyof typeof content;return {...createTanzaniaSection(kind,kind),data:content[group]};});
 const result=validateComposition({schemaVersion:1,title:content.hero.title,sections});
 if(!result.valid||!result.page)throw Error('Invalid Tanzania page composition.');
 return {composition:result.page,seo:content.seo};
}
