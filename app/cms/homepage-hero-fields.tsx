'use client';
import type {HomepageHero} from '../../lib/cms/homepage-hero';
import {EditorialHeadingEditor} from './editorial-heading-editor';
import {SectionImageEditor} from './section-image-editor';
import type {ImageEditorContext} from './section-image-editor';
import {VideoPicker} from './video-picker';
import {HeroFramingEditor} from './hero-framing-editor';
export function HomepageHeroFields({value,onChange,context}:{value:HomepageHero;onChange:(value:HomepageHero)=>void;context:ImageEditorContext}){
 function move(index:number,direction:number){const frames=[...value.frames];[frames[index],frames[index+direction]]=[frames[index+direction],frames[index]];onChange({...value,frames});}
 return <fieldset disabled={context.disabled}><legend>Homepage hero</legend><p>Choose inspected videos with approved usage rights for background playback. Homepage publication is still being completed.</p>
 <label>Section navigation label<input maxLength={200} value={value.navigationLabel} onChange={event=>onChange({...value,navigationLabel:event.target.value})}/></label>
 {value.frames.map((frame,index)=><fieldset key={frame.id}><legend>Headline frame {index+1}</legend><EditorialHeadingEditor value={frame.heading} onChange={heading=>onChange({...value,frames:value.frames.map(item=>item.id===frame.id?{...item,heading}:item)})}/><button type='button' disabled={index===0} onClick={()=>move(index,-1)}>Move frame up</button><button type='button' disabled={index===value.frames.length-1} onClick={()=>move(index,1)}>Move frame down</button><button type='button' disabled={value.frames.length===1} onClick={()=>onChange({...value,frames:value.frames.filter(item=>item.id!==frame.id)})}>Remove headline frame</button></fieldset>)}
 <button type='button' disabled={value.frames.length>=10} onClick={()=>onChange({...value,frames:[...value.frames,{id:crypto.randomUUID(),heading:{lines:[{runs:[{text:'New headline',emphasis:false}]}]}}]})}>Add headline frame</button>
 <label>Supporting copy<textarea maxLength={2000} value={value.copy} onChange={event=>onChange({...value,copy:event.target.value})}/></label>
 <SectionImageEditor value={value.poster} label='Desktop poster' context={context} onChange={poster=>onChange({...value,poster})}/>
 <label><input type='checkbox' checked={Boolean(value.mobilePoster)} onChange={event=>{const next={...value};if(event.target.checked)next.mobilePoster={...value.poster};else delete next.mobilePoster;onChange(next);}}/>Use a different mobile poster</label>
 {value.mobilePoster&&<SectionImageEditor value={value.mobilePoster} label='Mobile poster' context={context} onChange={mobilePoster=>onChange({...value,mobilePoster})}/>}
 <HeroFramingEditor desktop={value.framing} mobile={value.mobileFraming} onChange={(framing,mobileFraming)=>{const next={...value};if(framing)next.framing=framing;else delete next.framing;if(mobileFraming)next.mobileFraming=mobileFraming;else delete next.mobileFraming;onChange(next);}}/>
 <fieldset><legend>Background video</legend><p>Posters remain the fallback for reduced motion and unavailable video.</p><VideoPicker key={`desktop:${context.site}`} site={context.site} api={context.api} disabled={context.disabled} value={value.background.kind==='video'?value.background.desktopAssetId:''} onChange={desktopAssetId=>onChange({...value,background:value.background.kind==='video'?{...value.background,desktopAssetId}:{kind:'video',desktopAssetId}})}/>
 {value.background.kind==='video'&&<><button type='button' onClick={()=>onChange({...value,background:{kind:'image'}})}>Use posters only</button><fieldset><legend>Optional mobile background video</legend><p>Without a mobile override, the desktop video is used.</p><VideoPicker key={`mobile:${context.site}`} site={context.site} api={context.api} disabled={context.disabled} value={value.background.mobileAssetId??''} onChange={mobileAssetId=>{if(value.background.kind==='video')onChange({...value,background:{...value.background,mobileAssetId}});}}/>{value.background.mobileAssetId&&<button type='button' onClick={()=>{if(value.background.kind==='video'){const {mobileAssetId,...background}=value.background;onChange({...value,background});}}}>Use desktop video on mobile</button>}</fieldset><p role='status'>Video references are saved in the draft. Open the draft layout preview to review private video playback. Public video delivery is still being completed.</p></>}
 </fieldset>
 </fieldset>;
}
