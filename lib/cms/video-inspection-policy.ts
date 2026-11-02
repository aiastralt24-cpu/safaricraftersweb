import {createHash} from 'node:crypto';
import {z} from 'zod';
/** Background-video policy only. Passing these checks is not decoded-media
 * inspection, transcoding, malware clearance, rights approval or publication. */
export const HERO_VIDEO_LIMITS={bytes:100_000_000,durationSeconds:180,dimension:4096,pixels:8_847_360,framesPerSecond:60} as const;
export class VideoPolicyError extends Error{
 code:string;
 constructor(code:string,message:string){super(message);this.name='VideoPolicyError';this.code=code;}
}
const fail=(code:string,message:string):never=>{throw new VideoPolicyError(code,message);};
const mp4Brands=new Set(['isom','iso2','iso3','iso4','iso5','iso6','mp41','mp42','avc1','M4V ']);
/** Own a bounded copy before asynchronous scanner/decoder work. Container header
 * recognition deliberately returns no ready/verified/inspection-version flag. */
export function preflightHeroVideo(upload:{bytes:Uint8Array;filename:string;mime:string}){
 if(!upload.bytes.byteLength||upload.bytes.byteLength>HERO_VIDEO_LIMITS.bytes)fail('file_size','Use an MP4 video between 1 byte and 100 MB.');
 if(!upload.filename||upload.filename.length>255||/[\x00-\x1f\x7f/\\]/.test(upload.filename))fail('filename','Use a plain filename without directory paths.');
 if(!/\.mp4$/i.test(upload.filename))fail('extension','Background videos must use the .mp4 extension.');
 if(upload.mime.toLowerCase()!=='video/mp4')fail('mime','Declare the MP4 video media type.');
 const bytes=Buffer.from(upload.bytes);
 if(bytes.length<24||bytes.toString('ascii',4,8)!=='ftyp')fail('signature','The file does not begin with an MP4 file-type box.');
 const size=bytes.readUInt32BE(0);
 if(size<24||size>4096||size>bytes.length||(size-16)%4!==0)fail('signature','The MP4 file-type box is malformed or unsupported.');
 const brands=[bytes.toString('ascii',8,12)];for(let offset=16;offset<size;offset+=4)brands.push(bytes.toString('ascii',offset,offset+4));
 if(!brands.some(brand=>mp4Brands.has(brand))||brands.includes('qt  '))fail('signature','The file is not a supported MP4 container.');
 return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),mime:'video/mp4' as const,byteSize:bytes.length};
}
const numberText=z.string().regex(/^\d+(?:\.\d+)?$/).transform(Number).refine(Number.isFinite);
const rational=z.string().regex(/^\d+\/[1-9]\d*$/).transform(value=>{const [n,d]=value.split('/').map(Number);return n/d;}).refine(value=>Number.isFinite(value)&&value>0);
const stream=z.object({index:z.number().int().min(0),codec_type:z.string(),codec_name:z.string().optional(),width:z.number().int().optional(),height:z.number().int().optional(),avg_frame_rate:z.string().optional(),duration:z.string().optional(),pix_fmt:z.string().optional(),disposition:z.object({attached_pic:z.number().int().optional()}).passthrough().optional()}).passthrough();
const probe=z.object({streams:z.array(stream).min(1).max(2),format:z.object({format_name:z.string(),duration:numberText,size:numberText}).passthrough()}).passthrough();
/** Validate FFprobe-style metadata after private bounded probing. A real worker
 * must still decode all frames and inspect its re-encoded delivery derivative. */
export function reviewHeroVideoMetadata(input:unknown,expectedBytes:number){
 const parsed=probe.safeParse(input);if(!parsed.success)fail('metadata','Video metadata is missing or malformed.');
 const value=parsed.data!;
 if(!Number.isSafeInteger(expectedBytes)||expectedBytes<1||expectedBytes>HERO_VIDEO_LIMITS.bytes||value.format.size!==expectedBytes)fail('bytes_mismatch','The probed file does not match the uploaded byte count.');
 if(!value.format.format_name.split(',').includes('mp4'))fail('container','The decoder did not recognize an MP4 container.');
 const videos=value.streams.filter(item=>item.codec_type==='video'),audio=value.streams.filter(item=>item.codec_type==='audio');
 if(videos.length!==1||audio.length>1||videos.length+audio.length!==value.streams.length||new Set(value.streams.map(item=>item.index)).size!==value.streams.length)fail('streams','Use one video track and at most one audio track; additional tracks need a separate workflow.');
 const video=videos[0];
 if(video.disposition?.attached_pic)fail('attached_picture','A cover image is not a background video.');
 if(!['h264','hevc'].includes(video.codec_name??''))fail('codec','Use H.264 or HEVC video for background processing.');
 if(!video.width||!video.height||video.width<2||video.height<2||video.width>HERO_VIDEO_LIMITS.dimension||video.height>HERO_VIDEO_LIMITS.dimension||video.width*video.height>HERO_VIDEO_LIMITS.pixels)fail('dimensions','The background video exceeds the supported dimensions.');
 const fps=rational.safeParse(video.avg_frame_rate);if(!fps.success||fps.data>HERO_VIDEO_LIMITS.framesPerSecond)fail('frame_rate','Use a known frame rate of at most 60 frames per second.');
 const duration=value.format.duration,streamDuration=video.duration===undefined?duration:numberText.safeParse(video.duration);
 const videoDuration=typeof streamDuration==='number'?streamDuration:streamDuration.success?streamDuration.data:NaN;
 if(duration<=0||duration>HERO_VIDEO_LIMITS.durationSeconds||!Number.isFinite(videoDuration)||videoDuration<=0||videoDuration>HERO_VIDEO_LIMITS.durationSeconds||Math.abs(videoDuration-duration)>1)fail('duration','Use a background video no longer than three minutes with consistent timing.');
 return {width:video.width!,height:video.height!,durationSeconds:duration,framesPerSecond:fps.data,codec:video.codec_name!,hasAudio:audio.length===1,requiresSilentDerivative:true as const};
}
