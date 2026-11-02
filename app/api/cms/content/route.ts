import {handleEditorCommand,handleEditorRead} from '../../../../lib/cms/editor-api.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleEditorRead(request);}
export async function POST(request:Request){return handleEditorCommand(request);}
