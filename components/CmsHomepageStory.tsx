import type {z} from 'zod';
import type {sectionDataSchemas} from '../lib/cms/composition';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsHomepageStory.css';
export type HomepageStory=z.infer<typeof sectionDataSchemas.homepageStory>;
export function CmsHomepageStory({value,headingLevel:H='h2'}:{value:HomepageStory;headingLevel?:'h1'|'h2'|'h3'}){
 return <div className='cms-home-story'><div className='cms-home-story-intro'><div><p>{value.eyebrow}</p><H><CmsEditorialHeading value={value.heading}/></H></div><div className='cms-home-story-copy'><p>{value.copy}</p><a href={value.button.href} target={value.button.newWindow?'_blank':undefined} rel={value.button.newWindow?'noopener noreferrer':undefined}>{value.button.label}</a></div></div><aside className='cms-home-story-ledger' aria-label={value.ledgerTitle}><p>{value.ledgerTitle}</p><dl>{value.statistics.map(statistic=><div key={statistic.id}><dt>{statistic.label}</dt><dd>{new Intl.NumberFormat('en-US').format(statistic.value)}{statistic.suffix}</dd></div>)}</dl></aside></div>;
}
