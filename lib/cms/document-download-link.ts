import {z} from 'zod';
const uuid=z.string().uuid();
/** A page section pins the reviewed revision. The download endpoint rejects a
 * replaced/unpublished version rather than silently serving a different PDF. */
export function documentDownloadHref(record:string,revision?:string){
 const id=uuid.parse(record);return `/documents/${id}${revision!==undefined?`?revision=${uuid.parse(revision)}`:''}`;
}
