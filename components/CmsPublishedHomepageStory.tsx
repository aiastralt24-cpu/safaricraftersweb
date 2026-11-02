import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import {CountUp} from './CountUp';
import type {HomepagePublicSection} from '../lib/cms/homepage-projection';
export function CmsPublishedHomepageStory({section}:{section:Extract<HomepagePublicSection,{kind:'homepageStory'}>}){
 const {data,controls}=section,Heading=controls.headingLevel,titleId=`${section.id}-heading`;
 return <section data-cms-motion={controls.animation} id={controls.anchor} className={`concept-story-proof cms-homepage-story background-${controls.background} width-${controls.width} spacing-${controls.spacing} align-${controls.textAlign}`} aria-labelledby={titleId} data-nav-label={data.eyebrow}><div className='concept-story-proof-intro'><div><p>{data.eyebrow}</p><Heading id={titleId}><CmsEditorialHeading value={data.heading}/></Heading></div><div className='concept-story-proof-copy'><p>{data.copy}</p><Link href={data.button.href} target={data.button.newWindow?'_blank':undefined} rel={data.button.newWindow?'noopener noreferrer':undefined}>{data.button.label}<ArrowRight size={16} strokeWidth={1.25}/></Link></div></div><aside className='concept-legacy-ledger' aria-label={data.ledgerTitle}><p>{data.ledgerTitle}</p><dl>{data.statistics.map(statistic=><div key={statistic.id}><dt><CountUp value={statistic.value} suffix={statistic.suffix}/></dt><dd>{statistic.label}</dd></div>)}</dl></aside></section>;
}
