import './CmsHeadingText.css';
import {headingParts} from '../lib/cms/heading-emphasis';
export function CmsHeadingText({title,accent}:{title:string;accent?:string}){
 const parts=headingParts(title,accent);
 return <>{parts.before}{parts.emphasis&&<em className='editorial-accent cms-heading-accent'>{parts.emphasis}</em>}{parts.after}</>;
}
