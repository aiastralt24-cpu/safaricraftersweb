'use client';
import {eventOffsetChoices,joinEventInstant,splitEventInstant} from '../../lib/cms/event-time-input';
export function EventTimeInput({label,value,mode,onChange}:{label:string;value:string;mode:'timed'|'allDay';onChange:(value:string)=>void}){
 if(mode==='allDay')return <label>{label} date<input type='date' value={value} onChange={e=>onChange(e.target.value)}/></label>;
 const {local,offset}=splitEventInstant(value),choices=eventOffsetChoices.includes(offset)?eventOffsetChoices:[...eventOffsetChoices,offset];
 return <fieldset><legend>{label}</legend>
  <label>{label} date and time<input type='datetime-local' step='any' value={local} onChange={e=>onChange(joinEventInstant(e.target.value,offset))}/></label>
  <label>{label} UTC offset<select aria-label={`${label} UTC offset`} value={offset} disabled={!local} onChange={e=>onChange(joinEventInstant(local,e.target.value))}>{choices.map(v=><option key={v} value={v}>{v==='Z'?'UTC (Z)':`UTC ${v}`}</option>)}</select></label>
  <p>Choose the offset at the venue on this date. Start and end can use different offsets when daylight saving changes. Changing the offset keeps the entered wall time.</p>
  {value&&<p>Saved timestamp: <code>{value}</code></p>}
  <details><summary>{label} exact timestamp</summary><label>{label} ISO timestamp<input maxLength={40} value={value} onChange={e=>onChange(e.target.value)}/></label><p>Use this for imported timestamps or exact seconds. Invalid values remain visible and must be corrected before saving.</p></details>
 </fieldset>;
}
