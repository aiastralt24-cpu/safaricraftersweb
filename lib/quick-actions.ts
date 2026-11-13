export const socialLinks = {
  instagram: 'https://www.instagram.com/safaricrafters/?hl=en',
  facebook: 'https://www.facebook.com/people/Safari-Crafters/61574511053895/'
};

export function quickActionLinks(pathname: string, title = '') {
  const match = pathname.match(/^\/(destinations|journeys|photo-expeditions)\/([^/]+)\/?$/);
  const context = match && title.trim() ? title.replace(/\s+/g, ' ').trim() : '';
  const message = context
    ? `Hi Safari Crafters, I’m interested in ${context}. Could you share more details?`
    : 'Hi Safari Crafters, I’d like help planning a safari. Could you share more details?';
  const key = match?.[1] === 'journeys' ? 'journey' : 'destination';
  return {
    whatsapp: `https://wa.me/919274479186?text=${encodeURIComponent(message)}`,
    enquiry: match?.[1] === 'photo-expeditions' ? '#expedition-enquiry'
      : match ? `/plan?${key}=${encodeURIComponent(match[2])}` : '/plan'
  };
}

export function showQuickActions(pathname: string) {
  return !/^\/(admin|cms|studio|preview|enquire|plan|documents)(\/|$)/.test(pathname);
}
