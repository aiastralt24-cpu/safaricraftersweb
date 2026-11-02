import {readFile,stat} from 'node:fs/promises';
import {extname} from 'node:path';
import {parseJourneyXlsx,parseJourneyDocx,FILE_LIMITS} from '../lib/cms/import-file.ts';
import {planJourneyImport} from '../lib/cms/import-contract.ts';

// Local verification only. No service credentials, content writes or publishing.
try {
  const path=process.argv[2];
  if(!path) throw new Error('Usage: npm run cms:import-check -- <file.xlsx|file.docx>');
  const extension=extname(path).toLowerCase();
  if(!['.xlsx','.docx'].includes(extension)) throw new Error('Use an .xlsx or .docx file.');
  if((await stat(path)).size>FILE_LIMITS.bytes) throw new Error('Upload a file no larger than 5 MB.');
  const bytes=await readFile(path);
  const parsed=await (extension==='.xlsx'?parseJourneyXlsx:parseJourneyDocx)(bytes);
  const plan=planJourneyImport(parsed.input);
  console.log(JSON.stringify({source:parsed.source,...plan},null,2));
  if(!plan.valid) process.exitCode=1;
} catch(error) {
  console.error(error instanceof Error?error.message:'Import check failed.');
  process.exitCode=1;
}
