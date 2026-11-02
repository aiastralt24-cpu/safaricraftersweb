import test from 'node:test';import assert from 'node:assert/strict';import {videoSelectionReason} from '../lib/cms/video-selection.ts';
const asset={id:'video',mime:'video/mp4',title:'Hero',alt:'',caption:'',archivedAt:null,inspectionStatus:'ready',rightsStatus:'approved',rightsExpiresAt:null,videoVerified:true,durationSeconds:15,framesPerSecond:30,hasAudio:false,videoCodec:'h264',videoPixelFormat:'yuv420p'};
test('video selection requires verified silent processing and current approved rights',()=>{
 const now=Date.parse('2026-10-23T00:00:00Z');assert.equal(videoSelectionReason(asset,now),null);
 for(const change of [{mime:'image/webp'},{videoVerified:false},{videoVerified:undefined},{hasAudio:true},{hasAudio:null},{durationSeconds:181},{durationSeconds:NaN},{durationSeconds:0},{framesPerSecond:60},{videoCodec:'hevc'},{videoPixelFormat:'yuv444p'},{inspectionStatus:'pending'},{rightsStatus:'pending'},{archivedAt:'2026-01-01'},{rightsExpiresAt:'bad'},{rightsExpiresAt:'2026-10-23T00:00:00Z'}])assert.equal(typeof videoSelectionReason({...asset,...change},now),'string');
 assert.equal(videoSelectionReason({...asset,rightsExpiresAt:'2027-01-01T00:00:00Z'},now),null);
});
