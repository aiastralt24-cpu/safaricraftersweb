import {z} from 'zod';
const label=z.string().trim().min(1).max(200);
export const expeditionDirectorySectionSchema=z.object({
 title:label,introduction:z.string().max(2000),display:z.enum(['cards','calendar','both']),
 emptyMessage:z.string().trim().min(1).max(2000),noDeparturesMessage:z.string().trim().min(1).max(2000),
 viewLabel:label,durationLabel:label,priceLabel:label,previewLabel:label,confirmedLabel:label,
 calendarTitle:label,geographyLabel:label,allGeographiesLabel:label,indiaLabel:label,internationalLabel:label,
 monthLabel:label,allMonthsLabel:label,clearFiltersLabel:label,
}).strict();
export function newExpeditionDirectoryData():z.infer<typeof expeditionDirectorySectionSchema>{return {title:'Photography expeditions',introduction:'',display:'both',emptyMessage:'No expeditions match these filters.',noDeparturesMessage:'No scheduled departures match these filters. Enquire about future dates.',viewLabel:'View expedition',durationLabel:'Duration',priceLabel:'Page price',previewLabel:'Programme preview',confirmedLabel:'Confirmed programme',calendarTitle:'Upcoming departures',geographyLabel:'Region',allGeographiesLabel:'All regions',indiaLabel:'India',internationalLabel:'International',monthLabel:'Departure month',allMonthsLabel:'All months',clearFiltersLabel:'Clear filters'};}
