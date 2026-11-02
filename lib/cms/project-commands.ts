import {z} from 'zod';
import {projectSchema} from './projects.ts';
const uuid=z.string().uuid();
export const projectSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:projectSchema}).strict().refine(v=>v.record===null?v.expectedRevision===null&&Boolean(v.requestKey):v.expectedRevision!==null&&v.requestKey===undefined,'New projects need a recovery identity; existing projects need their current revision.');
export type ProjectSaveCommand=z.infer<typeof projectSaveCommand>;
