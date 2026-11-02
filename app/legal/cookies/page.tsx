import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsLegalPage} from '@/components/CmsLegalPage';
import {usesCmsLegalPages,loadLegalRoute} from '@/lib/cms/legal-page-runtime';
import {legalPageMetadata} from '@/lib/cms/legal-page';
import type {Metadata} from 'next';
const loadCmsPage=cache(()=>loadLegalRoute('/legal/cookies'));
export async function generateMetadata():Promise<Metadata>{if(!usesCmsLegalPages())return legacyMetadata;const content=await loadCmsPage();return content?legalPageMetadata(content.page,content.seoDefaults):{robots:{index:false,follow:false}};}
const legacyMetadata:Metadata={};
export default async function CookiesPage() {
  if(usesCmsLegalPages()){const content=await loadCmsPage();if(!content)notFound();return <CmsLegalPage page={content.page}/>;}
  return (
    <section className="section" style={{ paddingTop: 150 }}>
      <div className="container" style={{ maxWidth: 820 }}>
        <h1 className="h1">Browser storage & analytics</h1>
        <p className="intro">The planner remembers travel preferences in this browser tab for up to 24 hours. Name, email, phone and free-text notes are not included in that saved draft.</p>
        <p>We also keep a random submission reference in the tab to avoid duplicate enquiries when you retry. Closing the tab clears this session storage.</p>
        <p>When website measurement is enabled, we record page paths and enquiry steps using a temporary session identifier. These events exclude form contents, URL query strings and IP addresses. Measurement respects your browser’s Do Not Track setting.</p>
      </div>
    </section>
  );
}
