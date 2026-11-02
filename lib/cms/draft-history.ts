/** In-memory JSON snapshots only: no persistence, network calls or publication. */
export type DraftHistory={past:string[];present:string;future:string[]};
const maxSteps=50,maxCharacters=4_000_000;
export function createDraftHistory(value:unknown):DraftHistory{
 return {past:[],present:JSON.stringify(value),future:[]};
}
function bounded(state:DraftHistory):DraftHistory{
 let total=[...state.past,state.present,...state.future].reduce((sum,item)=>sum+item.length,0);
 while(state.past.length+state.future.length>maxSteps||total>maxCharacters){
  // Drop the most distant entries first. Keep the current draft even if large.
  const removed=state.past.length?state.past.shift():state.future.pop();
  if(removed===undefined)break;
  total-=removed.length;
 }
 return state;
}
export function recordDraftChange(state:DraftHistory,value:unknown):DraftHistory{
 const present=JSON.stringify(value);
 if(present===state.present)return state;
 return bounded({past:[...state.past,state.present],present,future:[]});
}
export function moveDraftHistory(state:DraftHistory,direction:'undo'|'redo'):DraftHistory{
 if(direction==='undo'){
  if(!state.past.length)return state;
  return {past:state.past.slice(0,-1),present:state.past.at(-1)!,future:[state.present,...state.future]};
 }
 if(!state.future.length)return state;
 return {past:[...state.past,state.present],present:state.future[0],future:state.future.slice(1)};
}
