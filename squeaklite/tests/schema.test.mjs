import {test} from 'node:test';
import assert from 'node:assert/strict';
import init from 'sql.js';
import {Engine} from '../src/engine.mjs';
const SQL=await init();
const fresh=async()=>{const e=new Engine(SQL);await e.demo();return e;};
const review=(e,r)=>e.schemaReview({...r,databasePath:e.path});
const apply=(e,p)=>e.schemaApply({reviewId:p.reviewId,token:p.token,databasePath:e.path,confirmed:true});
test('view definition CRUD is confirmed, atomic, browsable and exported',async()=>{
 const e=await fresh();let p=review(e,{action:'create',kind:'view',name:'active_people',select:'SELECT id,name FROM customers WHERE id < 3;'});assert.throws(()=>e.schemaApply({...p}),/Confirm/);apply(e,p);assert.equal(e.browse({table:'active_people'}).count,2n);
 p=review(e,{action:'replace',kind:'view',name:'active_people',select:'SELECT id,email FROM customers WHERE id=1;'});apply(e,p);assert.deepEqual(e.browse({table:'active_people'}).columns,['id','email']);
 p=review(e,{action:'replace',kind:'view',name:'active_people',select:'SELECT missing FROM customers;'});assert.throws(()=>apply(e,p),/missing/);assert.deepEqual(e.browse({table:'active_people'}).columns,['id','email']);
 const bytes=(await e.export({databaseOnly:true})).bytes,db=new SQL.Database(bytes);assert.equal(db.exec('SELECT * FROM active_people')[0].values.length,1);db.close();p=review(e,{action:'drop',kind:'view',name:'active_people'});apply(e,p);assert.ok(!e.meta().objects.some(o=>o.name==='active_people'));e.db.close();
});
test('schema edits cannot append SQL or run against a stale review or another database',async()=>{
 const e=await fresh();for(const select of ['SELECT 1; DELETE FROM payments;','SELECT 1; CREATE TABLE leaked(x);']){const p=review(e,{action:'create',kind:'view',name:'bad',select});assert.throws(()=>apply(e,p),/exactly one/);assert.ok(!e.meta().objects.some(o=>o.name==='bad'||o.name==='leaked'));assert.equal(e.browse({table:'payments'}).count,384n);}
 const p=review(e,{action:'create',kind:'table',name:'notes',sql:'CREATE TABLE notes(id INTEGER PRIMARY KEY)'});e.edit({table:'payments',key:{id:1n},action:'update',values:{method:'cash'}});assert.throws(()=>apply(e,p),/changed/);assert.throws(()=>e.schemaApply({...p,confirmed:true,databasePath:'other.db'}),/database/);e.db.close();
});
test('tables, columns, indexes and triggers have full schema mutation paths without losing rows',async()=>{
 const e=await fresh();apply(e,review(e,{action:'create',kind:'table',name:'notes',sql:'CREATE TABLE notes(id INTEGER PRIMARY KEY,title TEXT)'}));e.edit({table:'notes',action:'insert',values:{title:'keep'}});
 apply(e,review(e,{action:'alter',kind:'table',name:'notes',operation:'addColumn',definition:{name:'status',type:'TEXT',defaultValue:"'draft'"}}));assert.equal(e.values('SELECT status FROM notes')[0].status,'draft');
 apply(e,review(e,{action:'alter',kind:'table',name:'notes',operation:'renameColumn',column:'title',newColumn:'body'}));
 apply(e,review(e,{action:'alter',kind:'table',name:'journal',oldName:'notes',operation:'rename'}));assert.equal(e.values('SELECT body FROM journal')[0].body,'keep');
 apply(e,review(e,{action:'create',kind:'index',name:'body_index',sql:'CREATE INDEX body_index ON journal(body)'}));apply(e,review(e,{action:'replace',kind:'index',name:'body_index',sql:'CREATE UNIQUE INDEX body_index ON journal(body)'}));assert.equal(e.schema('journal').indexes[0].unique,1n);
 apply(e,review(e,{action:'create',kind:'trigger',name:'normalize',sql:"CREATE TRIGGER normalize AFTER INSERT ON journal BEGIN UPDATE journal SET body=upper(new.body) WHERE id=new.id; UPDATE journal SET status='ready' WHERE id=new.id; END;"}));e.edit({table:'journal',action:'insert',values:{body:'hello'}});assert.equal(e.values('SELECT body FROM journal WHERE id=2')[0].body,'HELLO');
 apply(e,review(e,{action:'replace',kind:'trigger',name:'normalize',sql:"CREATE TRIGGER normalize AFTER INSERT ON journal BEGIN UPDATE journal SET body=lower(new.body) WHERE id=new.id; END;"}));apply(e,review(e,{action:'drop',kind:'trigger',name:'normalize'}));apply(e,review(e,{action:'drop',kind:'index',name:'body_index'}));apply(e,review(e,{action:'alter',kind:'table',name:'journal',operation:'dropColumn',column:'status'}));assert.equal(e.browse({table:'journal'}).rows.length,2);apply(e,review(e,{action:'drop',kind:'table',name:'journal'}));assert.ok(!e.meta().objects.some(o=>o.name==='journal'));e.db.close();
});
test('view updates preserve INSTEAD OF triggers and drop protects dependencies',async()=>{
 const e=await fresh();e.db.run('CREATE VIEW v AS SELECT id,name FROM customers; CREATE TRIGGER rename_customer INSTEAD OF UPDATE ON v BEGIN UPDATE customers SET name=new.name WHERE id=old.id; END; CREATE VIEW dependent AS SELECT name FROM v;');
 let p=review(e,{action:'replace',kind:'view',name:'v',select:'SELECT id,name FROM customers WHERE id < 10;'});assert.equal(p.preservedTriggers,1);apply(e,p);assert.ok(e.meta().objects.some(o=>o.name==='rename_customer'));e.db.run("UPDATE v SET name='Kept trigger' WHERE id=1");assert.equal(e.values('SELECT name FROM customers WHERE id=1')[0].name,'Kept trigger');p=review(e,{action:'drop',kind:'view',name:'v'});assert.equal(p.blocked,true);assert.ok(p.blockers.some(o=>o.name==='dependent'));assert.throws(()=>apply(e,p),/depend/);
 p=review(e,{action:'drop',kind:'table',name:'customers'});assert.equal(p.blocked,true);assert.ok(p.blockers.some(o=>o.name==='orders'));e.db.close();
});

