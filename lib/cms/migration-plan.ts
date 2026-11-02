export type MigrationEntry={file:string;sha256:string};
const filename=/^(\d{3})-[a-z0-9-]+\.sql$/;
const hash=/^[a-f0-9]{64}$/;
/** Offline reconciliation only. An empty ledger is a declaration, not evidence of an empty database. */
export function planCmsMigrations(files:MigrationEntry[],ledger:unknown){
 const issues:string[]=[];
 const check=(entries:unknown,label:string):MigrationEntry[]=>{
  if(!Array.isArray(entries)){issues.push(`${label} must be an array.`);return [];}
  const names=new Set<string>(),numbers=new Set<number>();const valid:MigrationEntry[]=[];
  for(const item of entries){
   if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(k=>!['file','sha256'].includes(k))||typeof item.file!=='string'||!filename.test(item.file)||typeof item.sha256!=='string'||!hash.test(item.sha256)){issues.push(`${label} contains an invalid migration entry.`);continue;}
   const number=Number(item.file.slice(0,3));
   if(names.has(item.file)||numbers.has(number)){issues.push(`${label} contains duplicate migration ${item.file}.`);continue;}
   names.add(item.file);numbers.add(number);valid.push({file:item.file,sha256:item.sha256});
  }
  return valid.sort((a,b)=>a.file.localeCompare(b.file));
 };
 const source=check(files,'Source'),applied=check(ledger,'Ledger');
 if(!source.length)issues.push('No source migrations found.');
 source.forEach((entry,index)=>{if(Number(entry.file.slice(0,3))!==index+1)issues.push(`Source migration sequence is incomplete before ${entry.file}.`);});
 const known=new Map(source.map(entry=>[entry.file,entry.sha256]));
 for(const entry of applied){if(!known.has(entry.file))issues.push(`Applied migration is absent from source: ${entry.file}.`);else if(known.get(entry.file)!==entry.sha256)issues.push(`Applied migration hash differs: ${entry.file}.`);}
 const appliedNames=new Set(applied.map(entry=>entry.file));let gap=false;
 for(const entry of source){if(!appliedNames.has(entry.file))gap=true;else if(gap)issues.push(`Applied migration follows an unapplied predecessor: ${entry.file}.`);}
 return {valid:issues.length===0,issues,sourceCount:source.length,appliedCount:applied.length,pending:issues.length?[]:source.filter(entry=>!appliedNames.has(entry.file)),note:'Offline plan only. Verify the target identity, actual migration history, backup and provider compatibility before applying SQL. This command executes no migrations.'};
}
