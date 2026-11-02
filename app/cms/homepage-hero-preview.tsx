'use client';
import {HomepageVideoPreview} from './homepage-video-preview';
import {useState} from 'react';
import type {HomepageHero} from '../../lib/cms/homepage-hero';
import {CmsEditorialHeading} from '../../components/CmsEditorialHeading';
import {MediaImage} from './media-image';
import type {LoadMediaPreview} from './media-image';
import {heroFramingStyle} from '../../lib/cms/hero-framing';
import '../../components/CmsHeroFraming.css';
export function HomepageHeroPreview({value,loadPreview,loadVideoPreview,headingLevel:H}:{value:HomepageHero;loadPreview:LoadMediaPreview;loadVideoPreview?:LoadMediaPreview;headingLevel:'h1'|'h2'|'h3'}){
 const [selected,setSelected]=useState(value.frames[0].id);
 const frame=value.frames.find(item=>item.id===selected)??value.frames[0];
 const picture=(poster:HomepageHero['poster'])=><figure className='cms-hero-framing hero-breakpoint-760' style={heroFramingStyle(value.framing,value.mobileFraming)}><MediaImage asset={poster.assetId} alt={poster.decorative?'':poster.alt} load={loadPreview}/>{(poster.caption||poster.credit)&&<figcaption>{poster.caption}{poster.credit&&<small>{poster.credit}</small>}</figcaption>}</figure>;
 return <><div role='group' aria-label='Preview headline frames'>{value.frames.map((item,index)=><button type='button' key={item.id} aria-pressed={item.id===frame.id} onClick={()=>setSelected(item.id)}>Frame {index+1}</button>)}</div><H><CmsEditorialHeading value={frame.heading}/></H>{value.copy&&<p>{value.copy}</p>}<div className={value.mobilePoster?'cms-preview-desktop-image':''}>{picture(value.poster)}</div>{value.mobilePoster&&<div className='cms-preview-mobile-image'>{picture(value.mobilePoster)}</div>}{value.background.kind==='video'&&<HomepageVideoPreview desktop={value.background.desktopAssetId} mobile={value.background.mobileAssetId} load={loadVideoPreview}/>}<p>Draft preview. Headline rotation and the final homepage layout are not shown.</p></>;
}
