import {handleLocationSave} from '../../../../lib/cms/location-editor-api';
import {handleLocationLibrary} from '../../../../lib/cms/location-library-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleLocationSave(request);}
export async function GET(request:Request){return handleLocationLibrary(request);}
