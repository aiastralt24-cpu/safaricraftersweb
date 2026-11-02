export type JourneyConflictRecord={id:string;type:string;path:string;locale:string;currentRevision:string;title:string;payload:Record<string,unknown>;permissions:Record<string,boolean>};
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
/** Compare all payload keys, including newly introduced or removed fields. */
export function prepareJourneyConflict(base:JourneyConflictRecord,mine:Record<string,unknown>,latest:JourneyConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='journey'||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision||!object(base.payload)||!object(latest.payload)||!object(mine))throw Error('The latest journey cannot be reconciled with your access, revision or route. Your unsaved changes remain open.');
 const slug=base.path.split('/').pop();
 if(!base.path.startsWith('/journeys/')||[base.payload,mine,latest.payload].some(payload=>payload.slug!==undefined&&payload.slug!==slug))throw Error('The journey URL is inconsistent. Your unsaved changes remain open.');
 const original={...base.payload,title:base.title},remote={...latest.payload,title:latest.title};
 const keys=[...new Set([...Object.keys(original),...Object.keys(mine),...Object.keys(remote)])];
 const snapshot=(payload:Record<string,unknown>)=>Object.fromEntries(keys.map(key=>[key,structuredClone(payload[key])]));
 return {base:snapshot(original),mine:snapshot(mine),remote:snapshot(remote)};
}
