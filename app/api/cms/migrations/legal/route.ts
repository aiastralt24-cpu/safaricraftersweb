import {handleLegalMigration} from '../../../../../lib/cms/legal-migration-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleLegalMigration(request);}
