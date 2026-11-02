'use client';
import type {ImageFocalPoint} from '../../lib/cms/composition-media';
/** Fixed-layout crops retain their aspect ratio; only the subject position changes. */
export function ImageFocalPointEditor({label,desktop,mobile,onChange}:{label:string;desktop?:ImageFocalPoint;mobile?:ImageFocalPoint;onChange:(desktop:ImageFocalPoint|undefined,mobile:ImageFocalPoint|undefined)=>void}){
 const d=desktop??{x:50,y:50};
 const fields=(name:string,value:ImageFocalPoint,change:(next:ImageFocalPoint)=>void)=><fieldset><legend>{name}</legend>{(['x','y'] as const).map(axis=><label key={axis}>{axis==='x'?'Horizontal':'Vertical'} focal point: {value[axis]}%<input type='range' min={0} max={100} step={1} value={value[axis]} onChange={event=>change({...value,[axis]:Number(event.target.value)})}/></label>)}</fieldset>;
 return <fieldset><legend>{label} crop</legend>{fields('Desktop focal point',d,next=>onChange(next,mobile))}<label><input type='checkbox' checked={Boolean(mobile)} onChange={event=>onChange(desktop,event.target.checked?{...d}:undefined)}/>Use different focal point on mobile</label>{mobile&&fields('Mobile focal point',mobile,next=>onChange(desktop,next))}<p>The image keeps its layout shape. Adjust the focal point to keep the subject in view; mobile inherits desktop unless overridden.</p><button type='button' onClick={()=>onChange(undefined,undefined)}>Reset focal points</button></fieldset>;
}
