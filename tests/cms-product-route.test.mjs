import test from 'node:test';import assert from 'node:assert/strict';
import {productEnvelope,site} from './fixtures/product-public.mjs';
import {projectPublishedProduct} from '../lib/cms/published-product.ts';
import {publishedProductMetadata} from '../lib/cms/product-route.ts';
test('product metadata uses published copy, image URLs and explicit editorial controls',()=>{
 const value=productEnvelope(),profile=projectPublishedProduct(value,value.path,site),meta=publishedProductMetadata(profile);
 assert.equal(meta.title,'Synthetic product');assert.equal(meta.description,'Product summary');assert.equal(meta.alternates.canonical,'/products/synthetic');assert.equal(meta.openGraph.images[0].url,'/api/cms/published/media/fixture-product-image');
 value.payload.seo={...value.payload.seo,title:'Search title',description:'Search description',canonical:'https://example.test/canonical',indexing:'noindex',following:'nofollow',socialTitle:'Social title'};const override=publishedProductMetadata(projectPublishedProduct(value,value.path,site));assert.equal(override.title,'Search title');assert.equal(override.robots.index,false);assert.equal(override.robots.follow,false);assert.equal(override.openGraph.title,'Social title');assert.equal(override.alternates.canonical,'https://example.test/canonical');
});
