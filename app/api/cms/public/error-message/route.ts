import {readErrorMessage} from '@/lib/cms/error-settings';
export const dynamic='force-dynamic';
export async function GET(){
 return Response.json(await readErrorMessage('serverError')??null,{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
}
