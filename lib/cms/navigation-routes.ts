import {safeHref} from './composition.ts';
/** Deployment-owned fixed public routes, checked against app page sources.
 * Dynamic content uses record references so withdrawal is reflected in menus. */
export const publicNavigationPaths=[
 '/', '/about', '/concept', '/conservation-commitment', '/contact', '/destinations',
 '/guided-bespoke-safaris', '/journal', '/journeys', '/legal/cookies', '/legal/privacy', '/legal/terms',
 '/mice', '/photo-expeditions', '/plan', '/private-aviation', '/reviews', '/search', '/specialists',
 '/store', '/store/books', '/store/books/ghosts-of-the-granite-hills',
] as const;
// Domains controlled by this deployment. Subdomains other than www are not public menu destinations.
export const publicNavigationHosts=['safaricrafters.com','www.safaricrafters.com'] as const;
export const publicNavigationAnchors=['main'] as const;
export function navigationUrlStatus(href:string):'available'|'unverified'|'invalid'{
 if(!safeHref.safeParse(href).success)return 'invalid';
 if(href.startsWith('#'))return publicNavigationAnchors.some(anchor=>href===`#${anchor}`)?'available':'unverified';
 let relative=href;
 if(!href.startsWith('/')){
  // A conservative authority grammar keeps application and database parsing aligned.
  const match=/^https:\/\/([a-z0-9.-]+)(?::([0-9]+))?([/?#].*)?$/i.exec(href);
  if(!match)return 'invalid';
  const host=match[1].toLowerCase().replace(/\.$/,''),port=match[2];
  if(port&&(port.length>5||Number(port)<1||Number(port)>65535))return 'invalid';
  const owned=host==='safaricrafters.com'||host.endsWith('.safaricrafters.com');
  if(!owned)return 'available'; // Syntax only; no assertion of remote reachability.
  if(!publicNavigationHosts.some(value=>value===host)||(port&&port!=='443'))return 'unverified';
  relative=match[3]||'/';
  if(!relative.startsWith('/'))relative='/'+relative;
 }
 const [withoutHash,anchor,...extra]=relative.split('#');
 if(extra.length||anchor!==undefined&&!publicNavigationAnchors.some(value=>value===anchor))return 'unverified';
 const path=withoutHash.split('?',1)[0];
 return publicNavigationPaths.some(value=>value===path)?'available':'unverified';
}
