"use client";

import {useId, useState, type ReactNode} from 'react';
import './MediaGallery.css';

export function CmsExpeditionGallery({children}: {children: ReactNode[]}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <>
    <div id={id} className='cms-expedition-gallery'>{expanded ? children : children.slice(0, 6)}</div>
    {children.length > 6 && <button type='button' className='gallery-view-more' aria-expanded={expanded} aria-controls={id} onClick={(event) => { const button = event.currentTarget; setExpanded(!expanded); if (expanded) requestAnimationFrame(() => button.scrollIntoView({block: "end", behavior: "instant"})); }}>{expanded ? 'View less' : 'View more'}<span aria-hidden='true'>{expanded ? ' −' : ' +'}</span></button>}
  </>;
}
