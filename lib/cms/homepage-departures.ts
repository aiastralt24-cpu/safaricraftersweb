import {sectionDataSchemas} from './composition.ts';
import {projectExpeditionDirectory} from './expedition-directory-view.ts';
import type {z} from 'zod';
export type HomepageDepartures=z.infer<typeof sectionDataSchemas.homepageDepartures>;
/** The caller supplies its site-scoped published directory. Keep one nearest
 * upcoming departure per expedition; never parse editorial date labels. */
export function projectHomepageDepartures(value:unknown,input:unknown,today:string){
 const data=sectionDataSchemas.homepageDepartures.parse(value),directory=projectExpeditionDirectory(input,today);
 if(new Set(directory.cards.map(card=>card.websiteId)).size>1)throw Error('Mixed website expedition directory.');
 const seen=new Set<string>();
 return directory.departures.filter(({card})=>{if(seen.has(card.recordId))return false;seen.add(card.recordId);return true;}).map(({card,departure})=>{
  const override=data.overrides.find(item=>item.recordId===card.recordId);
  return {card,departure,title:override?.title??card.content.title,location:override?.location??card.content.geography};
 });
}
