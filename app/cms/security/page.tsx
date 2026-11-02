import {publicCmsConfig} from '../../../lib/cms/browser-config';
import {AccountSecurity} from './account-security';
import '../workspace.css';
export const dynamic='force-dynamic';
export const metadata={title:'CMS account security',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function SecurityPage(){return <AccountSecurity config={publicCmsConfig(process.env.CMS_SUPABASE_URL,process.env.CMS_SUPABASE_ANON_KEY)}/>;}
