import {handleTestimonialMigration} from '@/lib/cms/testimonial-migration-api';
export const runtime='nodejs';
export async function POST(request:Request){return handleTestimonialMigration(request);}
