'use client';
import {CountrySectionFields} from './country-section-fields';
import type {ImageEditorContext} from './section-image-editor';
import {kenyaSectionNames,type KenyaSectionKind} from '../../lib/cms/kenya-country-sections';
import {kenyaSectionBlank} from '../../lib/cms/kenya-section-drafts';
export function KenyaSectionFields({kind,value,onChange,context}:{kind:KenyaSectionKind;value:Record<string,any>;onChange:(value:Record<string,any>)=>void;context:ImageEditorContext}){
 return <CountrySectionFields name={kenyaSectionNames[kind]} defaults={kenyaSectionBlank(kind)} value={value} onChange={onChange} context={context} arrayLimits={{items:kind==='kenyaFacts'?6:kind==='kenyaFaq'?40:kind==='kenyaItineraries'||kind==='kenyaRelated'?12:20}} textLimits={{copy:kind==='kenyaPlaces'?10000:4000}} notice='Edit the saved draft here. Publication requires validation, approval and configured website delivery.'/>
}
