'use client';
import {useState} from 'react';
import {CmsConceptNavigation} from '../../components/CmsConceptNavigation';
import {conceptNavigationSchema} from '../../lib/cms/concept-navigation';
import {MediaImage,type LoadMediaPreview} from './media-image';

/** Uses authenticated draft media. Links demonstrate selection without leaving unsaved work. */
export function ConceptNavigationPreview({value,loadPreview}:{value:unknown;loadPreview:LoadMediaPreview}){
 const result=conceptNavigationSchema.safeParse(value);
 const [destination,setDestination]=useState('');
 if(!result.success)return <p role='alert'>Complete the Concept menu fields before previewing its navigation.</p>;
 const menu=result.data;
 return <section aria-label='Concept menu preview' onClickCapture={event=>{
  const link=(event.target as Element).closest('a[href]');
  if(link){event.preventDefault();setDestination(link.getAttribute('href')??'');}
 }} onAuxClick={event=>{if((event.target as Element).closest('a[href]'))event.preventDefault();}}>
  <p>Menu preview uses private draft images. Selecting a link shows its destination without leaving this preview.</p>
  <CmsConceptNavigation menu={menu} revisionKey={JSON.stringify(menu)} renderImage={image=><MediaImage key={image.assetId} asset={image.assetId} alt={image.decorative?'':image.alt} load={loadPreview}/>}/>
  {destination&&<p role='status'>Selected destination: {destination}</p>}
 </section>;
}
