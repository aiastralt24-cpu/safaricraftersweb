'use client';
import {CountrySectionFields} from './country-section-fields';
import type {ImageEditorContext} from './section-image-editor';
import {tanzaniaSectionNames,type TanzaniaSectionKind} from '../../lib/cms/tanzania-country-sections';
import {tanzaniaSectionBlank} from '../../lib/cms/tanzania-section-drafts';
export function TanzaniaSectionFields({kind,value,onChange,context}:{kind:TanzaniaSectionKind;value:Record<string,any>;onChange:(value:Record<string,any>)=>void;context:ImageEditorContext}){
 return <CountrySectionFields name={tanzaniaSectionNames[kind]} defaults={tanzaniaSectionBlank(kind)} value={value} onChange={onChange} context={context} arrayLimits={{items:kind==='tanzaniaFacts'?6:kind==='tanzaniaFaq'?40:kind==='tanzaniaItineraries'||kind==='tanzaniaRelated'?12:20}} textLimits={{copy:kind==='tanzaniaPlaces'?10000:4000}} notice='Preview includes saved and unsaved edits. Publication requires trusted validation, approval and configured Tanzania website delivery.'/>
}
