import type {z} from 'zod';
import type {sectionDataSchemas} from '../lib/cms/composition';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsHomepageConcierge.css';
export type HomepageConcierge=z.infer<typeof sectionDataSchemas.homepageConcierge>;
export function CmsHomepageConcierge({value,headingLevel:H='h2'}:{value:HomepageConcierge;headingLevel?:'h1'|'h2'|'h3'}){
 const Prompt=H==='h1'?'h2':H==='h2'?'h3':'h4';
 const anchor=(link:HomepageConcierge['contact'],className?:string)=><a className={className} href={link.href} target={link.newWindow?'_blank':undefined} rel={link.newWindow?'noopener noreferrer':undefined}>{link.label}</a>;
 return <div className='cms-home-concierge'><H><CmsEditorialHeading value={value.heading}/></H><div className='cms-home-concierge-card'><Prompt><CmsEditorialHeading value={value.prompt}/></Prompt><ul>{value.choices.map(choice=><li key={choice.id}>{anchor(choice.link)}</li>)}</ul>{anchor(value.contact,'cms-home-concierge-contact')}</div></div>;
}
