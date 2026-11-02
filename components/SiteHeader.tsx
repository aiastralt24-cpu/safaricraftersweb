import {Header} from './Header';
import {readHeaderNavigation} from '../lib/cms/header-navigation';
import {readPublishedHeader} from '../lib/cms/published-header';
export async function SiteHeader(){const settings=await readPublishedHeader();return settings?<Header cmsHeader={settings}/>:<Header cmsMenu={await readHeaderNavigation()}/>;}
