import capture from '../../docs/cms/concept-migration-inventory.json' with {type:'json'};
import sourceData from '../../content/site-content.json' with {type:'json'};
import {conceptCaptureDigest,conceptMigrationDependencies,conceptMigrationMedia,conceptMigrationRecords} from '../../lib/cms/concept-migration-review.ts';
import {newTestimonial} from '../../lib/cms/testimonials.ts';
import {newPhotoExpedition} from '../../lib/cms/photo-expeditions.ts';
export const site='00000000-0000-4000-8000-000000000100',revision='00000000-0000-4000-8000-000000000200';
export function makeConceptMigrationFixture(){
 const mappings={captureDigest:conceptCaptureDigest,media:conceptMigrationMedia.map((item,index)=>({sourcePath:item.sourcePath,sourceSha256:item.sha256,assetId:item.kind==='video'?`00000000-0000-4000-8000-${String(index+1000).padStart(12,'0')}`:`asset-${index}`})),records:conceptMigrationRecords.map((item,index)=>({sourceKey:item.sourceKey,recordId:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`}))};
 const image=source=>({assetId:mappings.media.find(item=>item.sourcePath===source.sourcePath).assetId,alt:source.alt,decorative:false});
 let j=0,e=0,g=0;
 const records=conceptMigrationRecords.map((item,index)=>{
  let payload;
  if(item.type==='journey'){
   const source=capture.content.find(item=>item.navLabel==='Private journeys'),n=j++;
   payload={slug:item.path.split('/').at(-1),title:source.headings[n+1].lines.map(line=>line.runs.map(run=>run.text).join('')).join(' '),duration:source.paragraphs[2+n*2].text,region:source.paragraphs[3+n*2].text,media:[{...image(source.images[n]),role:'hero'}]};
  }else if(item.type==='testimonial'){
   const source=capture.states.filter(state=>state.kind==='guest-note')[g++].content,name=source.paragraphs[2].parts[0].text;
   payload={...newTestimonial(),name,anonymous:name==='Anonymous guest',quote:source.quotes[0],trip:source.figures[0],guestType:source.paragraphs[1].text,verified:true,consent:{status:'granted',evidence:'PRIVATE_CONSENT_EVIDENCE'}};
  }else{
   const source=capture.content.find(item=>item.navLabel==='Photography Tours'),n=e++,slug=item.path.split('/').at(-1),original=sourceData.expeditions.find(item=>item.slug===slug);
   payload={...newPhotoExpedition(),slug,title:source.migration.departures[n].title,duration:source.migration.departures[n].metadata.split(' · ')[0],image:image(source.images[n]),departures:original.departures.map((departure,i)=>({id:`date-${i}`,date:departure.date,...(departure.endDate?{endDate:departure.endDate}:{}),status:departure.status||'Available',availability:departure.availability||''}))};
  }
  return {websiteId:site,id:mappings.records[index].recordId,currentRevision:revision,locale:'en',type:item.type,path:item.path,payload};
 });
 return {mappings,records};
}
