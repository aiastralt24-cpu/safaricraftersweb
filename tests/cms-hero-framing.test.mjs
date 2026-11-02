import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/cms-about-page.json' with {type:'json'};
import {sectionDataSchemas} from '../lib/cms/composition.ts';
import {projectAboutPage} from '../lib/cms/about-page.ts';
import {heroFramingStyle} from '../lib/cms/hero-framing.ts';
test('hero framing preserves legacy payloads and rejects arbitrary CSS and out-of-bounds focal points',()=>{
 const hero=fixture.payload.composition.sections[0].data;
 const legacy=sectionDataSchemas.hero.parse(hero);assert.equal(legacy.desktopFraming,undefined);assert.equal(legacy.mobileFraming,undefined);assert.equal(legacy.desktop.assetId,hero.desktop.assetId);
 for(const framing of [{shape:'wide',x:-1,y:50},{shape:'square',x:50,y:101},{shape:'url(secret)',x:50,y:50},{shape:'portrait',x:NaN,y:50},{shape:'wide',x:50,y:50,css:'position:fixed'}])assert.equal(sectionDataSchemas.hero.safeParse({...hero,desktopFraming:framing}).success,false);
});
test('published About retains independent mobile crop, including shared-image mobile fallback',()=>{
 const input=structuredClone(fixture),hero=input.payload.composition.sections[0].data;
 delete hero.mobile;hero.desktopFraming={shape:'wide',x:50,y:58};hero.mobileFraming={shape:'portrait',x:20,y:75};
 const result=projectAboutPage(input,{locale:'en',now:new Date('2026-10-22T12:00:00Z')}).sections[0].data;
 assert.deepEqual(result.desktopFraming,hero.desktopFraming);assert.deepEqual(result.mobileFraming,hero.mobileFraming);
 const style=heroFramingStyle(result.desktopFraming,result.mobileFraming);
 assert.equal(style['--hero-position'],'50% 58%');assert.equal(style['--hero-mobile-position'],'20% 75%');assert.equal(style['--hero-mobile-ratio'],'3 / 4');
 assert.equal(heroFramingStyle(result.desktopFraming)['--hero-mobile-position'],'50% 58%');
 assert.equal(heroFramingStyle()['--hero-ratio'],'auto');
});
test('About leadership preserves separate names, roles and portrait focal points',async()=>{
 const {default:inventory}=await import('../docs/cms/about-migration-inventory.json',{with:{type:'json'}});
 for(const profile of inventory.content.leadership.profiles){
 const input=structuredClone(fixture),section=input.payload.composition.sections[2];
 section.data.eyebrow=profile.name;section.data.title=profile.role.text;
 const [x,y]=profile.image.objectPosition.split(' ').map(parseFloat);
 section.data.desktopFraming={shape:'portrait',x,y};section.data.mobileFraming={shape:'portraitWide',x,y};
 const projected=projectAboutPage(input,{locale:'en',now:new Date('2026-10-22')}).sections[2].data;
 assert.equal(projected.eyebrow,profile.name);assert.equal(projected.title,profile.role.text);
 assert.equal(heroFramingStyle(projected.desktopFraming,projected.mobileFraming)['--hero-mobile-ratio'],'5 / 6');
 assert.equal(heroFramingStyle(projected.desktopFraming)['--hero-position'],profile.image.objectPosition);
 }
});
