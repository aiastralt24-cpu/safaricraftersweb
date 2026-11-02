import Link from 'next/link';
import type {GlobalSettings} from '../lib/cms/global-settings';
export function MissingPage({message}:{message?:GlobalSettings['errors']['notFound']}){
 const content=message?.enabled?message:undefined;
 const button=content?content.button:{label:'Return Home',href:'/',newWindow:false};
 return <section className="section" style={{minHeight:'70vh',paddingTop:150,textAlign:'center',overflowWrap:'anywhere'}}>
  <div className="container"><p className="eyebrow">404</p>
   <h1 className="h1">{content?.title??'This track has gone quiet.'}</h1>
   <p className="intro" style={{whiteSpace:'pre-wrap'}}>{content?.body??'Return to the main trail and begin again.'}</p>
   {button&&<Link className="button button-solid" href={button.href} target={button.newWindow?'_blank':undefined} rel={button.newWindow?'noopener noreferrer':undefined}>{button.label}</Link>}
  </div>
 </section>;
}
