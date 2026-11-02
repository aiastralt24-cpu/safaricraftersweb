import type {CSSProperties} from 'react';
import type {HeroFraming} from './composition.ts';
const ratios={natural:'auto',wide:'16 / 9',square:'1 / 1',portrait:'3 / 4',portraitWide:'5 / 6'} as const;
/** Mobile inherits desktop framing unless the editor explicitly overrides it. */
export function heroFramingStyle(desktop?:HeroFraming,mobile?:HeroFraming):CSSProperties & Record<`--hero-${string}`,string>{
 const d=desktop??{shape:'natural',x:50,y:50},m=mobile??d;
 return {'--hero-ratio':ratios[d.shape],'--hero-position':`${d.x}% ${d.y}%`,'--hero-mobile-ratio':ratios[m.shape],'--hero-mobile-position':`${m.x}% ${m.y}%`};
}
