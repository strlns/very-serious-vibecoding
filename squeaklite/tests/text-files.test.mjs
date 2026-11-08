import {test} from 'node:test';
import assert from 'node:assert/strict';
import init from 'sql.js';
import {unzipSync} from 'fflate';
import {Engine} from '../src/engine.mjs';
import {TEXT_LIMIT,decodeText,encodeText} from '../src/text-files.ts';
const SQL=await init(),file=(bytes,name)=>new File([bytes],name);
const fixture=async()=>{const e=new Engine(SQL);await e.demo();return e;};
test('a single .db imports directly and folder text previews preserve encoding and binary bytes',async()=>{
 const e=await fixture(),db=(await e.export({databaseOnly:true})).bytes;await e.importFiles([file(db,'alone.db')]);assert.equal((await e.workspace()).databases.length,1);assert.equal(e.browse({table:'customers'}).count,128n);assert.equal((await e.readFile({path:'alone.db'})).kind,'database');
 const original=encodeText('Hello\r\n世界','utf-16be',true),binary=new Uint8Array([0,1,2,255]);await e.importFiles([{file:file(db,'main.db'),path:'folder/main.db'},{file:file(original,'readme.txt'),path:'folder/readme.txt'},{file:file(binary,'image.bin'),path:'folder/image.bin'}]);let info=await e.readFile({path:'folder/readme.txt'});assert.equal(info.text,'Hello\r\n世界');assert.equal(info.encoding,'utf-16be');await e.saveText({path:info.path,token:info.token,text:'Updated\r\n世界'});assert.equal((await e.readFile({path:'folder/image.bin'})).kind,'binary');const archive=unzipSync((await e.export()).bytes);assert.deepEqual(archive['folder/image.bin'],binary);assert.deepEqual(archive['folder/readme.txt'],encodeText('Updated\r\n世界','utf-16be',true));e.db.close();
});
test('large previews are bounded/read-only, BOMs round-trip, and stale drafts never overwrite newer bytes',async()=>{
 const e=await fixture();const large=new TextEncoder().encode('a'.repeat(TEXT_LIMIT-1)+'€'.repeat(100));e.files.set('large.txt',large);const preview=await e.readFile({path:'large.txt'});assert.equal(preview.kind,'text');assert.equal(preview.truncated,true);assert.ok(preview.text.length<=TEXT_LIMIT);await assert.rejects(()=>e.saveText({path:preview.path,text:'clipped',token:preview.token}),/complete text/);
 const info=await e.readFile({path:'README.txt'});e.edit({table:'payments',action:'update',key:{id:1n},values:{method:'cash'}});await assert.rejects(()=>e.saveText({path:info.path,text:'stale',token:info.token}),/changed/);assert.ok((await e.readFile({path:info.path})).text.startsWith('Squeaklite sample'));
 for(const enc of ['utf-8','utf-16le','utf-16be'])assert.equal(decodeText(encodeText('π & text',enc,true)).text,'π & text');e.db.close();
});
test('companion file CRUD is reviewed, cannot overwrite databases, and survives ZIP export',async()=>{
 const e=await fixture();let p=await e.fileReview({action:'create',newPath:'docs/notes.md',text:'# Notes\n<script>text only</script>'});await assert.rejects(()=>e.fileApply(p),/Confirm/);await e.fileApply({...p,confirmed:true});assert.equal((await e.readFile({path:'docs/notes.md'})).kind,'text');p=await e.fileReview({action:'rename',path:'docs/notes.md',newPath:'docs/readme.md'});await e.fileApply({...p,confirmed:true});assert.ok(e.files.has('docs/readme.md'));assert.ok(!e.files.has('docs/notes.md'));await assert.rejects(()=>e.fileReview({action:'rename',path:'docs/readme.md',newPath:'commerce.db'}),/already uses/);await assert.rejects(()=>e.fileReview({action:'drop',path:'commerce.db'}),/database manager/);await assert.rejects(()=>e.fileReview({action:'create',newPath:'../escape.txt'}),/relative/);p=await e.fileReview({action:'drop',path:'docs/readme.md'});await e.fileApply({...p,confirmed:true});assert.ok(!unzipSync((await e.export()).bytes)['docs/readme.md']);assert.ok(e.files.has('commerce.db'));e.db.close();
});
