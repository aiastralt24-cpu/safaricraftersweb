import {z} from 'zod';
export const mfaPolicySchema=z.object({websiteId:z.string().uuid(),required:z.boolean(),version:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),verified:z.boolean(),canManage:z.boolean()}).strict();
export type MfaPolicy=z.infer<typeof mfaPolicySchema>;
export function parseMfaPolicy(value:unknown,site:string){const policy=mfaPolicySchema.parse(value);if(policy.websiteId!==site)throw Error('MFA policy belongs to another website.');return policy;}
