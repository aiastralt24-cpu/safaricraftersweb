import type {ReactNode} from 'react';
import type {HomepageJourneyCard,HomepageJourneys} from '../lib/cms/homepage-journeys';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsHomepageJourneys.css';
export function CmsHomepageJourneys({value,cards,headingLevel:H='h2',renderImage}:{value:HomepageJourneys;cards:HomepageJourneyCard[];headingLevel?:'h1'|'h2'|'h3';renderImage:(image:HomepageJourneyCard['image'])=>ReactNode}){
 const ItemHeading=H==='h1'?'h2':H==='h2'?'h3':'h4';
 return <div className='cms-home-journeys'><header><div>{value.eyebrow&&<p className='eyebrow'>{value.eyebrow}</p>}<H><CmsEditorialHeading value={value.heading}/></H></div><div><p>{value.introduction}</p><a href={value.button.href} target={value.button.newWindow?'_blank':undefined} rel={value.button.newWindow?'noopener noreferrer':undefined}>{value.button.label}</a></div></header><div className='cms-home-journeys-grid'>{cards.map((card,index)=><a href={card.path} key={card.recordId} className={index===0?'featured':undefined}><figure>{renderImage(card.image)}</figure><p className='eyebrow'>{card.kicker}</p><div><p>{card.duration}</p><ItemHeading>{card.title}</ItemHeading><p>{card.region}</p><span>{value.cardActionLabel} <span aria-hidden='true'>↗</span></span></div></a>)}</div></div>;
}
