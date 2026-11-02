import {readPublishedCertificationList,publicCertificationConfig} from '@/lib/cms/public-certification-runtime';
export function CertificationDirectory({items}:{items:Awaited<ReturnType<typeof readPublishedCertificationList>>}){
 return <main className='container' style={{paddingBlock:'8rem 4rem'}}><h1 className='display'>Certifications</h1>{items.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,20rem),1fr))',gap:'2rem',marginTop:'3rem'}}>{items.map(item=><article key={item.recordId}><a href={item.path}><h2 className='h3'>{item.title}</h2></a><p>{item.issuer}</p><p>{item.summary}</p></article>)}</div>:<p>No certifications have been published yet.</p>}</main>;
}
export async function CmsCertificationIndex(){return <CertificationDirectory items={await readPublishedCertificationList(publicCertificationConfig())}/>;}
