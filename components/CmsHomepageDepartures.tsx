import type {HomepageDepartures} from '../lib/cms/homepage-departures';
import {projectHomepageDepartures} from '../lib/cms/homepage-departures';
import type {PublishedExpeditionCard} from '../lib/cms/public-expedition-directory';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import {departureLabel} from '../lib/departures';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsHomepageDepartures.css';
export function CmsHomepageDepartures({value,cards,today,headingLevel:H='h2'}:{value:HomepageDepartures;cards:PublishedExpeditionCard[];today:string;headingLevel?:'h1'|'h2'|'h3'}){
 return <CmsHomepageDepartureRows value={value} rows={projectHomepageDepartures(value,cards,today)} headingLevel={H}/>;
}
export function CmsHomepageDepartureRows({value,rows,headingLevel:H='h2'}:{value:HomepageDepartures;rows:ReturnType<typeof projectHomepageDepartures>;headingLevel?:'h1'|'h2'|'h3'}){
 const CardHeading=H==='h1'?'h2':H==='h2'?'h3':'h4';
 return <div className='cms-home-departures'><header><div>{value.eyebrow&&<p className='eyebrow'>{value.eyebrow}</p>}<H><CmsEditorialHeading value={value.heading}/></H></div><a href={value.button.href} target={value.button.newWindow?'_blank':undefined} rel={value.button.newWindow?'noopener noreferrer':undefined}>{value.button.label}</a></header>{rows.length?<div className='cms-home-departure-board' role='region' aria-label={value.boardLabel} tabIndex={0}>{rows.map(({card,departure,title,location})=><a key={card.recordId} href={card.path}><figure><img src={publishedMediaUrl(card.content.image!.assetId)} alt={card.content.image!.decorative?'':card.content.image!.alt} loading='lazy'/>{(card.content.image!.caption||card.content.image!.credit)&&<figcaption>{card.content.image!.caption}{card.content.image!.credit&&<small>{card.content.image!.credit}</small>}</figcaption>}</figure><CardHeading>{title}</CardHeading><time dateTime={departure.date}>{departureLabel(departure)}</time>{departure.homepageNote?.trim()&&<p className='cms-home-departure-availability'>{departure.homepageNote}</p>}<p>{card.content.duration} · {location}</p><strong>{value.cardActionLabel} <span aria-hidden='true'>↗</span></strong></a>)}</div>:<p role='status'>{value.emptyMessage}</p>}</div>;
}
