'use client';
import {TanzaniaSectionFields} from './tanzania-section-fields';
import {tanzaniaSectionKinds,tanzaniaSectionNames,type TanzaniaSectionKind} from '../../lib/cms/tanzania-country-sections';
import {createTanzaniaSection} from '../../lib/cms/tanzania-section-drafts';
import {KenyaSectionFields} from './kenya-section-fields';
import {kenyaSectionKinds,kenyaSectionNames,type KenyaSectionKind} from '../../lib/cms/kenya-country-sections';
import {createKenyaSection} from '../../lib/cms/kenya-section-drafts';
import {MiceSectionFields} from './mice-section-fields';
import {miceSectionKinds,miceSectionNames,type MiceSectionKind} from '../../lib/cms/mice-content';
import {createMiceSection} from '../../lib/cms/mice-section-drafts';
import {PrivateAviationSectionFields} from './private-aviation-section-fields';
import {aviationSectionKinds,type AviationSectionKind} from '../../lib/cms/private-aviation-content';
import {createAviationSection,aviationSectionNames} from '../../lib/cms/private-aviation-section-drafts';
import {GuidedSafarisSectionFields} from './guided-safaris-section-fields';
import {guidedSectionKinds,type GuidedSectionKind} from '../../lib/cms/guided-safaris-content';
import {createGuidedSection,guidedSectionNames} from '../../lib/cms/guided-safaris-section-drafts';
import {ContactSectionFields} from './contact-section-fields';
import {contactSectionKinds,contactSectionNames,type ContactSectionKind} from '../../lib/cms/contact-content';
import {createContactSection} from '../../lib/cms/contact-section-drafts';
import {ConservationSectionFields} from './conservation-section-fields';
import {conservationSectionKinds,conservationSectionNames,type ConservationSectionKind} from '../../lib/cms/conservation-content';
import {createConservationSection} from '../../lib/cms/conservation-section-drafts';
import {HomepageGuestNotesFields} from './homepage-guest-notes-fields';
import {createHomepageGuestNotesSection} from '../../lib/cms/section-drafts';
import {HomepageDeparturesFields} from './homepage-departures-fields';
import {createHomepageDeparturesSection} from '../../lib/cms/section-drafts';
import {HomepageJourneysFields} from './homepage-journeys-fields';
import {createHomepageJourneysSection} from '../../lib/cms/section-drafts';
import {HomepageAviationFields} from './homepage-aviation-fields';
import {createHomepageAviationSection} from '../../lib/cms/section-drafts';
import {HomepageCorporateFields} from './homepage-corporate-fields';
import {createHomepageCorporateSection} from '../../lib/cms/section-drafts';
import {HomepagePartnersFields} from './homepage-partners-fields';
import {createHomepagePartnersSection} from '../../lib/cms/section-drafts';
import {HomepageJourneyTypesFields} from './homepage-journey-types-fields';
import {createHomepageJourneyTypesSection} from '../../lib/cms/section-drafts';
import {HomepageConciergeFields} from './homepage-concierge-fields';
import {createHomepageConciergeSection} from '../../lib/cms/section-drafts';
import {HomepageStoryFields} from './homepage-story-fields';
import {createHomepageStorySection} from '../../lib/cms/section-drafts';
import {HomepageHeroFields} from './homepage-hero-fields';
import {createHomepageHeroSection} from '../../lib/cms/section-drafts';
import {HeadingEmphasisEditor} from './heading-emphasis-editor';
import {editCompositionDraft,validateComposition} from '../../lib/cms/composition';
import type {Composition,CompositionCommand} from '../../lib/cms/composition';
import {useState} from 'react';
import {useDraftHistory} from './use-draft-history';
import {DownloadSectionFields} from './download-section-fields';
import {createDownloadSectionDraft} from '../../lib/cms/section-drafts';
import {SectionControlsEditor} from './section-controls-editor';
import {ReferenceSectionFields} from './reference-section-fields';
import {createReferenceSectionDraft,referenceSectionNames} from '../../lib/cms/section-drafts';
import type {ReferenceSectionKind} from '../../lib/cms/section-drafts';
import {CollectionSectionFields} from './collection-section-fields';
import type {CollectionSectionKind} from '../../lib/cms/section-drafts';
import {createCollectionSectionDraft,collectionSectionNames,createImageSectionDraft} from '../../lib/cms/section-drafts';
import {ImageSectionFields} from './image-section-fields';
import type {ImageEditorContext} from './section-image-editor';
import {RichTextEditor} from './rich-text-editor';
import {SectionPanelsEditor} from './section-panels-editor';
import {SectionButtonsEditor} from './section-buttons-editor';
import {ExpeditionDirectoryFields} from './expedition-directory-fields';
import {createExpeditionDirectorySection,createSpecialistDirectorySection} from '../../lib/cms/section-drafts';
type Props={historyEnabled?:boolean;allowedKinds?:readonly string[];imageContext?:ImageEditorContext;value:Composition;disabled:boolean;onChange:(value:Composition)=>void};
export function PageComposer({value,disabled,onChange,imageContext,allowedKinds,historyEnabled=true}:Props){
 const [error,setError]=useState('');
 const history=useDraftHistory(value,onChange,disabled||!historyEnabled);
 const changeDraft=(next:Composition)=>{if(disabled)return;if(historyEnabled)history.change(next);else onChange(next);};
 const allowed=(kind:string)=>!allowedKinds||allowedKinds.includes(kind);
 function command(c:CompositionCommand){try{changeDraft(editCompositionDraft(value,c));setError('');}catch(e){setError(e instanceof Error?e.message:'Check the section.');}}
 function change(index:number,patch:Partial<Composition['sections'][number]>){changeDraft({...value,sections:value.sections.map((s,i)=>i===index?{...s,...patch}:s)});}
 function add(kind:TanzaniaSectionKind|KenyaSectionKind|MiceSectionKind|AviationSectionKind|GuidedSectionKind|ContactSectionKind|ConservationSectionKind|'downloads'|'homepageGuestNotes'|'homepageDepartures'|'homepageJourneys'|'homepageAviation'|'homepageCorporate'|'homepagePartners'|'homepageJourneyTypes'|'homepageConcierge'|'homepageStory'|'homepageHero'|'text'|'cta'|'faq'|'tabs'|'hero'|'imageText'|'gallery'|'specialistDirectory'|'expeditionDirectory'|CollectionSectionKind|ReferenceSectionKind){
  if(disabled||!allowed(kind))return;
  const itemId=crypto.randomUUID();
  if(tanzaniaSectionKinds.includes(kind as TanzaniaSectionKind)){command({type:'insert',section:createTanzaniaSection(kind as TanzaniaSectionKind,crypto.randomUUID()),at:value.sections.length});return;}
  if(kenyaSectionKinds.includes(kind as KenyaSectionKind)){command({type:'insert',section:createKenyaSection(kind as KenyaSectionKind,crypto.randomUUID()),at:value.sections.length});return;}
  if(miceSectionKinds.includes(kind as MiceSectionKind)){command({type:'insert',section:createMiceSection(kind as MiceSectionKind,crypto.randomUUID()),at:value.sections.length});return;}
  if(aviationSectionKinds.includes(kind as AviationSectionKind)){command({type:'insert',section:createAviationSection(kind as AviationSectionKind,crypto.randomUUID()),at:value.sections.length});return;}
  if(guidedSectionKinds.includes(kind as GuidedSectionKind)){command({type:'insert',section:createGuidedSection(kind as GuidedSectionKind,crypto.randomUUID()),at:value.sections.length});return;}
  if(contactSectionKinds.includes(kind as ContactSectionKind)){command({type:'insert',section:createContactSection(kind as ContactSectionKind,crypto.randomUUID()),at:value.sections.length});return;}
  if(conservationSectionKinds.includes(kind as ConservationSectionKind)){command({type:'insert',section:createConservationSection(kind as ConservationSectionKind,crypto.randomUUID(),itemId),at:value.sections.length});return;}
  if(kind==='downloads'){command({type:'insert',section:createDownloadSectionDraft(crypto.randomUUID()),at:value.sections.length});return;}
  if(kind==='homepageGuestNotes'){command({type:'insert',section:createHomepageGuestNotesSection(crypto.randomUUID()),at:value.sections.length});return;}
  if(kind==='homepageDepartures'){command({type:'insert',section:createHomepageDeparturesSection(crypto.randomUUID()),at:value.sections.length});return;}
  if(kind==='homepageJourneys'){command({type:'insert',section:createHomepageJourneysSection(crypto.randomUUID()),at:value.sections.length});return;}
  if(kind==='homepageAviation'){command({type:'insert',section:createHomepageAviationSection(crypto.randomUUID(),itemId),at:value.sections.length});return;}
  if(kind==='homepageCorporate'){command({type:'insert',section:createHomepageCorporateSection(crypto.randomUUID(),itemId,crypto.randomUUID()),at:value.sections.length});return;}
  if(kind==='homepagePartners'){command({type:'insert',section:createHomepagePartnersSection(crypto.randomUUID(),itemId,crypto.randomUUID()),at:value.sections.length});return;}
  if(kind==='homepageJourneyTypes'){command({type:'insert',section:createHomepageJourneyTypesSection(crypto.randomUUID(),itemId),at:value.sections.length});return;}
  if(kind==='homepageConcierge'){command({type:'insert',section:createHomepageConciergeSection(crypto.randomUUID(),itemId),at:value.sections.length});return;}
  if(kind==='homepageStory'){command({type:'insert',section:createHomepageStorySection(crypto.randomUUID(),itemId),at:value.sections.length});return;}
  if(kind==='homepageHero'){command({type:'insert',section:createHomepageHeroSection(crypto.randomUUID(),itemId),at:value.sections.length});return;}
  if(kind==='expeditionDirectory'){command({type:'insert',section:createExpeditionDirectorySection(itemId),at:value.sections.length});return;}
  if(kind==='specialistDirectory'){command({type:'insert',section:createSpecialistDirectorySection(itemId),at:value.sections.length});return;}
  if(kind==='reusableLeadership'||kind==='reusableFaq'||kind==='testimonials'||kind==='productListing'||kind==='projects'||kind==='related'){command({type:'insert',section:createReferenceSectionDraft(kind,crypto.randomUUID()),at:value.sections.length});return;}
  if(kind==='cards'||kind==='statistics'||kind==='timeline'||kind==='logos'){command({type:'insert',section:createCollectionSectionDraft(kind,crypto.randomUUID(),itemId),at:value.sections.length});return;}
  if(kind==='hero'||kind==='imageText'||kind==='gallery'){command({type:'insert',section:createImageSectionDraft(kind,crypto.randomUUID(),itemId),at:value.sections.length});return;}
  const parsed=validateComposition({schemaVersion:1,title:'Section',sections:[{id:crypto.randomUUID(),kind,controls:{label:({text:'Text section',cta:'Call to action',faq:'Frequently asked questions',tabs:'Tabbed content'})[kind as 'text'|'cta'|'faq'|'tabs']},data:kind==='faq'?{title:'Frequently asked questions',items:[{id:itemId,question:'New question',answer:[]}]}:kind==='tabs'?{title:'Explore more',defaultTabId:itemId,items:[{id:itemId,label:'Overview',body:[]}]}:kind==='text'?{title:'New section',body:[{kind:'paragraph',text:''}]}:{title:'Plan your journey',copy:'',buttons:[{label:'Enquire',href:'/contact'}]}}]});
  if(parsed.page)command({type:'insert',section:parsed.page.sections[0],at:value.sections.length});
 }
 return <section className='cms-composer' aria-label='Page sections'><h3>Page sections</h3>{historyEnabled&&<><div className='cms-actions' aria-label='Section edit history'><button type='button' disabled={!history.canUndo} onClick={()=>{history.undo();setError('');}}>Undo section change</button><button type='button' disabled={!history.canRedo} onClick={()=>{history.redo();setError('');}}>Redo section change</button></div><p>Undo and redo apply to unsaved section edits in this session. Saving or loading another draft starts a new history.</p></>}<p>Arrange approved sections and save the draft when ready. Duplicates start hidden.</p>{error&&<p role='alert'>{error}</p>}
 {value.sections.map((s,index)=>{const data=s.data as Record<string,any>;return <fieldset key={s.id} data-section-editor={s.id} tabIndex={-1} disabled={disabled}><legend>{index+1}. {s.controls.label} · {s.kind}</legend>
 {!allowed(s.kind)&&<p role='status'>This section is preserved, but this page template cannot publish it while visible. Hide or remove it before publishing.</p>}
 <SectionControlsEditor kind={s.kind} value={s.controls} onChange={controls=>change(index,{controls})}/>
 {imageContext&&tanzaniaSectionKinds.includes(s.kind as TanzaniaSectionKind)&&<TanzaniaSectionFields kind={s.kind as TanzaniaSectionKind} value={data} context={imageContext} onChange={data=>change(index,{data})}/>}
 {imageContext&&kenyaSectionKinds.includes(s.kind as KenyaSectionKind)&&<KenyaSectionFields kind={s.kind as KenyaSectionKind} value={data} context={imageContext} onChange={data=>change(index,{data})}/>}
 {imageContext&&miceSectionKinds.includes(s.kind as MiceSectionKind)&&<MiceSectionFields kind={s.kind as MiceSectionKind} value={data} context={imageContext} onChange={data=>change(index,{data})}/>}
 {imageContext&&aviationSectionKinds.includes(s.kind as AviationSectionKind)&&<PrivateAviationSectionFields kind={s.kind as AviationSectionKind} value={data} context={imageContext} onChange={data=>change(index,{data})}/>}
 {imageContext&&guidedSectionKinds.includes(s.kind as GuidedSectionKind)&&<GuidedSafarisSectionFields kind={s.kind as GuidedSectionKind} value={data} context={imageContext} onChange={data=>change(index,{data})}/>}
 {imageContext&&contactSectionKinds.includes(s.kind as ContactSectionKind)&&<ContactSectionFields kind={s.kind as ContactSectionKind} value={data} context={imageContext} onChange={data=>change(index,{data})}/>}
 {imageContext&&conservationSectionKinds.includes(s.kind as ConservationSectionKind)&&<ConservationSectionFields kind={s.kind as ConservationSectionKind} value={data} context={imageContext} onChange={data=>change(index,{data})}/>}
 {s.kind==='expeditionDirectory'&&<ExpeditionDirectoryFields data={data} onChange={data=>change(index,{data})}/>}
 {s.kind==='specialistDirectory'&&<><label>Directory heading<input maxLength={200} value={data.title} onChange={e=>change(index,{data:{...data,title:e.target.value}})}/></label><label>Related journeys heading<input maxLength={200} value={data.relatedHeading} onChange={e=>change(index,{data:{...data,relatedHeading:e.target.value}})}/></label><label>Empty directory message<textarea maxLength={2000} value={data.emptyMessage} onChange={e=>change(index,{data:{...data,emptyMessage:e.target.value}})}/></label><p>This section uses visible published profiles in their specialist display order. Edit profiles, visibility and order in Specialists. Page publication and the live directory connection are still being completed.</p></>}
 {s.kind==='downloads'&&imageContext&&<DownloadSectionFields key={`${imageContext.site}:${s.id}`} data={data as any} context={imageContext} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepageGuestNotes'&&imageContext&&<HomepageGuestNotesFields value={data as any} context={imageContext} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepageDepartures'&&imageContext&&<HomepageDeparturesFields value={data as any} context={imageContext} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepageJourneys'&&imageContext&&<HomepageJourneysFields value={data as any} context={imageContext} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepageAviation'&&imageContext&&<HomepageAviationFields value={data as any} context={imageContext} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepageCorporate'&&imageContext&&<HomepageCorporateFields value={data as any} context={imageContext} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepagePartners'&&imageContext&&<HomepagePartnersFields value={data as any} context={imageContext} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepageJourneyTypes'&&imageContext&&<HomepageJourneyTypesFields value={data as any} context={imageContext} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepageConcierge'&&<HomepageConciergeFields value={data as any} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepageStory'&&<HomepageStoryFields value={data as any} onChange={data=>change(index,{data})}/>}
 {s.kind==='homepageHero'&&imageContext&&<HomepageHeroFields value={data as any} context={imageContext} onChange={data=>change(index,{data})}/>}
 {['text','cta','faq','tabs','hero','imageText','gallery','cards','statistics','timeline','logos','reusableLeadership','reusableFaq','testimonials','productListing','projects','related'].includes(s.kind)?<><label>Section heading<input maxLength={200} value={data.title??''} onChange={e=>change(index,{data:{...data,title:e.target.value}})}/></label>
 {s.kind==='text'&&<label>Text layout<select value={data.layout??'stacked'} onChange={e=>change(index,{data:{...data,layout:e.target.value}})}><option value='stacked'>Heading above copy</option><option value='split'>Heading beside copy</option></select></label>}
 {['text','imageText','cards','cta'].includes(s.kind)&&<label>Section label (optional)<input maxLength={200} value={data.eyebrow??''} onChange={e=>{const next={...data};if(e.target.value)next.eyebrow=e.target.value;else delete next.eyebrow;change(index,{data:next});}}/></label>}
 {['hero','text','imageText','cards','cta'].includes(s.kind)&&<HeadingEmphasisEditor title={data.title??''} accent={data.titleAccent} onChange={titleAccent=>{const next={...data};if(titleAccent===undefined)delete next.titleAccent;else next.titleAccent=titleAccent;change(index,{data:next});}}/>}
 {['reusableLeadership','reusableFaq','testimonials','productListing','projects','related'].includes(s.kind)?imageContext?<ReferenceSectionFields kind={s.kind} data={data} context={imageContext} onChange={data=>change(index,{data})}/>:<p>Connect the record library to edit selections.</p>:['cards','statistics','timeline','logos'].includes(s.kind)?<CollectionSectionFields kind={s.kind as CollectionSectionKind} data={data} context={imageContext} onChange={data=>change(index,{data})}/>:['hero','imageText','gallery'].includes(s.kind)?imageContext?<ImageSectionFields kind={s.kind} data={data} context={imageContext} onChange={data=>change(index,{data})}/>:<p>Connect the media library to edit images.</p>:s.kind==='faq'||s.kind==='tabs'?<SectionPanelsEditor kind={s.kind} items={data.items} defaultTabId={data.defaultTabId} onChange={(items,defaultTabId)=>change(index,{data:{...data,items,...(s.kind==='tabs'?{defaultTabId}:{})}})}/>:s.kind==='cta'?<><label>Supporting text<textarea maxLength={50000} value={data.copy} onChange={e=>change(index,{data:{...data,copy:e.target.value}})}/></label><SectionButtonsEditor min={1} value={data.buttons} onChange={buttons=>change(index,{data:{...data,buttons}})}/></>:<RichTextEditor value={data.body} onChange={body=>change(index,{data:{...data,body}})}/>}

 </>:['specialistDirectory','expeditionDirectory','homepageStory','homepageConcierge',...(imageContext?[...tanzaniaSectionKinds,...kenyaSectionKinds,...miceSectionKinds,...guidedSectionKinds,...contactSectionKinds,...conservationSectionKinds,'downloads','homepageHero','homepageJourneyTypes','homepagePartners','homepageCorporate','homepageAviation','homepageJourneys','homepageDepartures','homepageGuestNotes']:[])].includes(s.kind)?null:<p>This section’s content is preserved. Its detailed editing form is being added.</p>}
 <div className='cms-actions'><button type='button' disabled={index===0} onClick={()=>command({type:'move',id:s.id,to:index-1})}>Move section up</button><button type='button' disabled={index===value.sections.length-1} onClick={()=>command({type:'move',id:s.id,to:index+1})}>Move section down</button><button type='button' onClick={()=>command({type:'duplicate',id:s.id,newId:crypto.randomUUID()})}>Duplicate section</button><button type='button' onClick={()=>{if(window.confirm('Remove this section from the draft?'))command({type:'remove',id:s.id});}}>Remove section</button></div>
 </fieldset>;})}<div className='cms-actions'>{imageContext&&tanzaniaSectionKinds.filter(allowed).map(kind=><button key={kind} type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add(kind)}>Add {tanzaniaSectionNames[kind].toLowerCase()}</button>)}{imageContext&&kenyaSectionKinds.filter(allowed).map(kind=><button key={kind} type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add(kind)}>Add {kenyaSectionNames[kind].toLowerCase()}</button>)}{imageContext&&miceSectionKinds.filter(allowed).map(kind=><button key={kind} type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add(kind)}>Add {miceSectionNames[kind].toLowerCase()}</button>)}{imageContext&&aviationSectionKinds.filter(allowed).map(kind=><button key={kind} type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add(kind)}>Add {aviationSectionNames[kind].toLowerCase()}</button>)}{imageContext&&guidedSectionKinds.filter(allowed).map(kind=><button key={kind} type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add(kind)}>Add {guidedSectionNames[kind].toLowerCase()}</button>)}{imageContext&&contactSectionKinds.filter(allowed).map(kind=><button key={kind} type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add(kind)}>Add {contactSectionNames[kind].toLowerCase()}</button>)}{imageContext&&conservationSectionKinds.filter(allowed).map(kind=><button key={kind} type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add(kind)}>Add {conservationSectionNames[kind].toLowerCase()}</button>)}{allowed('homepageConcierge')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepageConcierge')}>Add journey planning choices</button>}{allowed('homepageStory')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepageStory')}>Add homepage story and experience</button>}{allowed('expeditionDirectory')&&<button disabled={disabled||value.sections.length>=100} onClick={()=>add('expeditionDirectory')}>Add expedition directory</button>}{allowed('specialistDirectory')&&<button disabled={disabled||value.sections.length>=100} onClick={()=>add('specialistDirectory')}>Add specialist directory</button>}{allowed('text')&&<button disabled={disabled||value.sections.length>=100} onClick={()=>add('text')}>Add text section</button>}{allowed('cta')&&<button disabled={disabled||value.sections.length>=100} onClick={()=>add('cta')}>Add call to action</button>}{allowed('faq')&&<button disabled={disabled||value.sections.length>=100} onClick={()=>add('faq')}>Add FAQ section</button>}{allowed('tabs')&&<button disabled={disabled||value.sections.length>=100} onClick={()=>add('tabs')}>Add tabbed section</button>}{imageContext&&<>{allowed('downloads')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('downloads')}>Add document downloads</button>}{allowed('homepageGuestNotes')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepageGuestNotes')}>Add homepage guest notes</button>}{allowed('homepageDepartures')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepageDepartures')}>Add upcoming departure board</button>}{allowed('homepageJourneys')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepageJourneys')}>Add curated journeys</button>}{allowed('homepageAviation')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepageAviation')}>Add private aviation</button>}{allowed('homepageCorporate')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepageCorporate')}>Add corporate journeys</button>}{allowed('homepagePartners')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepagePartners')}>Add preferred partners</button>}{allowed('homepageJourneyTypes')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepageJourneyTypes')}>Add ways to journey</button>}{allowed('homepageHero')&&<button type='button' disabled={disabled||value.sections.length>=100} onClick={()=>add('homepageHero')}>Add homepage hero</button>}{allowed('hero')&&<button disabled={disabled||value.sections.length>=100} onClick={()=>add('hero')}>Add hero section</button>}{allowed('imageText')&&<button disabled={disabled||value.sections.length>=100} onClick={()=>add('imageText')}>Add image and text</button>}{allowed('gallery')&&<button disabled={disabled||value.sections.length>=100} onClick={()=>add('gallery')}>Add gallery</button>}</>}{(Object.keys(collectionSectionNames) as CollectionSectionKind[]).filter(kind=>allowed(kind)&&(kind!=='logos'||imageContext)).map(kind=><button key={kind} disabled={disabled||value.sections.length>=100} onClick={()=>add(kind)}>Add {collectionSectionNames[kind].toLowerCase()} section</button>)}{imageContext&&(Object.keys(referenceSectionNames) as ReferenceSectionKind[]).filter(allowed).map(kind=><button key={kind} disabled={disabled||value.sections.length>=100} onClick={()=>add(kind)}>Add {referenceSectionNames[kind].toLowerCase()} section</button>)}</div></section>;
}
