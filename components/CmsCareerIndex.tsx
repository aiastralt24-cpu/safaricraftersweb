import {employmentLabels,careerWindowState,careerStateLabels} from '@/lib/cms/career-display';
import {readPublishedCareerList,publicCareerConfig} from '@/lib/cms/public-career-runtime';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export async function CmsCareerIndex(){
 const label='Careers',items=await readPublishedCareerList(publicCareerConfig());
 return <main className='container' style={{paddingBlock:'8rem 4rem'}}><h1 className='display'>{label}</h1>{items.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,20rem),1fr))',gap:'2rem',marginTop:'3rem'}}>{items.map(item=><article key={item.recordId}><a href={item.path}>{item.image&&<img src={publishedMediaUrl(item.image.assetId)} alt={item.image.decorative?'':item.image.alt} style={{width:'100%',aspectRatio:'4/3',objectFit:'cover'}}/>}<h2 className='h3'>{item.title}</h2></a><p>{employmentLabels[item.employment]}</p><p>{item.summary}</p><p>{careerStateLabels[careerWindowState(item,Date.now())]}</p></article>)}</div>:<p>No {label.toLowerCase()} have been published yet.</p>}</main>;
}
