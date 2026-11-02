import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('homepage identity migration preserves legacy rows without accepting new invalid routes',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create schema cms; create table cms.records(id integer primary key,content_type text not null,path text,internal_title text); insert into cms.records values(1,'homepage','/legacy-home','Keep legacy copy'),(2,'homepage',null,'Keep unassigned copy');");
  await db.exec(await readFile(new URL('../database/cms/111-homepage-identity.sql',import.meta.url),'utf8'));
  assert.deepEqual((await db.query('select path,internal_title from cms.records order by id')).rows,[{path:'/legacy-home',internal_title:'Keep legacy copy'},{path:null,internal_title:'Keep unassigned copy'}]);
  for(const route of [null,'/home','/Home','//',''])await assert.rejects(db.query("insert into cms.records values(3,'homepage',$1,'Invalid')",[route]),/cms_homepage_root_path/);
  await assert.rejects(db.query("update cms.records set internal_title='Edit without migration' where id=1"),/cms_homepage_root_path/);
  await db.exec("insert into cms.records values(3,'homepage','/','Homepage'),(4,'page','/about','About'),(5,'settings',null,'Settings');");
  await assert.rejects(db.exec("update cms.records set path='/elsewhere' where id=3"),/cms_homepage_root_path/);
  await assert.rejects(db.exec("update cms.records set content_type='homepage' where id=4"),/cms_homepage_root_path/);
  assert.equal((await db.query("select internal_title from cms.records where id=1")).rows[0].internal_title,'Keep legacy copy');
 }finally{await db.close();}
});
