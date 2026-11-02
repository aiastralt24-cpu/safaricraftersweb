'use client';

import {useEffect, useRef, type ReactNode} from 'react';
import {startKenyaMotion} from '../lib/cms/kenya-motion';

/** Server content stays visible until the browser can enhance this instance. */
export function CmsKenyaMotion({children, revisionKey}: {children: ReactNode; revisionKey: string}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if(root.current)return startKenyaMotion(root.current);
  }, [revisionKey]);
  return <div ref={root} className='kenya-page cms-kenya-page' data-page-revision={revisionKey}>{children}</div>;
}
