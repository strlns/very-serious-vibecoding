import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completions} from '../src/sql-completion.mjs';
const objects=[{name:'customers',type:'table',columns:[{name:'id'},{name:'name'},{name:'email'}]},{name:'order details',type:'view',columns:[{name:'item name'},{name:'amount'}]}];
const find=(s,p=s.length)=>completions(s,p,objects,'customers');
test('table and aliased column completions use the schema and quote special names',()=>{
 assert.equal(find('SELECT * FROM cust')[0].insert,'customers');assert.equal(find('SELECT * FROM cust')[0].suffix,'omers');assert.equal(find('SELECT * FROM order')[0].insert,'"order details"');assert.equal(find('SELECT * FROM "cust')[0].insert,'"customers"');
 const sql='SELECT c.na FROM customers AS c';assert.equal(find(sql,11)[0].insert,'name');assert.equal(find('SELECT c. FROM customers c',9)[0].label,'id');assert.equal(find('SELECT email FROM customers WHERE na')[0].insert,'name');
 assert.equal(find('SELECT * FROM customers ORDER B')[0].insert,'BY');assert.ok(find('SEL').some(x=>x.insert==='SELECT'));assert.ok(find('SELECT * FR').some(x=>x.insert==='FROM'));
});
test('completion avoids literals, comments, parameters and mid-token edits and stays bounded',()=>{
 for(const s of ["SELECT 'cust",'SELECT 1 -- cust','SELECT /* cust','SELECT :na'])assert.deepEqual(find(s),[]);
 assert.deepEqual(find('SELECT * FROM customers',18),[]);assert.equal(find('SELECT c. FROM customers c',9).length,3);assert.ok(completions('SELECT ',7,Array.from({length:10000},(_,i)=>({name:'t'+i,type:'table',columns:[{name:'c'+i}]}))).length<=8);
});

test('keywords wait for a letter; explicit invocation offers only the current grammar context',()=>{
 assert.deepEqual(find(''),[]);assert.ok(find('S').some(c=>c.insert==='SELECT'));
 assert.ok(completions('',0,objects,'customers',{manual:true}).some(c=>c.insert==='SELECT'));
 const names=s=>completions(s,s.length,objects,'customers',{manual:true}).map(c=>c.insert);
 assert.ok(!names('SELECT * ').includes('AS'));assert.ok(names('SELECT * ').includes('FROM'));
 assert.deepEqual(names('SELECT * FROM customers WHERE ').sort(),['email','id','name']);
 assert.deepEqual(names('SELECT * FROM customers ORDER BY name ').sort(),['ASC','DESC','LIMIT']);
 assert.deepEqual(names('SELECT * FROM customers LIMIT '),[]);assert.deepEqual(names('SELECT name AS '),[]);
 assert.deepEqual(names('WITH c AS (SELECT * FROM customers) SELECT '),[]);assert.deepEqual(names('SELECT * FROM (SELECT * FROM customers) x WHERE '),[]);
 assert.deepEqual(names('SELECT * FROM customers WHERE name FR'),[]);assert.deepEqual(names('SELECT * FROM customers WHERE id ! '),[]);
 assert.ok(names('SELECT * FROM customers WHERE id >= ').includes('id'));
});

test('column suggestions resolve aliases and qualify ambiguous join columns',()=>{
 const sql='SELECT id FROM customers c JOIN customers m ON c.id=m.id WHERE na';
 const options=find(sql);assert.deepEqual(options.map(c=>c.insert),['c.name','m.name']);
 const invalid='SELECT customers.na FROM customers c';assert.deepEqual(find(invalid,19),[]);
 assert.equal(find('SELECT * FROM main.cust')[0].insert,'customers');for(const prefix of ['UPDATE cust','INSERT INTO cust','DELETE FROM cust'])assert.equal(find(prefix)[0].insert,'customers');
});

test('offered completions compile in SQLite at representative valid positions',async()=>{
 const {default:init}=await import('sql.js');const SQL=await init(),db=new SQL.Database();db.run('CREATE TABLE customers(id INTEGER,name TEXT,email TEXT);CREATE VIEW "order details" AS SELECT id AS "item name",id AS amount FROM customers;');
 const finish={AS:' x',JOIN:' customers c','LEFT JOIN':' customers c','INNER JOIN':' customers c','CROSS JOIN':' customers c',WHERE:' id>0','GROUP BY':' id','ORDER BY':' id',LIMIT:' 3',BY:' id',DESC:'',ASC:'',AND:' id<4',OR:' id<4','IS NULL':'','IS NOT NULL':'',IN:' (1)',LIKE:" 'x%'"};
 for(const prefix of ['SELECT * FROM cust','SELECT * FROM customers WH','SELECT * FROM customers GROUP B','SELECT * FROM customers ORDER B','SELECT * FROM customers ORDER BY name D','SELECT * FROM customers WHERE id > 0 A','SELECT * FROM customers WHERE name I','SELECT * FROM customers WHERE name L','SELECT * FROM customers ']){
  const options=completions(prefix,prefix.length,objects,'customers',{manual:true});assert.ok(options.length,prefix);for(const c of options){const sql=prefix.slice(0,c.from)+c.insert+(c.kind==='keyword'?finish[c.insert]||'':'');const statement=db.prepare(sql);statement.free();}
 }
 const middle='SELECT c.na FROM customers c';for(const c of completions(middle,11,objects)){const statement=db.prepare(middle.slice(0,c.from)+c.insert+middle.slice(c.to));statement.free();}
 assert.deepEqual(completions('SELECT name FROM customers',7,objects,'customers',{manual:true}),[]);assert.ok(!completions('SELECT name  FROM customers',12,objects,'customers',{manual:true}).some(c=>c.insert==='FROM'));db.close();
});
