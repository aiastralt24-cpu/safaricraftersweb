import {z} from 'zod';
import {image} from './composition-media.ts';
import {newPageSeo} from './page-seo.ts';
import {tanzaniaCountryContentSchema} from './tanzania-country-content.ts';
import {tanzaniaPageCopy as copy} from '../../content/tanzania-page-copy.ts';
import {tanzaniaDescription,tanzaniaPlaces,tanzaniaCombinations,tanzaniaFaqs} from '../../content/tanzania-editorial.ts';
const media=z.object({hero:image,places:z.object({serengeti:image,ngorongoro:image,ndutu:image,tarangire:image,'lake-manyara':image}).strict(),gallery:z.array(image).min(1).max(30),itineraries:z.array(image).length(4)}).strict();
const heading=(text:string)=>({lines:[{runs:[{text,emphasis:false}]}]});
const planner=(interest:string)=>({label:'Start planning',interest,region:'Africa',dialogLabel:`Plan ${interest}`,dialogEyebrow:'Your private journey',closeLabel:'Close planner'});
/** Converts retained source copy with explicitly supplied CMS media. It does not approve assets or save/publish a page. */
export function tanzaniaSourceDraft(input:unknown){
 const assets=media.parse(input);
 return tanzaniaCountryContentSchema.parse({schemaVersion:1,
  hero:{title:'Tanzania',accent:'Tanzania',copy:tanzaniaDescription,meta:'Africa / East Africa',image:assets.hero,focalPoint:{x:58,y:90},breadcrumbs:[{id:'home',label:'Home',href:'/'},{id:'destinations',label:'Destinations',href:'/destinations'},{id:'africa',label:'Africa',href:'/destinations/africa'},{id:'current',label:'Tanzania'}]},
  facts:{accessibleLabel:copy.factsLabel,items:copy.facts},
  introduction:{eyebrow:copy.introduction.eyebrow,heading:heading(copy.introduction.heading),lead:copy.introduction.lead,paragraphs:[{id:'intro',text:copy.introduction.copy}]},
  places:{eyebrow:copy.places.eyebrow,heading:heading(copy.places.heading),items:tanzaniaPlaces.map(place=>({id:place.slug,title:place.title,subtitle:place.subtitle,copy:place.copy,image:assets.places[place.slug as keyof typeof assets.places],imageCaption:place.slug==='ndutu'?copy.places.ndutuCaption:'',planner:planner(`${place.title}, Tanzania`)}))},
  gallery:{heading:heading(copy.gallery.heading),copy:copy.gallery.copy,accessibleLabel:copy.gallery.label,images:assets.gallery.map((image,index)=>({id:`gallery-${index+1}`,image}))},
  itineraries:{eyebrow:copy.itineraries.eyebrow,heading:heading(copy.itineraries.heading),items:tanzaniaCombinations.map((item,index)=>({id:`itinerary-${index+1}`,title:item.title,label:item.duration,copy:item.copy,image:assets.itineraries[index],planner:planner(`${item.title} — ${item.duration}`)}))},
  faq:{eyebrow:copy.faq.eyebrow,heading:{lines:copy.faq.lines.map(text=>({runs:[{text,emphasis:false}]}))},items:tanzaniaFaqs.map((faq,index)=>({id:`faq-${index+1}`,...faq}))},
  planner:{eyebrow:copy.planner.eyebrow,heading:heading(copy.planner.heading),copy:copy.planner.copy,planner:planner('Tanzania')},
  related:{eyebrow:copy.related.eyebrow,heading:heading(copy.related.heading),items:copy.related.items.map(item=>({id:item.id,title:item.title,copy:item.copy,button:{label:item.label,href:item.href}}))},
  seo:{...newPageSeo(),title:'Tanzania',description:tanzaniaDescription},
 });
}
