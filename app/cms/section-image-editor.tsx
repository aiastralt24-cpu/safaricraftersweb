'use client';
import type {SectionImage} from '../../lib/cms/composition';
import {MediaPicker} from './media-picker';
import type {LoadMediaPreview} from './media-image';
export type ImageEditorContext={site:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;disabled:boolean};
export function SectionImageEditor({value,onChange,label,context}:{value:SectionImage;onChange:(value:SectionImage)=>void;label:string;context:ImageEditorContext}){
 return <fieldset disabled={context.disabled}><legend>{label}</legend><MediaPicker {...context} value={value.assetId} onChange={assetId=>onChange({...value,assetId})}/><label>Image purpose<select value={value.decorative?'decorative':'meaningful'} onChange={e=>onChange({...value,decorative:e.target.value==='decorative'})}><option value='meaningful'>Conveys information</option><option value='decorative'>Decorative only</option></select></label><label>Alternative text<textarea maxLength={500} value={value.alt} onChange={e=>onChange({...value,alt:e.target.value})}/><small>{value.decorative?'Decorative images render with empty alt text. Your description is retained if you change the purpose.':'Describe what matters in this image for someone who cannot see it.'}</small></label><label>Image caption<textarea maxLength={50000} value={value.caption??''} onChange={e=>onChange({...value,caption:e.target.value})}/></label><label>Image credit<input maxLength={50000} value={value.credit??''} onChange={e=>onChange({...value,credit:e.target.value})}/></label></fieldset>;
}
