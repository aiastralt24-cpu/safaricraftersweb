import {z} from 'zod';
/** Public callers select identities only; job text and acceptance time are server-owned. */
export const careerEnquirySelectionSchema=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)}).strict();
export type CareerEnquirySelection=z.infer<typeof careerEnquirySelectionSchema>;
