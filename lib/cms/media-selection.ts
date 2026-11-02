export type SelectableMedia={id:string;mime:string;title:string;alt:string;caption:string;inspectionStatus:string;rightsStatus:string;rightsExpiresAt:string|null;archivedAt:string|null};
/** UI guidance only. Publication independently verifies current catalog evidence. */
export function mediaSelectionReason(asset:SelectableMedia,now=Date.now()):string|null{
 if(asset.mime!=='image/webp')return 'This field requires a processed image';
 if(asset.archivedAt)return 'Archived';
 if(asset.inspectionStatus!=='ready')return 'Image inspection is incomplete';
 if(asset.rightsStatus!=='approved')return 'Usage rights are not approved';
 if(asset.rightsExpiresAt&&(!Number.isFinite(Date.parse(asset.rightsExpiresAt))||Date.parse(asset.rightsExpiresAt)<=now))return 'Usage rights have expired';
 return null;
}
