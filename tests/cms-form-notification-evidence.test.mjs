import test from 'node:test';import assert from 'node:assert/strict';
import {formNotificationFindings} from '../lib/cms/form-notification-evidence.ts';
import {evaluateValidationInput} from '../lib/cms/validation-worker.ts';
import {newForm} from '../lib/cms/form-drafts.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const input={site:id(1),record:id(2),revision:id(3),type:'form',path:null,locale:'en',payload:{...newForm('name'),notificationRouteIds:[id(4)]}};
const evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),routes:[{routeId:id(4),revisionId:id(5),approved:true,acceptedAt:null}]};
test('recipient diagnostics require exact saved revision and selected route identities',()=>{
 for(const raw of [null,{...evidence,websiteId:id(9)},{...evidence,recordId:id(9)},{...evidence,revisionId:id(9)},{...evidence,routes:[]},{...evidence,routes:[{...evidence.routes[0],routeId:id(9)}]}])assert.equal(formNotificationFindings(input,raw)[0].code,'notification_evidence_unavailable');
 assert.equal(formNotificationFindings(input,evidence)[0].code,'notification_route_unproven');
 assert.equal(formNotificationFindings(input,{...evidence,routes:[{...evidence.routes[0],approved:false}]})[0].code,'notification_route_unapproved');
 assert.equal(formNotificationFindings(input,{...evidence,routes:[{...evidence.routes[0],revisionId:null,approved:false}]})[0].code,'notification_route_missing');
});
test('historical provider acceptance cannot bypass the activation gate',()=>{
 const result=evaluateValidationInput({...input,formNotificationEvidence:{...evidence,routes:[{...evidence.routes[0],acceptedAt:'2026-10-30T00:00:00Z'}]}});assert.equal(result.contentChecksPass,false);assert.ok(result.findings.some(v=>v.code==='notification_routes_unverified'));assert.ok(result.findings.some(v=>v.code==='notification_historical_acceptance'&&v.severity==='warning'));
 const inbox=evaluateValidationInput({...input,payload:newForm('name'),formNotificationEvidence:null});assert.equal(inbox.contentChecksPass,true);
});
test('deployment diagnostics reject missing binding, unhealthy workers and unrelated route receipts',()=>{
 const delivery={bindingRevision:id(6),deploymentId:id(7),cmsOrigin:'https://cms.example.test',workerHealthy:true,routes:[{routeId:id(4),routeRevision:id(5),providerAcceptance:true}]};
 const raw={...evidence,routes:[{...evidence.routes[0],acceptedAt:'2026-10-30T00:00:00Z'}],delivery};
 const codes=value=>formNotificationFindings(input,value).map(v=>v.code);
 assert.ok(codes(evidence).includes('notification_deployment_unbound'));
 assert.ok(!codes(raw).some(v=>v.startsWith('notification_deployment_')));
 assert.ok(codes({...raw,delivery:{...delivery,workerHealthy:false}}).includes('notification_worker_unhealthy'));
 assert.ok(codes({...raw,delivery:{...delivery,routes:[{...delivery.routes[0],providerAcceptance:false}]}}).includes('notification_deployment_unproven'));
 for(const routes of [[],[{...delivery.routes[0],routeId:id(99)}],[{...delivery.routes[0],routeRevision:id(99)}]])assert.ok(codes({...raw,delivery:{...delivery,routes}}).includes('notification_delivery_evidence_mismatch'));
 const trusted=evaluateValidationInput({...input,formNotificationEvidence:raw});assert.equal(trusted.contentChecksPass,true);assert.equal(trusted.validatorVersion,'form-2');
 for(const patch of [{workerHealthy:false},{deploymentId:null},{routes:[{...delivery.routes[0],providerAcceptance:false}]}])assert.equal(evaluateValidationInput({...input,formNotificationEvidence:{...raw,delivery:{...delivery,...patch}}}).contentChecksPass,false);
 const withFile={...input,payload:{...input.payload,fields:[{id:'cv',type:'file',label:'CV',help:'',required:true,validationMessage:'',maxBytes:1000,mimeTypes:['application/pdf']}]}};assert.equal(evaluateValidationInput({...withFile,formNotificationEvidence:raw}).contentChecksPass,false);
});
