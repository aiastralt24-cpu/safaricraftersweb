'use client';
import Link from 'next/link';
import {useState} from 'react';
import type {PublishedDestinationSummary} from '@/lib/cms/published-destination-list';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export function CmsDestinationListing({destinations,atlases}:{destinations:PublishedDestinationSummary[];atlases:{slug:string;title:string;description:string}[]}){
 const [query,setQuery]=useState(''),[region,setRegion]=useState('');
 const filtered=destinations.filter(item=>(!region||item.continent===region)&&`${item.title} ${item.country} ${item.region} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <section className='cms-destination-listing'><header><p className='eyebrow'>Destinations</p><h1>The wild, considered.</h1><p>Explore places by landscape, region and the season you want to travel.</p></header>
 {atlases.length>0&&<nav aria-label='Regional destination atlases' className='cms-destination-atlases'>{atlases.map(atlas=><Link key={atlas.slug} href={`/destinations/${atlas.slug}`}><strong>{atlas.title}</strong><span>{atlas.description}</span><span>Open the atlas →</span></Link>)}</nav>}
 <div className='cms-destination-filters'><label>Find a destination<input type='search' value={query} onChange={event=>setQuery(event.target.value)} placeholder='Place, country or landscape'/></label><label>Region<select value={region} onChange={event=>setRegion(event.target.value)}><option value=''>All regions</option>{['India','Africa','Americas','Arctic'].map(value=><option key={value}>{value}</option>)}</select></label>{(query||region)&&<button type='button' onClick={()=>{setQuery('');setRegion('');}}>Clear filters</button>}</div>
 <p role='status'>{filtered.length} {filtered.length===1?'destination':'destinations'}</p>
 {filtered.length>0?<div className='cms-destination-list-grid'>{filtered.map(item=><article key={item.recordId}><Link href={item.path} tabIndex={-1} aria-hidden='true'><img src={publishedMediaUrl(item.image.assetId)} alt='' loading='lazy'/></Link><div><p className='eyebrow'>{item.country}</p><h2><Link href={item.path}>{item.title}</Link></h2><p>{item.description}</p><p><strong>Best months:</strong> {item.bestMonths}</p><Link href={item.path}>Explore destination →</Link></div></article>)}</div>:<p>{destinations.length?'No destinations match these filters. Try another place or region.':'Destination guides are being prepared.'} <Link href='/plan'>Let us help plan your journey.</Link></p>}
 </section>;
}
