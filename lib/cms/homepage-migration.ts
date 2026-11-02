import capture from '../../docs/cms/homepage-rendered-inventory.json' with {type:'json'};
import {reviewHomepageMigration} from './homepage-migration-review.ts';
import {capturedHeadingToEditorial,capturedParagraphToEditorial} from './captured-editorial.ts';
import {validateComposition} from './composition.ts';
import {editorialHeadingSchema} from './editorial-heading.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';

/** A proposal only. Complete mappings permit constructing a preview, never apply
 * authority. Provider verification and source presentation remain independent. */
export function planHomepageMigration(currentHashes:unknown,mappings?:unknown){
 const review=reviewHomepageMigration(currentHashes,mappings);
 if(review.missingMedia.length||review.missingRecords.length)return {...review,previewPayload:null};
 const section=(label:string)=>{const found=capture.sections.filter(item=>item.label===label);if(found.length!==1)throw Error(`Review section ${label}.`);return found[0];};
 const asset=(sourcePath:string)=>{const found=review.media.find(item=>item.sourcePath===sourcePath);if(!found?.proposedAssetId)throw Error('Source asset mapping missing.');return found.proposedAssetId;};
 const record=(type:string,path:string)=>{const found=review.records.find(item=>item.type===type&&item.path===path);if(!found?.proposedRecordId)throw Error('Source record mapping missing.');return found.proposedRecordId;};
 const image=(source:{sourcePath:string|null;alt:string|null},caption?:string)=>{
  if(!source.sourcePath||!source.alt?.trim())throw Error('Source image path/alternative text requires review.');
  return {assetId:asset(source.sourcePath),alt:source.alt,decorative:false,...(caption?{caption}:{})};
 };
 const framing=(source:{objectPosition:string})=>{const match=/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(source.objectPosition);if(!match)throw Error('Review source image framing.');return {shape:'natural',x:Number(match[1]),y:Number(match[2])};};
 const heading=(source:{parts:unknown})=>capturedHeadingToEditorial(source.parts);
 const button=(source:{label:string;href:string|null})=>({label:source.label.replace(/ ↗$/,''),href:source.href,newWindow:false});
 const counts=(source:ReturnType<typeof section>,expected:{headings?:number;paragraphs?:number;images?:number;links?:number})=>{
  for(const [key,count] of Object.entries(expected))if(source[key as keyof typeof expected].length!==count)throw Error(`Source structure changed: ${source.label}/${key}.`);
 };
 const hero=section('The wild, considered'),story=section('Our story'),ways=section('Ways to journey'),journeys=section('Private journeys'),departures=section('Photography Tours'),corporate=section('Corporate journeys'),aviation=section('Private jet safaris'),partners=section('Preferred partners'),guests=section('Guest Notes'),concierge=section('Begin your journey');
 counts(hero,{headings:1,images:1,paragraphs:0,links:0});counts(story,{headings:1,paragraphs:3,links:1});
 counts(ways,{headings:4,paragraphs:3,images:3,links:3});counts(corporate,{headings:4,paragraphs:3,images:2,links:4});
 counts(aviation,{headings:1,paragraphs:3,images:1,links:1});counts(concierge,{headings:2,links:6});
 if(corporate.migration.smallLabels.length!==3||corporate.figures.length!==2||!aviation.migration.benefitsLabel||aviation.migration.benefits.length!==3)throw Error('Source corporate/aviation detail needs review.');
 if(journeys.migration.journeys.length!==3||departures.migration.departures.length!==departures.headings.length-1||!departures.migration.departureBoardLabel)throw Error('Source collection structure needs review.');
 const action=(labels:string[])=>{if(!labels.length||new Set(labels).size!==1||!labels[0])throw Error('Collection action labels need review.');return labels[0];};
 const envelope=(source:ReturnType<typeof section>,kind:string,data:unknown,background='paper')=>({id:`home-${kind.slice(8).toLowerCase()}`,kind,controls:{label:source.label!,background,headingLevel:kind==='homepageHero'?'h1':'h2',...(kind==='homepageGuestNotes'?{mediaAlign:'start',mobileOrder:'mediaFirst'}:{}),...(source.migration.anchor?{anchor:source.migration.anchor}:{})},data});
 const mobileHero=capture.mobileSections.find(item=>item.label===hero.label)!;
 const mobileCorporate=capture.mobileSections.find(item=>item.label===corporate.label)!;
 const focal=(source:{objectPosition:string})=>{const {x,y}=framing(source);return {x,y};};
 const mobileAviation=capture.mobileSections.find(item=>item.label===aviation.label)!;
 const video=capture.heroVideoDeclaration;
 if(video.sources.length!==2||video.sources[0].media!=='(max-width: 767px)'||video.sources[1].media!==null||video.sources.some(item=>item.type!=='video/mp4')||!video.autoplay||!video.loop||!video.muted||!video.playsInline)throw Error('Hero video policy needs explicit migration support.');
 const composition={schemaVersion:1,title:'Homepage',sections:[
  envelope(hero,'homepageHero',{navigationLabel:hero.label,frames:capture.heroFrames.map((frame,index)=>({id:`hero-frame-${index+1}`,heading:editorialHeadingSchema.parse({lines:[{runs:[{text:frame.lead,emphasis:false}]},{runs:[...(frame.rest?[{text:frame.rest+(frame.accent?' ':''),emphasis:false}]:[]),...(frame.accent?[{text:frame.accent,emphasis:true}]:[])]}].filter(line=>line.runs.length)})})),copy:'',poster:image(hero.images[0]),mobilePoster:image(mobileHero.images[0]),framing:framing(hero.images[0]),mobileFraming:framing(mobileHero.images[0]),background:{kind:'video',desktopAssetId:asset(video.sources[1].sourcePath!),mobileAssetId:asset(video.sources[0].sourcePath!)}},'ink'),
  envelope(story,'homepageStory',{eyebrow:story.paragraphs[0].text,heading:heading(story.headings[0]),copy:story.paragraphs[1].text,button:button(story.links[0]),ledgerTitle:story.paragraphs[2].text,statistics:story.statistics.map((stat,index)=>{const match=/^([\d,]+)(\+?)$/.exec(stat.term);if(!match)throw Error('Statistic value needs review.');return {id:`stat-${index+1}`,value:Number(match[1].replaceAll(',','')),suffix:match[2],label:stat.description,source:''};})}),
  envelope(ways,'homepageJourneyTypes',{heading:heading(ways.headings[0]),items:ways.images.map((source,index)=>({id:`journey-type-${index+1}`,heading:heading(ways.headings[index+1]),copy:capturedParagraphToEditorial(ways.paragraphs[index].parts),image:image(source),link:button(ways.links[index])}))}),
  envelope(journeys,'homepageJourneys',{eyebrow:journeys.paragraphs[0].text,heading:heading(journeys.headings[0]),introduction:journeys.paragraphs[1].text,button:button(journeys.links[0]),cardActionLabel:action(journeys.migration.journeys.map(item=>item.action)),items:journeys.migration.journeys.map(item=>({recordId:record('journey',item.href!),kicker:item.kicker}))}),
  envelope(departures,'homepageDepartures',{eyebrow:departures.paragraphs[0].text,heading:heading(departures.headings[0]),button:button(departures.links[0]),cardActionLabel:action(departures.migration.departures.map(item=>item.action)),boardLabel:departures.migration.departureBoardLabel,emptyMessage:'No upcoming photography tours are currently available.',overrides:departures.migration.departures.map(item=>{const parts=item.metadata.split(' · ');if(parts.length!==2)throw Error('Departure metadata needs explicit migration support.');return {recordId:record('photoExpedition',item.href!),title:item.title,location:parts[1]};})},'forest'),
  envelope(corporate,'homepageCorporate',{eyebrow:corporate.paragraphs[0].text,heading:heading(corporate.headings[0]),paragraphs:corporate.paragraphs.slice(1).map((item,index)=>({id:`corporate-copy-${index+1}`,text:item.text})),formats:corporate.migration.smallLabels.map((label,index)=>({id:`corporate-format-${index+1}`,label,title:corporate.headings[index+1].text,href:corporate.links[index].href})),button:button(corporate.links[3]),mainImage:image(corporate.images[0],corporate.figures[0]),insetImage:image(corporate.images[1],corporate.figures[1]),mainFocalPoint:focal(corporate.images[0]),mainMobileFocalPoint:focal(mobileCorporate.images[0]),insetFocalPoint:focal(corporate.images[1]),insetMobileFocalPoint:focal(mobileCorporate.images[1])},'forest'),
  envelope(aviation,'homepageAviation',{eyebrow:aviation.paragraphs[0].text,heading:heading(aviation.headings[0]),copy:aviation.paragraphs[1].text,benefitsLabel:aviation.migration.benefitsLabel,benefits:aviation.migration.benefits.map((text,index)=>({id:`aviation-benefit-${index+1}`,text})),button:button(aviation.links[0]),image:image(aviation.images[0]),desktopFraming:framing(aviation.images[0]),mobileFraming:framing(mobileAviation.images[0])}),
  envelope(partners,'homepagePartners',{eyebrow:partners.paragraphs[0].text,heading:heading(partners.headings[0]),defaultRegionId:'partner-region-1',regions:capture.partners.map((region,index)=>({id:`partner-region-${index+1}`,label:region.region,items:region.content.images.map((source,itemIndex)=>({id:`partner-${index+1}-${itemIndex+1}`,name:source.alt,image:image(source)}))}))}),
  envelope(guests,'homepageGuestNotes',{eyebrow:guests.paragraphs[0].text,heading:heading(guests.headings[0]),button:button(guests.links[0]),cardActionLabel:button(guests.links[1]).label,previousLabel:guests.migration.buttons[0].label,nextLabel:guests.migration.buttons[1].label,items:capture.guestNotes.map((note,index)=>({recordId:review.records.filter(item=>item.type==='testimonial')[index].proposedRecordId,image:image(note.images[0]),href:note.links[1].href}))}),
  envelope(concierge,'homepageConcierge',{heading:heading(concierge.headings[0]),prompt:heading(concierge.headings[1]),choices:concierge.links.slice(0,5).map((link,index)=>({id:`planning-choice-${index+1}`,link:button(link)})),contact:button(concierge.links[5])}),
 ]};
 const validated=validateComposition(composition);if(!validated.valid||!validated.page)throw Error(`Homepage proposal failed validation: ${JSON.stringify(validated.issues)}`);
 if(JSON.stringify(validated.page.sections.map(item=>item.controls.label))!==JSON.stringify(review.sectionOrder))throw Error('Homepage section order changed.');
 const seo=pageSeoSchema.parse({...newPageSeo(),title:capture.metadata.title,description:capture.metadata.description,canonical:capture.metadata.canonical});
 return {...review,findings:[...review.findings.filter(item=>item.code!=='composition_pending'),
  {code:'source_presentation_review',message:'Composition is schema-valid, not visually accepted. Verify motion, carousel styling, hero typography and responsive behavior.'},
  {code:'record_copy_review',message:'Compare mapped journey/testimonial/expedition content and images with captured source records before application; mapping identity alone does not preserve their copy.'},
  {code:'statistic_evidence',message:'Captured statistics preserve visible values but their supporting evidence still needs client review.'},
  {code:'empty_state_copy',message:'The departure empty-state message is new proposed copy; the legacy homepage hid the section when empty. Review before adoption.'},
 ],previewPayload:{composition:validated.page,seo}};
}
