import {publicCmsConfig} from '../../../../lib/cms/browser-config';
import {SecurePreviewViewer} from '../../secure-preview-viewer';
import '../../workspace.css';
export const dynamic='force-dynamic';
export const metadata={title:'Private content preview',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function PreviewPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <SecurePreviewViewer id={id} config={publicCmsConfig(process.env.CMS_SUPABASE_URL,process.env.CMS_SUPABASE_ANON_KEY)}/>;}