test('view aliases survive edits, broken imported views stay repairable, and failed drops preserve records',async()=>{
 const e=await fresh();e.db.run('CREATE VIEW aliased(customer_key,customer_title) AS SELECT id,name FROM customers; CREATE VIEW broken AS SELECT nope FROM missing;');assert.match(e.meta().objects.find(o=>o.name==='broken').schemaError,/missing/);apply(e,review(e,{action:'replace',kind:'view',name:'broken',select:'SELECT id FROM customers'}));assert.ok(!e.schema('broken').schemaError);apply(e,review(e,{action:'replace',kind:'view',name:'aliased',columnNames:['customer_key','customer_title'],select:'SELECT id,name FROM customers WHERE id=1'}));assert.deepEqual(e.browse({table:'aliased'}).columns,['customer_key','customer_title']);
 const p=review(e,{action:'alter',kind:'table',name:'customers',operation:'dropColumn',column:'name'});assert.throws(()=>apply(e,p),/name|view/i);assert.equal(e.browse({table:'customers'}).count,128n);assert.ok(e.schema('customers').columns.some(c=>c.name==='name'));e.db.close();
});
test('workspace databases can be created, renamed and deleted with review and ZIP persistence',async()=>{
 const e=await fresh();let p=await e.databaseReview({action:'create',newPath:'nested/new.db'});await assert.rejects(()=>e.databaseApply({...p}),/Confirm/);await e.databaseApply({...p,confirmed:true});assert.equal(e.path,'nested/new.db');assert.equal(e.meta().objects.length,0);e.db.run('CREATE TABLE notes(value TEXT);INSERT INTO notes VALUES(\'keep\')');p=await e.databaseReview({action:'rename',path:e.path,newPath:'nested/renamed.db'});await e.databaseApply({...p,confirmed:true});assert.equal(e.values('SELECT value FROM notes')[0].value,'keep');assert.equal(e.path,'nested/renamed.db');
 p=await e.databaseReview({action:'drop',path:e.path});await e.databaseApply({...p,confirmed:true});assert.equal(e.path,'commerce.db');assert.equal((await e.workspace()).databases.length,1);await assert.rejects(()=>e.databaseReview({action:'drop',path:e.path}),/last one/);await assert.rejects(()=>e.databaseReview({action:'rename',path:e.path,newPath:e.path}),/different/);assert.ok(e.files.has(e.path));await assert.rejects(()=>e.databaseReview({action:'create',newPath:'../bad.db'}),/relative/);await assert.rejects(()=>e.databaseReview({action:'create',newPath:'README.txt'}),/relative/);assert.ok((await e.export()).bytes.length>0);e.db.close();
});
