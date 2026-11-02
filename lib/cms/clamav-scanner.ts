import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import type {MalwareScanner} from './image-inspection.ts';
export type ClamAvConfig={executable:string;databaseDirectory:string;temporaryRoot?:string;timeoutMs?:number};
/** Local worker process only. Options follow the official clamscan manual.
 * No shell, user filename, external upload or inherited application secrets. */
export function createClamAvScanner(config:ClamAvConfig):MalwareScanner{
 const timeout=config.timeoutMs??25000;
 if(!path.isAbsolute(config.executable)||!path.isAbsolute(config.databaseDirectory)||config.temporaryRoot&&!path.isAbsolute(config.temporaryRoot)||!Number.isInteger(timeout)||timeout<1||timeout>25000)throw Error('Invalid malware scanner configuration.');
 return async(input,signal)=>{
  if(signal.aborted||input.length<1||input.length>25000000)return 'unavailable';
  const bytes=Buffer.from(input);let directory:string|undefined;
  try{
   directory=await mkdtemp(path.join(config.temporaryRoot??tmpdir(),'cms-scan-'));
   if(signal.aborted)return 'unavailable';
   return await new Promise<'clean'|'infected'|'unavailable'>(resolve=>{
    const child=spawn(config.executable,['--no-summary','--stdout',`--database=${config.databaseDirectory}`,`--tempdir=${directory}`,'--fail-if-cvd-older-than=1','--alert-exceeds-max=yes','--alert-encrypted=yes','--max-filesize=25000000','--max-scansize=100000000','--max-files=1000','--max-recursion=16','--max-scantime=25000','-'],{shell:false,cwd:directory,stdio:['pipe','pipe','pipe'],env:{NODE_ENV:'production',PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C'}});
    let failed=false,total=0;
    const stop=()=>{failed=true;child.kill('SIGKILL');};
    const timer=setTimeout(stop,timeout);signal.addEventListener('abort',stop,{once:true});
    const output=(chunk:Buffer)=>{total+=chunk.length;if(total>65536)stop();};child.stdout.on('data',output);child.stderr.on('data',output);
    child.on('error',()=>{failed=true;});child.stdin.on('error',stop);
    child.on('close',(code,terminated)=>{clearTimeout(timer);signal.removeEventListener('abort',stop);resolve(failed||signal.aborted||terminated?'unavailable':code===0?'clean':code===1?'infected':'unavailable');});
    if(signal.aborted)stop();else child.stdin.end(bytes);
   });
  }catch{return 'unavailable';}finally{if(directory)await rm(directory,{recursive:true,force:true}).catch(()=>{});}
 };
}
