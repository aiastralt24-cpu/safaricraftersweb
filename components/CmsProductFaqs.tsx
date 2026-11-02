'use client';

import { useEffect, useId, useState } from 'react';
import type { PublishedProduct } from '@/lib/cms/published-product';
import { CmsRichTextBlock } from './CmsRichTextBlock';

export function CmsProductFaqs({ items }: { items: PublishedProduct['faqs'] }) {
  const prefix = useId();
  const [open, setOpen] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  // Keep server-rendered controls inactive until their handlers are attached.
  useEffect(() => setReady(true), []);

  return (
    <section aria-label="Product questions">
      <h2 className="h2">Questions and answers</h2>
      {items.map((faq, i) => {
        const expanded = open === i;
        const question = `${prefix}-question-${i}`;
        const answer = `${prefix}-answer-${i}`;
        return (
          <div key={i}>
            <h3>
              <button
                type="button"
                disabled={!ready}
                id={question}
                aria-expanded={expanded}
                aria-controls={answer}
                onClick={() => setOpen(expanded ? null : i)}
                style={{ width: '100%', textAlign: 'left', padding: '.75rem', background: 'transparent', border: '1px solid #ddd', font: 'inherit' }}
              >
                {faq.question}
              </button>
            </h3>
            <div id={answer} role="region" aria-labelledby={question} hidden={!expanded}>
              {faq.answer.map((block, j) => <CmsRichTextBlock key={j} block={block} />)}
            </div>
          </div>
        );
      })}
    </section>
  );
}
