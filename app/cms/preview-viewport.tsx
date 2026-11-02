'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** A same-origin, empty document containing only the existing React preview.
 * Copy stylesheet nodes, never application scripts or untrusted HTML. */
export function PreviewViewport({width,height,children}:{width:number;height:number;children:ReactNode}){
 const frame=useRef<HTMLIFrameElement>(null),[root,setRoot]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  const doc=frame.current?.contentDocument;if(!doc)return;
  doc.documentElement.className=document.documentElement.className;
  doc.body.className=document.body.className;doc.body.style.margin='0';
  const styles=doc.createElement('div');doc.head.append(styles);
  const syncStyles=()=>styles.replaceChildren(...Array.from(document.head.querySelectorAll('style,link[rel="stylesheet"]')).map(node=>node.cloneNode(true)));
  syncStyles();
  const mount=doc.createElement('div');mount.className='cms-workspace';mount.style.display='block';mount.style.minHeight='0';doc.body.append(mount);setRoot(mount);
  const stopNavigation=(event:MouseEvent)=>{const target=event.target as Element|null;const link=target?.closest?.('a');if(!link)return;event.preventDefault();const href=link.getAttribute('href');if(href?.startsWith('#'))doc.getElementById(href.slice(1))?.scrollIntoView();};
  doc.addEventListener('click',stopNavigation);
  return()=>{doc.removeEventListener('click',stopNavigation);styles.remove();mount.remove();};
 },[]);
 return <div className='cms-preview-viewport-scroll' tabIndex={0} aria-label='Scrollable draft preview canvas'><iframe ref={frame} title='Responsive draft preview' width={width} height={height} style={{width,height,border:0,display:'block',maxWidth:'none'}}/>{root&&createPortal(children,root)}</div>;
}
