import {z} from 'zod';
/** Mail links intentionally exclude query parameters, multiple recipients and headers. */
export const emailHref=z.string().max(327).refine(value=>value.startsWith('mailto:')&&z.string().email().safeParse(value.slice(7)).success&&!/[?%,\s\\\x00-\x1f]/.test(value),'Use mailto: followed by one email address, without headers.');
