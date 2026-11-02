import {handleContactFormMigration} from '@/lib/cms/contact-form-migration-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleContactFormMigration(request);}
