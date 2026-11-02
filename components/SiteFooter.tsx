import {Footer} from './Footer';
import {CmsFooter} from './CmsFooter';
import {readFooterSettings} from '../lib/cms/footer-settings';
export async function SiteFooter(){const settings=await readFooterSettings();return settings?<CmsFooter settings={settings} interfaceText={settings.interfaceText}/>:<Footer/>;}
