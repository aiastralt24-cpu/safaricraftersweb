import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readLeadCareerContext} from '../lib/cms/lead-career-context.ts';
const recordId=randomUUID(),revisionId=randomUUID(),formId=randomUUID(),formRevision=randomUUID();
const binding={formId,formRevision};
const fixture=()=>({sourcePath:'/careers/guide',careerSelection:{recordId,revisionId,slug:'guide'},career:{recordId,revisionId,path:'/careers/guide',title:'Original guide role',organization:'Original organization',referenceCode:'GUIDE-1',formId,formRevisionId:formRevision,acceptedAt:'2000-02-29T12:34:56.123456+00:00'}});
test('career applicant context preserves accepted historical evidence and binds the stored form revision',()=>{const input=fixture();assert.deepEqual(readLeadCareerContext(input,binding),{status:'ready',context:input.career});input.career.referenceCode='';assert.equal(readLeadCareerContext(input,binding).status,'ready');});
test('generic leads are never classified as applications by source path or shared form alone',()=>{for(const value of [null,[],{}, {sourcePath:'/careers/guide'},{expedition:{}}])assert.equal(readLeadCareerContext(value,binding).status,'none');});
test('incomplete, conflicting or tampered job evidence is flagged rather than displayed as verified',()=>{
 for(const mutate of [v=>{delete v.career;},v=>{delete v.careerSelection;},v=>{v.career.recordId=randomUUID();},v=>{v.career.revisionId=randomUUID();},v=>{v.career.path='/careers/another';},v=>{v.sourcePath='/contact';},v=>{v.career.formId=randomUUID();},v=>{v.career.formRevisionId=randomUUID();},v=>{v.career.acceptedAt='2001-02-29T12:00:00Z';},v=>{v.career.path='https://evil.test';},v=>{v.career.private='extra';},v=>{v.expeditionSelection={};},v=>{v.expedition={};}]){const value=fixture();mutate(value);assert.equal(readLeadCareerContext(value,binding).status,'invalid');}
 assert.equal(readLeadCareerContext(fixture(),{formId,formRevision:undefined}).status,'invalid');
});
