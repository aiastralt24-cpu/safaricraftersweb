import type { Destination, FAQItem } from './data';

/** Compare copy without punctuation/case differences; never use fuzzy topic matching. */
export function normalizedDestinationCopy(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

export function copyAlreadyCovered(copy: string, sections: string[]) {
  const text = normalizedDestinationCopy(copy);
  return text.length >= 20 && sections.some(section => normalizedDestinationCopy(section).includes(text));
}

export function distinctDestinationFaqs(destination: Destination, faqs: FAQItem[]) {
  const visibleCopy = [destination.intro, destination.habitat, destination.safariRhythm,
    destination.wildlife, destination.bestMonths, destination.idealStay, destination.gateway,
    destination.editorial?.landscapeCopy, destination.editorial?.wildlifeCopy].filter((text): text is string => Boolean(text));
  const seenQuestions = new Set<string>();
  const seenAnswers = new Set<string>();
  return faqs.filter(faq => {
    const question = normalizedDestinationCopy(faq.question);
    const answer = normalizedDestinationCopy(faq.answer);
    // Remove only known boilerplate endings when the entire substantive answer is already shown.
    const substantive = faq.answer.replace(/\s*(?:Sightings remain wild and are never guaranteed\.|The final dates should follow the exact region, wildlife priority and access pattern\.|This protects useful field time and reduces avoidable transfers\.)\s*$/i, '').trim();
    const repeated = copyAlreadyCovered(substantive, visibleCopy)
      || visibleCopy.some(copy => normalizedDestinationCopy(copy) === answer);
    if (!question || !answer || seenQuestions.has(question) || seenAnswers.has(answer) || repeated) return false;
    seenQuestions.add(question);
    seenAnswers.add(answer);
    return true;
  });
}

export function uniqueDestinationParagraphs(text: string, previous: string[] = []) {
  const seen = new Set(previous.map(normalizedDestinationCopy));
  return text.split(/\n\s*\n/).filter(paragraph => {
    const key = normalizedDestinationCopy(paragraph);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join('\n\n');
}
