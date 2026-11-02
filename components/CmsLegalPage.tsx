import {CmsDocumentDownloads} from './CmsDocumentDownloads';
import type {PublishedLegalPage} from '@/lib/cms/legal-page';
import {CmsTextSection} from './CmsTextSection';
import './CmsLegalPage.css';
export function CmsLegalPage({page}:{page:PublishedLegalPage}){return <article className='cms-legal-page'>{page.sections.map(section=><section key={section.id} id={section.controls.anchor} className={`cms-legal-section background-${section.controls.background} spacing-${section.controls.spacing} align-${section.controls.textAlign}`}><div className={`cms-legal-width width-${section.controls.width}`}>{section.kind==='downloads'?<CmsDocumentDownloads data={section.data} headingLevel={section.controls.headingLevel}/>:<CmsTextSection data={section.data} headingLevel={section.controls.headingLevel}/>}</div></section>)}</article>;}
