import type {PublishedJourneySummary} from './published-journey-list.ts';
export function publishedJourneySearchItems(journeys:PublishedJourneySummary[]){
 return journeys.map(item=>({title:item.title,href:item.path,type:'Journey' as const,detail:item.region,searchText:[item.description,item.duration,item.bestMonths].join(' ')}));
}
