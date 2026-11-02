import {ReferencedFormPreview} from './referenced-form-preview';
import type {LoadFormPreview} from '../../lib/cms/form-preview-reference';
import type {ReactNode} from 'react';
import {contactContentSchema,type ContactSectionKind} from '../../lib/cms/contact-content';
import type {SectionImage} from '../../lib/cms/composition';
import {CmsEditorialHeading} from '../../components/CmsEditorialHeading';
export function ContactSectionPreview({kind,value,headingLevel,renderImage,loadRecord}:{kind:ContactSectionKind;value:unknown;headingLevel:'h1'|'h2'|'h3';loadRecord?:LoadFormPreview;renderImage:(image:SectionImage)=>ReactNode}){
 const H=headingLevel;
 if(kind==='contactIntro'){
  const d=contactContentSchema.shape.intro.parse(value);
  return <><p className='eyebrow'>{d.eyebrow}</p><H><CmsEditorialHeading value={d.heading}/></H><p>{d.lead}</p><p>{d.scope}</p><figure>{renderImage(d.image)}{(d.image.caption||d.image.credit)&&<figcaption>{[d.image.caption,d.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure><p>Photograph focal point: {d.focalPoint.x}% / {d.focalPoint.y}%. {d.showImageOnMobile?'Shown':'Hidden'} on the mobile website layout.</p><p>{d.direct.prompt}<br/><a href={`mailto:${d.direct.email}`}>{d.direct.label}</a></p><p>{d.corporate.copy}<a href={d.corporate.link.href}>{d.corporate.link.label}</a></p></>;
 }
 const d=contactContentSchema.shape.enquiry.parse(value);
 return <><p className='eyebrow'>{d.eyebrow}</p><H><CmsEditorialHeading value={d.heading}/></H><p>{d.copy}</p><p>{d.requiredHint}</p>{d.form?<ReferencedFormPreview key={d.form.recordId} id={d.form.recordId} load={loadRecord}/>:<p role='note'>Select an enquiry form to test its fields here. No visitor enquiry is submitted from this preview.</p>}<p>{d.privacy.copy}<a href={d.privacy.link.href}>{d.privacy.link.label}</a></p></>;
}
