'use client';
import {useEffect,useMemo,useState} from 'react';
import type {readPublishedProductList} from '@/lib/cms/public-product-runtime';
import {productFilterOptions,matchesProductFilters} from '@/lib/cms/product-filters';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
type Item=Awaited<ReturnType<typeof readPublishedProductList>>[number];
export function CmsProductCatalog({items,embedded=false,category=false}:{items:Item[];embedded?:boolean;category?:boolean}){
 const [ready,setReady]=useState(false);
 useEffect(()=>setReady(true),[]);
 const [filters,setFilters]=useState<Record<string,string>>({});
 const options=useMemo(()=>productFilterOptions(items),[items]);
 const visible=items.filter(item=>matchesProductFilters(item,filters));
 const Tag=embedded?'section':'main',Heading=embedded?'h2':'h1',CardHeading=embedded?'h3':'h2';
 return <Tag className={embedded?undefined:'container'} aria-label="Products" style={embedded?{marginBlock:'3rem'}:{paddingBlock:'8rem 4rem'}}>
  <Heading className={embedded?'h2':'display'}>Products</Heading>
  {options.length>0&&<fieldset disabled={!ready}><legend>Filter products by specification</legend><p>Filters apply to base product specifications. Multiple filters must all match.</p><div style={{display:'flex',flexWrap:'wrap',gap:'1rem'}}>{options.map(option=><label key={option.key} style={{display:'grid',maxWidth:'100%'}}>{option.label}{option.unit?` (${option.unit})`:''} — {option.category}{option.region==='global'?'':` · ${option.region}`}<select aria-label={`${option.label}${option.unit?` (${option.unit})`:''} — ${option.category}${option.region==='global'?'':` · ${option.region}`}`} style={{maxWidth:'100%'}} value={filters[option.key]??''} onChange={event=>setFilters(current=>{const next={...current};if(event.target.value)next[option.key]=event.target.value;else delete next[option.key];return next;})}><option value="">All values</option>{option.values.map(value=><option key={value.token} value={value.token}>{value.label}</option>)}</select></label>)}</div><button type="button" onClick={()=>setFilters({})}>Clear filters</button></fieldset>}
  {items.length>0&&<p role="status">{visible.length} of {items.length} products</p>}
  {visible.length?<form action="/products" method="get"><p>Select two to four products to compare.</p><button type="submit">Compare selected products</button><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,20rem),1fr))',gap:'2rem',marginTop:'2rem'}}>{visible.map(item=><article key={item.recordId}><a href={item.path}>{item.image&&<img src={publishedMediaUrl(item.image.assetId)} alt={item.image.decorative?'':item.image.alt} loading="lazy" style={{width:'100%',aspectRatio:'4/3',objectFit:'contain'}}/>}<CardHeading className="h3">{item.title}</CardHeading></a><p>{[item.brand,item.code].filter(Boolean).join(' · ')}</p>{item.lifecycle!=='active'&&<p>{item.lifecycle==='comingSoon'?'Coming soon':'Discontinued'}</p>}<p>{item.summary}</p><label><input type="checkbox" name="compare" value={item.path.slice('/products/'.length)}/> Compare {item.title}</label></article>)}</div></form>:items.length?<p>No products match these filters. Clear a filter to broaden the results.</p>:<p>No products have been published{category?' in this category':''} yet.</p>}
 </Tag>;
}
