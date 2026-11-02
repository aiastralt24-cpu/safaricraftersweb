import {CmsKenyaMotion} from './CmsKenyaMotion';
import {CmsKenyaSection} from './CmsKenyaSection';
import {MediaGallery} from './MediaGallery';
import {JsonLd} from './JsonLd';
import {breadcrumbSchema,faqSchema} from '../lib/structured-data';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import type {projectKenyaPage} from '../lib/cms/kenya-page';
/** Render only the validated public projection. Media authorization remains server-side. */
export function CmsKenyaPage({page}:{page:ReturnType<typeof projectKenyaPage>}){
 const hero=page.sections.find(section=>section.kind==='kenyaHero');
 const faqs=page.sections.flatMap(section=>section.kind==='kenyaFaq'?section.data.items:[]);
 return <CmsKenyaMotion revisionKey={page.revisionId}>
  {hero&&<JsonLd data={breadcrumbSchema(hero.data.breadcrumbs.map(item=>({name:item.label,path:item.href??page.path})))}/>}
  {faqs.length>0&&<JsonLd data={faqSchema(faqs)}/>}
  {page.sections.map(section=><CmsKenyaSection key={section.id} section={section}
   renderImage={image=><img className='cms-kenya-public-image' src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading={section.kind==='kenyaHero'?'eager':'lazy'} fetchPriority={section.kind==='kenyaHero'?'high':undefined}/>}
   renderGallery={data=><MediaGallery label={data.accessibleLabel} maxImages={30} images={data.images.map(({image})=>({src:publishedMediaUrl(image.assetId),alt:image.decorative?'':image.alt,credit:image.credit??''}))}/>}/>) }
 </CmsKenyaMotion>;
}
