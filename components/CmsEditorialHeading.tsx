import {Fragment} from 'react';
import type {EditorialHeading} from '../lib/cms/editorial-heading';
import './CmsHeadingText.css';

/** Parent owns the semantic heading level. All editorial strings are escaped. */
export function CmsEditorialHeading({value}:{value:EditorialHeading}){
 return <>{value.lines.map((line,lineIndex)=><Fragment key={lineIndex}>{lineIndex>0&&<br/>}{line.runs.map((run,index)=>run.emphasis?<em key={index} className='editorial-accent cms-heading-accent'>{run.text}</em>:<Fragment key={index}>{run.text}</Fragment>)}</Fragment>)}</>;
}
