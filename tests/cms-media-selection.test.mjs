import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaSelectionReason} from '../lib/cms/media-selection.ts';
const asset={id:'image',mime:'image/webp',title:'Image',alt:'',caption:'',inspectionStatus:'ready',rightsStatus:'approved',rightsExpiresAt:null,archivedAt:null};
test('selection requires inspection, approval and current rights',()=>{
 const now=Date.parse('2026-10-22T00:00:00Z');
 assert.equal(mediaSelectionReason(asset,now),null);
 for(const change of [{inspectionStatus:'quarantined'},{rightsStatus:'pending'},{rightsStatus:'revoked'},{archivedAt:'2026-10-21'},{rightsExpiresAt:'invalid'},{rightsExpiresAt:'2026-10-22T00:00:00Z'}])assert.equal(typeof mediaSelectionReason({...asset,...change},now),'string');
 assert.equal(mediaSelectionReason({...asset,rightsExpiresAt:'2026-10-23T00:00:00Z'},now),null);
});

test('video and unknown media types cannot be selected for image fields even with approved rights',()=>{
 for(const mime of ['video/mp4','image/png','text/html',undefined,''])assert.equal(mediaSelectionReason({...asset,mime}),'This field requires a processed image');
});
