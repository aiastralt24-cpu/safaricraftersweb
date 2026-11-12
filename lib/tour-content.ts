import type { FAQItem } from './data';

const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Exact copy only: similar topics may contain different operational details. */
export function uniqueTourCopy(items: string[], covered: string[] = []) {
  const seen = new Set(covered.map(normalize));
  return items.filter(text => {
    const key = normalize(text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function distinctTourFaqs<T extends FAQItem>(items: T[], covered: string[] = []): T[] {
  const questions = new Set<string>();
  const answers = new Set(covered.map(normalize));
  return items.filter(item => {
    const question = normalize(item.question), answer = normalize(item.answer);
    if (!question || !answer || questions.has(question) || answers.has(answer)) return false;
    questions.add(question);
    answers.add(answer);
    return true;
  });
}

export function photoTourFaqs(tour: { faqs?: FAQItem[]; skill?: string; equipment?: string; intro: string; highlights: string[] }) {
  const authored = distinctTourFaqs(tour.faqs || [], [tour.equipment || '', ...tour.intro.split(/\n\s*\n/), ...tour.highlights]);
  const faqs = [...authored];
  // Authored answers take precedence. Dates and existing equipment lists live in the facts panel.
  if (!authored.some(item => /experience|beginner|skill|non-photographer/i.test(item.question))) {
    faqs.push({ question: 'What photography experience do I need?', answer: tour.skill ? `${tour.skill}. Share your experience and goals with the team so they can confirm whether this tour is suitable for you.` : 'Tell the team about your photography experience and interests when enquiring so they can confirm suitability.' });
  }
  if (!tour.equipment && !authored.some(item => /equipment|camera|pack|bring/i.test(item.question))) {
    faqs.push({ question: 'What equipment should I bring?', answer: 'Ask for a recommended equipment list for your departure before booking. Share your camera and lens setup with the team.' });
  }
  if (!authored.some(item => /sightings?.*guarantee/i.test(item.question) || /(?:cannot|not|never) be guaranteed|cannot be promised/i.test(item.answer))) {
    faqs.push({ question: 'Are wildlife sightings guaranteed?', answer: 'Wildlife moves freely. Sightings depend on animal behaviour, weather and conditions in the field and cannot be guaranteed.' });
  }
  return distinctTourFaqs(faqs);
}
