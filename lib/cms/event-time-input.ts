/** Split without Date conversion: wall time and offset must survive unchanged. */
export function splitEventInstant(value:string){
 const match=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:\d{2})$/.exec(value);
 return match?{local:match[1],offset:match[2]}:{local:'',offset:'+00:00'};
}
export function joinEventInstant(local:string,offset:string){return local?`${local.length===16?local+':00':local}${offset}`:'';}
export const eventOffsetChoices=['Z',...Array.from({length:105},(_,i)=>{
 const minutes=(i-48)*15,absolute=Math.abs(minutes);
 return `${minutes<0?'-':'+'}${String(Math.floor(absolute/60)).padStart(2,'0')}:${String(absolute%60).padStart(2,'0')}`;
})];
