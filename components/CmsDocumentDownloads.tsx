import {documentDownloadHref} from '../lib/cms/document-download-link';
import {sectionDataSchemas} from '../lib/cms/composition';
import type {z} from 'zod';
export function CmsDocumentDownloads({data,headingLevel:Heading='h2'}:{data:z.infer<typeof sectionDataSchemas.downloads>;headingLevel?:'h1'|'h2'|'h3'|'h4'}){
 return <div className='cms-document-downloads'><Heading className={Heading}>{data.title}</Heading><ul>{data.items.map(item=><li key={item.id}><a href={documentDownloadHref(item.document.recordId,item.versionId)}>{item.label}</a></li>)}</ul></div>;
}
