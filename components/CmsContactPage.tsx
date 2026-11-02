import type {PublishedContactPage} from '../lib/cms/contact-page';
import type {ContactFormBinding} from '../lib/cms/contact-form-resolution';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import {PublicEnquiryForm} from './PublicEnquiryForm';
import styles from '../app/contact/contact.module.css';
import './CmsContactPage.css';
/** Inputs must come from the structural projection and trusted form resolver. */
export function CmsContactPage({page,form}:{page:PublishedContactPage;form:ContactFormBinding}){
 if(form.recordId!==page.formId||form.locale!==page.locale)throw Error('Contact renderer form binding mismatch.');
 return <div className={`${styles.page} cms-contact-page`} data-page-revision={page.revisionId}><div className={styles.layout}>{page.sections.map(section=>{
 const H=section.controls.headingLevel,c=section.controls;
 const presentation=`cms-contact-section background-${c.background} spacing-${c.spacing} width-${c.width} align-${c.textAlign} media-${c.mediaAlign} mobile-${c.mobileOrder}`;
 if(section.kind==='contactIntro'){const intro=section.data;return <section key={section.id} id={section.controls.anchor} className={`${styles.intro} ${presentation} cms-contact-intro`} data-cms-motion={c.animation}><p className='eyebrow'>{intro.eyebrow}</p><H><CmsEditorialHeading value={intro.heading}/></H><p className={styles.lead}>{intro.lead}</p><p className={styles.scope}>{intro.scope}</p><figure className={`${styles.image}${intro.showImageOnMobile?' cms-contact-mobile-photo':''}`}><img src={publishedMediaUrl(intro.image.assetId)} alt={intro.image.decorative?'':intro.image.alt} style={{objectPosition:`${intro.focalPoint.x}% ${intro.focalPoint.y}%`}}/>{(intro.image.caption||intro.image.credit)&&<figcaption>{[intro.image.caption,intro.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure><div className={styles.direct}><span>{intro.direct.prompt}</span><a href={`mailto:${intro.direct.email}`}>{intro.direct.label}</a></div><p className={styles.corporate}>{intro.corporate.copy}<a href={intro.corporate.link.href}>{intro.corporate.link.label}</a></p></section>;}
 const enquiry=section.data,headingId=`contact-heading-${section.id}`;
 return <section key={section.id} id={section.controls.anchor} className={`${styles.panel} ${presentation} cms-contact-enquiry`} data-cms-motion={c.animation} aria-labelledby={headingId}><header><p className='eyebrow'>{enquiry.eyebrow}</p><H id={headingId}><CmsEditorialHeading value={enquiry.heading}/></H><p>{enquiry.copy}</p><span>{enquiry.requiredHint}</span></header><PublicEnquiryForm formId={form.recordId} expected={{revisionId:form.revisionId,locale:form.locale}}/><p className={styles.privacy}>{enquiry.privacy.copy}<a href={enquiry.privacy.link.href}>{enquiry.privacy.link.label}</a></p></section>;
 })}</div></div>;
}
