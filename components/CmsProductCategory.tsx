import type {ReactNode} from 'react';
import {Breadcrumbs} from './Breadcrumbs';
import type {PublishedProductCategory} from '@/lib/cms/published-product-category';
export function CmsProductCategory({profile,children}:{profile:PublishedProductCategory;children?:ReactNode}){
 const d=profile.content;
 return <article className='article cms-public-product-category'>
  <header className='container' style={{paddingTop:'8rem',paddingBottom:'2rem'}}>
   <Breadcrumbs items={[{label:'Home',href:'/'},{label:'Product categories',href:'/product-categories'},...(profile.parent?[{label:profile.parent.title,href:profile.parent.href}]:[]),{label:d.seo.breadcrumbLabel||d.title}]}/>
   <p className='eyebrow'>Product category</p><h1 className='display'>{d.title}</h1>
  </header>
  <div className='article-body'><p className='intro' style={{whiteSpace:'pre-wrap'}}>{d.summary}</p>{children}<p><a href='/product-categories'>All product categories</a></p></div>
 </article>;
}
