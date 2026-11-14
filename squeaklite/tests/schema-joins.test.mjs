import {test} from 'node:test';
import assert from 'node:assert/strict';
import init from 'sql.js';
import {Engine} from '../src/engine.mjs';
import {columnPolicy} from '../src/row-schema.ts';
import {joinRelations} from '../src/join-relations.ts';
import {buildQuery} from '../src/sql.ts';

test('form policies cover NOT NULL, rowid aliases, nullable legacy PKs, strict and WITHOUT ROWID',async()=>{
 const e=new Engine(await init());await e.empty();e.query({confirmed:true,sql:"CREATE TABLE ordinary(id INTEGER PRIMARY KEY,title TEXT NOT NULL,note TEXT,n INTEGER NOT NULL DEFAULT 3, doubled TEXT AS (title||title));CREATE TABLE legacy(id TEXT PRIMARY KEY);CREATE TABLE composite(a TEXT,b TEXT,PRIMARY KEY(a,b)) WITHOUT ROWID;CREATE TABLE strict_pk(id TEXT PRIMARY KEY) STRICT;CREATE TABLE descending(id INTEGER PRIMARY KEY DESC);"});
 const policy=(table,column)=>{const o=e.schema(table);return columnPolicy(o,o.columns.find(c=>c.name===column));};
 assert.deepEqual(policy('ordinary','id'),{nullable:false,autoKey:true,generated:false,required:false});
 assert.equal(policy('ordinary','title').required,true);assert.equal(policy('ordinary','note').nullable,true);assert.equal(policy('ordinary','n').required,false);assert.equal(policy('ordinary','doubled').generated,true);
 assert.equal(policy('legacy','id').nullable,true);assert.equal(policy('descending','id').nullable,true);assert.equal(policy('composite','a').required,true);assert.equal(policy('strict_pk','id').required,true);e.db.close();
});
test('join relationships handle forward, reverse, composite and implicit PK references',async()=>{
 const e=new Engine(await init());await e.empty();e.query({confirmed:true,sql:"CREATE TABLE parent(a TEXT,b INTEGER,PRIMARY KEY(a,b)) WITHOUT ROWID;CREATE TABLE child(id INTEGER PRIMARY KEY,x TEXT,y INTEGER,FOREIGN KEY(x,y) REFERENCES parent);INSERT INTO parent VALUES('a',1),('b',2);INSERT INTO child VALUES(1,'a',1),(2,'a',1);"});
 const objects=e.meta().objects;const forward=joinRelations(objects,'child','parent'),reverse=joinRelations(objects,'parent','child');
 assert.deepEqual(forward[0].pairs,[{from:'x',to:'a'},{from:'y',to:'b'}]);assert.deepEqual(reverse[0].pairs,[{from:'a',to:'x'},{from:'b',to:'y'}]);
 const options={table:'parent',columns:['a','child.id'],joins:[{table:'child',source:'parent',type:'LEFT',from:'a',to:'x',pairs:reverse[0].pairs}],limit:null};
 assert.equal(e.query({sql:buildQuery(options)}).results[0].rows.length,3);options.joins[0].type='INNER';assert.equal(e.query({sql:buildQuery(options)}).results[0].rows.length,2);
 const summary=buildQuery({...options,columns:['child.id'],aggregate:'COUNT',group:'a'});assert.match(summary,/SELECT "parent"\."a", COUNT\(\*\)/);assert.equal(e.query({sql:summary}).results[0].rows[0][1],2n);e.db.close();
});
test('manual chained joins quote unusual names and only allow known join types',async()=>{
 const e=new Engine(await init());await e.empty();e.query({confirmed:true,sql:'CREATE TABLE "base table"("key" INTEGER);CREATE TABLE "second.table"("key" INTEGER,"link" INTEGER);CREATE TABLE "third"("key" INTEGER);INSERT INTO "base table" VALUES(1);INSERT INTO "second.table" VALUES(1,2);INSERT INTO "third" VALUES(2);'});
 const sql=buildQuery({table:'base table',columns:['third.key'],joins:[{table:'second.table',from:'key',to:'key',type:'INNER'},{source:'second.table',table:'third',from:'link',to:'key',type:'DROP'}]});
 assert.match(sql,/LEFT JOIN "third" ON "second.table"\."link"/);assert.equal(e.query({sql}).results[0].rows[0][0],2n);e.db.close();
});
