'use client';
const fields=[
 ['title','Directory heading',200],['introduction','Directory introduction',2000],
 ['emptyMessage','No matching expeditions message',2000],['noDeparturesMessage','No matching departures message',2000],
 ['viewLabel','View expedition button label',200],['durationLabel','Duration label',200],['priceLabel','Price label',200],
 ['previewLabel','Preview programme label',200],['confirmedLabel','Confirmed programme label',200],['calendarTitle','Calendar heading',200],
 ['geographyLabel','Region filter label',200],['allGeographiesLabel','All regions option',200],['indiaLabel','India option',200],['internationalLabel','International option',200],
 ['monthLabel','Month filter label',200],['allMonthsLabel','All months option',200],['clearFiltersLabel','Clear filters button label',200],
] as const;
export function ExpeditionDirectoryFields({data,onChange}:{data:Record<string,unknown>;onChange:(data:Record<string,unknown>)=>void}){
 return <div><label>Directory display<select aria-label='Directory display' value={String(data.display??'')} onChange={event=>onChange({...data,display:event.target.value})}><option value='cards'>Expedition cards</option><option value='calendar'>Departure calendar</option><option value='both'>Cards and departure calendar</option></select></label>{fields.map(([key,label,max])=>{const value=typeof data[key]==='string'?data[key] as string:'';return <label key={key}>{label}{max>200?<textarea maxLength={max} value={value} onChange={event=>onChange({...data,[key]:event.target.value})}/>:<input maxLength={max} value={value} onChange={event=>onChange({...data,[key]:event.target.value})}/>}<small>{value.length} / {max} characters</small></label>;})}<p>Expedition details come from eligible published records. Edit titles, dates, prices and images in Photography expeditions. Preview uses currently published records with your draft labels and selected preview date. Publishing validation and live rollout are still being completed.</p></div>;
}
