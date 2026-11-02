import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialHeadingSchema,editorialHeadingText} from '../lib/cms/editorial-heading.ts';
import {homepageHeroSchema} from '../lib/cms/homepage-hero.ts';

const heading={lines:[{runs:[{text:'Informed by ',emphasis:false},{text:'intention,',emphasis:true}]},{runs:[{text:'guided by ',emphasis:false},{text:'experience.',emphasis:true}]}]};
const hero={navigationLabel:'The wild, considered',frames:[{id:'stillness',heading:{lines:[{runs:[{text:'In pursuit',emphasis:false}]},{runs:[{text:'of ',emphasis:false},{text:'Stillness.',emphasis:true}]}]}}],copy:'',poster:{assetId:'poster-1',alt:'Wildlife landscape'},background:{kind:'image'}};

test('homepage editorial headings retain multiple emphasis fragments, punctuation, spaces and explicit breaks',()=>{
 const parsed=editorialHeadingSchema.parse(heading);
 assert.deepEqual(parsed,heading);
 assert.equal(editorialHeadingText(parsed),'Informed by intention,\nguided by experience.');
 assert.equal(parsed.lines.flatMap(line=>line.runs).filter(run=>run.emphasis).length,2);
 const repeated={lines:[{runs:[{text:'Wild ',emphasis:false},{text:'wild',emphasis:true},{text:' wildlife',emphasis:false}]}]};
 assert.deepEqual(editorialHeadingSchema.parse(repeated),repeated);
});

test('heading bounds apply to the complete visible text instead of each fragment separately',()=>{
 const split={lines:[{runs:[{text:'a'.repeat(100),emphasis:false}]},{runs:[{text:'b'.repeat(99),emphasis:true}]}]};
 assert.equal(editorialHeadingText(editorialHeadingSchema.parse(split)).length,200);
 split.lines[1].runs[0].text+='b';
 assert.equal(editorialHeadingSchema.safeParse(split).success,false);
 for(const value of [{lines:[]},{lines:[{runs:[]}]},{lines:[{runs:[{text:'   ',emphasis:false}]}]},{lines:Array.from({length:7},()=>({runs:[{text:'x',emphasis:false}]}))}])assert.equal(editorialHeadingSchema.safeParse(value).success,false);
});

test('imported heading formatting cannot introduce hidden line breaks or unknown markup fields',()=>{
 for(const text of ['line\nline','line\rline','a\u2028b','a\u2029b','a\u0000b'])assert.equal(editorialHeadingSchema.safeParse({lines:[{runs:[{text,emphasis:false}]}]}).success,false);
 assert.equal(editorialHeadingSchema.safeParse({lines:[{runs:[{text:'Title',emphasis:true,html:'<b>Title</b>'}]}]}).success,false);
 // Literal strings stay literal; rendering owns HTML escaping, not sanitizing copy.
 assert.equal(editorialHeadingText(editorialHeadingSchema.parse({lines:[{runs:[{text:'<script> & wildlife',emphasis:false}]}]})),'<script> & wildlife');
});

test('hero contract retains ordered, independently identified frames and responsive media',()=>{
 const value=structuredClone(hero);value.frames.push({id:'encounters',heading});
 value.background={kind:'video',desktopAssetId:'video-desktop',mobileAssetId:'video-mobile'};
 value.mobilePoster={assetId:'mobile-poster',alt:'Portrait wildlife view'};
 const parsed=homepageHeroSchema.parse(value);
 assert.deepEqual(parsed.frames.map(frame=>frame.id),['stillness','encounters']);
 assert.equal(parsed.background.mobileAssetId,'video-mobile');
 assert.equal(parsed.mobilePoster.alt,'Portrait wildlife view');
});

test('invalid hero imports cannot silently coerce missing media, duplicate identities, or oversized collections',()=>{
 for(const patch of [{frames:[]},{frames:[hero.frames[0],hero.frames[0]]},{frames:Array.from({length:11},(_,i)=>({...hero.frames[0],id:`frame-${i}`}))},{background:{kind:'video'}},{background:{kind:'video',desktopAssetId:'https://unverified.example/video.mp4'}},{background:{kind:'image',desktopAssetId:'ignored-video'}},{poster:{assetId:'poster',alt:''}},{navigationLabel:'  '}])assert.equal(homepageHeroSchema.safeParse({...hero,...patch}).success,false);
 assert.equal(homepageHeroSchema.safeParse(hero).success,true);
});
