'use client';
import {retainJourneyKickers} from '../../lib/cms/homepage-journeys';
import type {HomepageJourneys} from '../../lib/cms/homepage-journeys';
import {EditorialHeadingEditor} from './editorial-heading-editor';
import {SectionButtonsEditor} from './section-buttons-editor';
import {RecordPicker} from './record-picker';
import type {ReferenceContext} from './record-picker';
export function HomepageJourneysFields({value,onChange,context}:{value:HomepageJourneys;onChange:(value:HomepageJourneys)=>void;context:ReferenceContext}){
 return <fieldset disabled={context.disabled}><legend>Curated private journeys</legend><label>Journey collection label<input maxLength={200} value={value.eyebrow} onChange={e=>onChange({...value,eyebrow:e.target.value})}/></label><EditorialHeadingEditor value={value.heading} onChange={heading=>onChange({...value,heading})}/><label>Journey collection introduction<textarea maxLength={2000} value={value.introduction} onChange={e=>onChange({...value,introduction:e.target.value})}/></label><SectionButtonsEditor min={1} max={1} value={[value.button]} onChange={buttons=>onChange({...value,button:buttons[0]})}/><label>Journey card action label<input maxLength={30} value={value.cardActionLabel} onChange={e=>onChange({...value,cardActionLabel:e.target.value})}/></label><RecordPicker type='journey' value={value.items.map(item=>({recordId:item.recordId}))} max={12} context={context} onChange={selected=>onChange({...value,items:retainJourneyKickers(value.items,selected)})}/>{value.items.map((item,index)=><label key={item.recordId}>Card {index+1} editorial label<input maxLength={200} value={item.kicker} onChange={e=>onChange({...value,items:value.items.map(entry=>entry.recordId===item.recordId?{...entry,kicker:e.target.value}:entry)})}/></label>)}<p>Journey titles, duration, region and hero images come from the selected journey records. Publishing the homepage requires available published journey revisions.</p></fieldset>;
}
