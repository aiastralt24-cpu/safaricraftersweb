'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Breadcrumbs} from './Breadcrumbs';
import type {PublishedJournalSummary} from '@/lib/cms/published-journal-list';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
import './Cards.css';
export function CmsJournalListing({articles}:{articles:PublishedJournalSummary[]}){
 const [category,setCategory]=useState('');
 const categories=[...new Set(articles.map(item=>item.category))].sort((a,b)=>a.localeCompare(b));
 const selected=categories.includes(category)?category:'';
 const visible=selected?articles.filter(item=>item.category===selected):articles,hero=articles[0]?.image;
 return <><header className={`article-hero cms-journal-list-hero${hero?'':' cms-journal-list-empty'}`}>{hero&&<><img src={publishedMediaUrl(hero.assetId)} alt={hero.decorative?'':hero.alt} fetchPriority='high'/><div className='article-scrim'/></>}<div className='container article-hero-content'><Breadcrumbs items={[{label:'Home',href:'/'},{label:'The Journal'}]} variant='hero'/><p className='eyebrow'>Field notes · Photography · Conservation</p><h1 className='display'>The Journal</h1><p>Field notes, photographic essays, conservation thinking and practical safari intelligence.</p></div></header><section className='section surface-white'><nav className='container category-rail' aria-label='Filter journal stories'><button type='button' aria-pressed={!selected} className={!selected?'is-active':''} onClick={()=>setCategory('')}>All stories</button>{categories.map(item=><button type='button' key={item} aria-pressed={selected===item} className={selected===item?'is-active':''} onClick={()=>setCategory(item)}>{item}</button>)}</nav><p className='container journal-result-count' role='status'>{visible.length} {visible.length===1?'story':'stories'} · {selected||'All stories'}</p>{visible.length?<div className='container grid-3 listing-grid'>{visible.map(item=><article className='editorial-card' key={item.recordId}><Link href={item.path} className='image-frame editorial-card-image' tabIndex={-1} aria-hidden='true'><img src={publishedMediaUrl(item.image.assetId)} alt='' loading='lazy' className='cms-journal-card-image'/></Link><p className='eyebrow'>{[item.category,item.readTime].filter(Boolean).join(' · ')}</p><h2 className='h3'><Link href={item.path}>{item.title}</Link></h2><p>{item.description}</p><Link className='brass-link' href={item.path}>Read this story</Link></article>)}</div>:<div className='container'><h2 className='h3'>New stories are on their way.</h2><p>Explore our journeys while the next field notes are being prepared.</p><Link className='brass-link' href='/journeys'>Explore journeys</Link></div>}</section></>;
}
