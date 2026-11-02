import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsLegalPage} from '@/components/CmsLegalPage';
import {usesCmsLegalPages,loadLegalRoute} from '@/lib/cms/legal-page-runtime';
import {legalPageMetadata} from '@/lib/cms/legal-page';
import type {Metadata} from 'next';
const loadCmsPage=cache(()=>loadLegalRoute('/legal/terms'));
export async function generateMetadata():Promise<Metadata>{if(!usesCmsLegalPages())return legacyMetadata;const content=await loadCmsPage();return content?legalPageMetadata(content.page,content.seoDefaults):{robots:{index:false,follow:false}};}
const legacyMetadata:Metadata={};
export default async function TermsPage() {
  if(usesCmsLegalPages()){const content=await loadCmsPage();if(!content)notFound();return <CmsLegalPage page={content.page}/>;}
  return (
    <section className="section" style={{ paddingTop: 150 }}>
      <div className="container" style={{ maxWidth: 820 }}>
        <h1 className="h1">Terms</h1>
        <p className="intro">
          Safari Crafters journey proposals are personalised and subject to availability,
          local park rules, lodge policies and final confirmation by a specialist.
        </p>
      </div>
    </section>
  );
}
