import {handlePublicSpecialistDirectory,publicSpecialistDirectoryConfig} from '../../../../../lib/cms/specialist-directory-runtime';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handlePublicSpecialistDirectory(request,publicSpecialistDirectoryConfig());}
