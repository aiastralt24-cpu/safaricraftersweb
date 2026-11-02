import {publicCmsConfig} from '../../../lib/cms/browser-config';
import {PasswordRecovery} from './password-recovery';
import '../workspace.css';
export const dynamic='force-dynamic';
export const metadata={title:'Recover CMS access',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function RecoveryPage(){return <PasswordRecovery config={publicCmsConfig(process.env.CMS_SUPABASE_URL,process.env.CMS_SUPABASE_ANON_KEY)}/>;}
