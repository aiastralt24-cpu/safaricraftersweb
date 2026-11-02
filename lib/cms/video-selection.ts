import type {SelectableMedia} from './media-selection.ts';
export type SelectableVideo=SelectableMedia & {videoVerified?:boolean;durationSeconds?:number|null;framesPerSecond?:number|null;hasAudio?:boolean|null;videoCodec?:string|null;videoPixelFormat?:string|null};
/** Selection guidance only. Publication must recheck current database evidence. */
export function videoSelectionReason(asset:SelectableVideo,now=Date.now()):string|null{
 if(asset.mime!=='video/mp4')return 'This field requires a processed MP4 video';
 if(asset.archivedAt)return 'Archived';
 if(asset.inspectionStatus!=='ready'||asset.videoVerified!==true||asset.hasAudio!==false||asset.videoCodec!=='h264'||asset.videoPixelFormat!=='yuv420p'||asset.framesPerSecond!==30||typeof asset.durationSeconds!=='number'||!Number.isFinite(asset.durationSeconds)||asset.durationSeconds<=0||asset.durationSeconds>180)return 'Silent background-video processing is incomplete';
 if(asset.rightsStatus!=='approved')return 'Usage rights are not approved';
 if(asset.rightsExpiresAt&&(!Number.isFinite(Date.parse(asset.rightsExpiresAt))||Date.parse(asset.rightsExpiresAt)<=now))return 'Usage rights have expired';
 return null;
}
