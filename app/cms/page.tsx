import {publicCmsConfig} from '../../lib/cms/browser-config.ts';
import {CmsWorkspace} from './workspace';
import './workspace.css';
export const dynamic='force-dynamic';
export const metadata={title:'Content workspace',robots:{index:false,follow:false},alternates:{canonical:'/cms'}};
export default function CmsPage(){return <CmsWorkspace config={publicCmsConfig(process.env.CMS_SUPABASE_URL,process.env.CMS_SUPABASE_ANON_KEY)}/>;}
