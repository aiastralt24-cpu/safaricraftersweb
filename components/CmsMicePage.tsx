import {CmsMiceSection} from './CmsMiceSection';
import './CmsMicePage.css';
import {PublicEnquiryForm} from './PublicEnquiryForm';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import type {projectMicePage} from '../lib/cms/mice-page';
import type {MiceFormBinding} from '../lib/cms/mice-form-resolution';
/** Only use the public projection and freshly resolved corporate form binding. */
export function CmsMicePage({page,form}:{page:ReturnType<typeof projectMicePage>;form:MiceFormBinding}){
 const enquiries=page.sections.filter(section=>section.kind==='miceEnquiry');
 if(enquiries.length!==1||enquiries[0].data.form?.recordId!==form.recordId||form.locale!==page.locale)throw Error('MICE renderer form binding mismatch.');
 return <div className='mice-page cms-mice-page' data-page-revision={page.revisionId}>{page.sections.map(section=><CmsMiceSection key={section.id} section={section}
  renderImage={(image,priority)=><img src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined}/>}
  renderForm={id=>{if(id!==form.recordId)throw Error('MICE renderer form binding mismatch.');return <PublicEnquiryForm formId={form.recordId} expected={{revisionId:form.revisionId,locale:form.locale}}/>;}}/>)}</div>;
}
