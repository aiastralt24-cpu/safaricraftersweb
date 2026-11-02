import {createHash} from 'node:crypto';
import {planJourneyImport} from './import-contract.ts';
import type {ImportIssue} from './import-contract.ts';

export type ReviewRecord = {
  id:string; revision:string; slug:string; path:string; locale:string;
  title:string; payload:Record<string,unknown>;
};
export type ImportManifestItem = {
  sourceKey:string; operation:'create'|'update'; recordId?:string; expectedRevision?:string;
  path:string; locale:string; title:string; payload:Record<string,unknown>;
};
export type FieldDiff = {field:string; before:unknown; after:unknown};
export type ImportReview = {
  valid:boolean; issues:ImportIssue[];
  pages:{sourceKey:string; operation:'create'|'update'; unchanged:boolean; diffs:FieldDiff[]}[];
  manifest:ImportManifestItem[]; manifestSha256:string;
};
function canonical(value:unknown):string {
  if(Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if(value && typeof value==='object') return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,val])=>`${JSON.stringify(key)}:${canonical(val)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
const collectionKeys = {Itinerary:'itinerary',FAQs:'faqs',Media:'media'} as const;

/** Supply only records read through the editor's authorization context. Rebuild this
 * review on the server before applying; never trust a browser-provided manifest. */
export function reviewJourneyImport(input:unknown, existing:ReviewRecord[]=[]):ImportReview {
  const plan=planJourneyImport(input,existing);
  const issues=[...plan.issues];
  const manifest:ImportManifestItem[]=[];
  const pages:ImportReview['pages']=[];
  const error=(sheet:string,field:string,message:string)=>issues.push({sheet,row:0,field,severity:'error',code:'merge_conflict',message});
  for(const change of plan.changes) {
    const current=existing.find(record=>record.id===change.recordId);
    const before=current?.payload ?? {};
    const after:Record<string,unknown>={...structuredClone(before),...change.fields};
    for(const [sheet,key] of Object.entries(collectionKeys) as [keyof typeof collectionKeys,string][]) {
      const incoming=change.items[sheet]; if(!incoming) continue;
      const stored=before[key] ?? [];
      if(!Array.isArray(stored) || stored.some(item=>!item || typeof item!=='object' || typeof item.itemId!=='string')) {
        error(sheet,key,'Existing content needs stable item IDs before spreadsheet updates can be applied.'); continue;
      }
      const items=new Map<string,Record<string,unknown>>();
      for(const item of stored) {
        if(items.has(item.itemId)) error(sheet,key,'Existing content has duplicate item IDs. Repair it in the editor first.');
        items.set(item.itemId,structuredClone(item));
      }
      for(const row of incoming) {
        const {recordId: _recordId,...fields}=row;
        items.set(row.itemId,{...items.get(row.itemId),...fields});
      }
      const positions=new Set<number>(),roles=new Set<string>();
      for(const item of items.values()) {
        const position=Number(item.position);
        if(!Number.isSafeInteger(position) || position<1 || positions.has(position)) error(sheet,'position','The merged collection has missing or duplicate positions. Include reordered existing items in the import.');
        positions.add(position);
        if(sheet==='Media' && item.role!=='gallery') {
          if(roles.has(String(item.role))) error(sheet,'role','The merged media collection has more than one hero or mobile hero. Update the existing item ID.');
          roles.add(String(item.role));
        }
      }
      after[key]=[...items.values()].sort((a,b)=>Number(a.position)-Number(b.position));
    }
    const diffs:FieldDiff[]=[];
    for(const field of new Set([...Object.keys(before),...Object.keys(after)])) {
      if(canonical(before[field])!==canonical(after[field])) diffs.push({field,before:before[field]??null,after:after[field]??null});
    }
    const unchanged=Boolean(current)&&diffs.length===0;
    pages.push({sourceKey:change.recordId,operation:change.operation,unchanged,diffs});
    if(unchanged) continue;
    manifest.push({sourceKey:change.recordId,operation:change.operation,
      ...(current?{recordId:current.id,expectedRevision:current.revision}:{}),
      path:current?.path ?? `/journeys/${change.fields.slug}`,locale:current?.locale ?? 'en',
      title:String(after.title ?? current?.title ?? ''),payload:after});
  }
  const valid=!issues.some(issue=>issue.severity==='error');
  const accepted=valid?manifest:[];
  return {valid,issues,pages,manifest:accepted,manifestSha256:createHash('sha256').update(canonical(accepted)).digest('hex')};
}
