import type {ReactNode} from 'react';
import {readMessageSettings} from '../lib/cms/message-settings';
import {CmsMessages} from './CmsMessages';
export async function SiteMessages({children}:{children:ReactNode}){
 const settings=await readMessageSettings();
 return settings?<CmsMessages settings={settings}>{children}</CmsMessages>:<>{children}</>;
}
