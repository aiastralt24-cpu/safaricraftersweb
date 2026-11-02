'use client';
import Link from 'next/link';
import type {PublishedNavigation} from '../lib/cms/published-navigation';
export function CmsNavigationLinks({menu,pathname,onNavigate}:{menu:PublishedNavigation;pathname:string;onNavigate:()=>void}){
 function branch(parentId:string|null){return <ul>{menu.items.filter(item=>item.parentId===parentId).map(item=><li key={item.id} data-presentation={item.presentation}>
  {item.link?<Link href={item.link.href} target={item.link.newWindow?'_blank':undefined} rel={item.link.newWindow?'noopener noreferrer':undefined} aria-current={pathname===item.link.href?'page':undefined} onClick={onNavigate}>{item.label}</Link>:<span className='cms-menu-group'>{item.label}</span>}
  {item.description&&<p>{item.description}</p>}
  {item.featuredContent.length>0&&<ul className='cms-menu-featured'>{item.featuredContent.map(ref=><li key={ref.recordId}><Link href={ref.href} onClick={onNavigate}>{ref.title}</Link></li>)}</ul>}
  {menu.items.some(child=>child.parentId===item.id)&&branch(item.id)}
 </li>)}</ul>;}
 return <nav className='cms-published-menu' aria-label={menu.title}>{branch(null)}</nav>;
}
