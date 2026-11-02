'use client';
import {useState} from 'react';
import type {ReactNode} from 'react';
import type {HomepageGuestNotes,HomepageGuestCard} from '../lib/cms/homepage-guest-notes';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsHomepageGuestNotes.css';
export function CmsHomepageGuestNotes({value,cards,headingLevel:H='h2',renderImage}:{value:HomepageGuestNotes;cards:HomepageGuestCard[];headingLevel?:'h1'|'h2'|'h3';renderImage:(image:HomepageGuestCard['image'])=>ReactNode}){
 const [selected,setSelected]=useState(cards[0]?.recordId),index=Math.max(0,cards.findIndex(card=>card.recordId===selected)),card=cards[index];
 if(!card)return null;
 return <div className='cms-home-guest-notes'><header><div>{value.eyebrow&&<p className='eyebrow'>{value.eyebrow}</p>}<H><CmsEditorialHeading value={value.heading}/></H></div><a href={value.button.href} target={value.button.newWindow?'_blank':undefined} rel={value.button.newWindow?'noopener noreferrer':undefined}>{value.button.label}</a></header><div className='cms-home-guest-spread'><figure>{renderImage(card.image)}<figcaption>{card.trip}{card.image.caption&&<span>{card.image.caption}</span>}{card.image.credit&&<small>{card.image.credit}</small>}</figcaption></figure><div><div aria-live='polite' aria-atomic='true'><p>{card.category}</p><blockquote>{card.quote}</blockquote><p className='cms-home-guest-name'>{card.name}</p><p>{card.trip}</p></div><a href={card.href}>{value.cardActionLabel}</a><div className='cms-home-guest-controls'><span>{index+1} / {cards.length}</span><button type='button' disabled={cards.length<2} aria-label={value.previousLabel} onClick={()=>setSelected(cards[(index-1+cards.length)%cards.length].recordId)}>←</button><button type='button' disabled={cards.length<2} aria-label={value.nextLabel} onClick={()=>setSelected(cards[(index+1)%cards.length].recordId)}>→</button></div></div></div></div>;
}
