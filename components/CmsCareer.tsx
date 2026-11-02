import {CmsCareerApplication} from './CmsCareerApplication';
import {employmentLabels,workModeLabels} from '@/lib/cms/career-display';
import {Breadcrumbs} from './Breadcrumbs';
import {CmsRichTextBlock} from './CmsRichTextBlock';
import type {PublishedCareer} from '@/lib/cms/published-career';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export function CmsCareer({profile}:{profile:PublishedCareer}){
 const d=profile.content,hero=d.image,root='/careers',label='Careers';
 return <article className='article cms-public-career'>
  <header className='container' style={{paddingTop:'8rem',paddingBottom:'2rem'}}>
   <Breadcrumbs items={[{label:'Home',href:'/'},{label,href:root},{label:d.seo.breadcrumbLabel||d.title}]}/>
   <p className='eyebrow'>{employmentLabels[d.employment]} · {workModeLabels[d.workMode]}</p><h1 className='display'>{d.title}</h1>
   {hero&&<img src={publishedMediaUrl(hero.assetId)} alt={hero.decorative?'':hero.alt} fetchPriority='high' style={{width:'100%',maxWidth:'48rem',height:'auto',marginTop:'2rem'}}/>}
  </header>
  <div className='article-body'>
   {hero&&(hero.caption||hero.credit)&&<p className='caption'>{[hero.caption,hero.credit].filter(Boolean).join(' · ')}</p>}
   <p className='intro'>{d.summary}</p><section aria-label='Job details'><h2 className='h2'>About the role</h2><p>{d.organization}{d.department&&` · ${d.department}`}</p>{d.referenceCode&&<p>Job reference: {d.referenceCode}</p>}<p>Posted: <time dateTime={d.postedOn}>{d.postedOn}</time></p>{d.remoteRegions.length>0&&<p>Eligible remote-work regions: {d.remoteRegions.join(', ')}</p>}{d.compensation&&<p>Compensation: {d.compensation.currency} {d.compensation.minimum}–{d.compensation.maximum} per {d.compensation.unit}</p>}</section>
   {d.body.map(block=><div key={block.id}>{block.kind==='heading'?(block.level==='h2'?<h2 className='h2'>{block.text}</h2>:<h3 className='h3'>{block.text}</h3>):block.kind==='image'?<figure><img src={publishedMediaUrl(block.image.assetId)} alt={block.image.decorative?'':block.image.alt} loading='lazy'/>{(block.image.caption||block.image.credit)&&<figcaption>{[block.image.caption,block.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>:<CmsRichTextBlock block={block}/>}</div>)}
   {profile.related.length>0&&<section aria-label='Related content'><h2 className='h2'>Related content</h2><ul>{profile.related.map(item=><li key={item.href}><a href={item.href}>{item.title}</a>{item.type==='document'&&' (PDF)'}</li>)}</ul></section>}
   <CmsCareerApplication key={profile.recordId+':'+profile.revisionId} career={profile.applicationForm?{recordId:profile.recordId,revisionId:profile.revisionId,slug:d.slug,formRevisionId:profile.applicationForm.revisionId}:undefined} content={{status:d.status,statusNote:d.statusNote,opensAt:d.opensAt,closesAt:d.closesAt,application:d.application}} now={Date.now()}/>
   <p><a href={root}>All {label.toLowerCase()}</a></p>
  </div>
 </article>;
}
