import type {PublishedLeadership} from '../lib/cms/published-leadership';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import './CmsLeadershipCards.css';
export function CmsReusableLeadership({title,profiles,headingLevel:Heading='h2'}:{title:string;profiles:PublishedLeadership[];headingLevel?:'h1'|'h2'|'h3'}){
 if(!profiles.length)return null;const Child=Heading==='h1'?'h2':Heading==='h2'?'h3':'h4';
 return <div className='cms-leadership'><Heading>{title}</Heading><div className='cms-leadership-profiles'>{profiles.map(({recordId,path,content:d})=><article key={recordId}>{d.image&&<figure className='cms-leadership-portrait portrait-tall'><div className='cms-leadership-image'><img src={publishedMediaUrl(d.image.assetId)} alt={d.image.decorative?'':d.image.alt} loading='lazy'/></div>{(d.image.caption||d.image.credit)&&<figcaption>{[d.image.caption,d.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>}<div><Child>{d.title}</Child><p>{d.role}{d.department&&` · ${d.department}`}{d.status==='former'&&' · Former leadership'}</p><p>{d.summary}</p><a className='brass-link' href={path}>View {d.title}’s profile</a></div></article>)}</div></div>;
}
