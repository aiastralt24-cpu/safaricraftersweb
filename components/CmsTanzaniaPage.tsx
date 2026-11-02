import {CmsTanzaniaMotion} from './CmsTanzaniaMotion';
import {CountryPlannerTrigger} from './CountryPlannerTrigger';
import './CmsTanzaniaPage.css';
import {CmsTanzaniaSection} from './CmsTanzaniaSection';
import {MediaGallery} from './MediaGallery';
import {JsonLd} from './JsonLd';
import {breadcrumbSchema,faqSchema} from '../lib/structured-data';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import type {projectTanzaniaPage} from '../lib/cms/tanzania-page';
/** Render only the validated public projection. Media authorization remains server-side. */
export function CmsTanzaniaPage({page}:{page:ReturnType<typeof projectTanzaniaPage>}){
 const hero=page.sections.find(section=>section.kind==='tanzaniaHero');
 const faqs=page.sections.flatMap(section=>section.kind==='tanzaniaFaq'?section.data.items:[]);
 return <CmsTanzaniaMotion revisionKey={page.revisionId}>
  {hero&&<JsonLd data={breadcrumbSchema(hero.data.breadcrumbs.map(item=>({name:item.label,path:item.href??page.path})))}/>}
  {faqs.length>0&&<JsonLd data={faqSchema(faqs)}/>}
  {page.sections.map(section=><CmsTanzaniaSection key={section.id} section={section}
   renderImage={image=><img className='cms-kenya-public-image' src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading={section.kind==='tanzaniaHero'?'eager':'lazy'} fetchPriority={section.kind==='tanzaniaHero'?'high':undefined}/>}
   renderPlanner={(planner,className)=><CountryPlannerTrigger {...planner} className={className}/>}
   renderGallery={data=><MediaGallery label={data.accessibleLabel} maxImages={30} images={data.images.map(({image})=>({src:publishedMediaUrl(image.assetId),alt:image.decorative?'':image.alt,credit:image.credit??''}))}/>}/>) }
 </CmsTanzaniaMotion>;
}
