import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import init from 'sql.js';
import {Engine} from '../src/engine.mjs';
import {WorkspaceStorage} from '../src/persistence.ts';

// OPFS File objects become unreadable when their backing entry is removed.
// Plain in-memory Blobs would hide snapshot-retirement bugs.
function environment() {
  let failWrites=false,locked=false;
  const waiters=[];
  const release=()=>{locked=false;waiters.shift()?.();};
  class FileView extends Blob {
    constructor(data, valid) { super([data]); this.valid=valid; }
    assertReadable() { if (!this.valid()) throw new DOMException('Backing entry was removed','NotFoundError'); }
    async arrayBuffer() { this.assertReadable(); return super.arrayBuffer(); }
    async text() { this.assertReadable(); return super.text(); }
    slice(...args) { this.assertReadable(); return new FileView(super.slice(...args),this.valid); }
  }
  class Directory {
    nodes=new Map();
    alive=true;
    retire() { this.alive=false; for(const node of this.nodes.values()) if(node instanceof Directory) node.retire(); }
    async getDirectoryHandle(name,{create=false}={}) {
      if (!this.nodes.has(name) && create) this.nodes.set(name,new Directory());
      if (!this.nodes.has(name)) throw new DOMException('Missing','NotFoundError');
      return this.nodes.get(name);
    }
    async getFileHandle(name,{create=false}={}) {
      if (!this.nodes.has(name) && create) this.nodes.set(name,new Blob());
      if (!this.nodes.has(name)) throw new DOMException('Missing','NotFoundError');
      return {
        getFile:async()=>{
          const data=this.nodes.get(name);
          if(!data || !this.alive) throw new DOMException('Missing','NotFoundError');
          return new FileView(data,()=>this.alive && this.nodes.get(name)===data);
        },
        createWritable:async()=>{
          let value;
          return {
            write:async data=>{if(failWrites) throw new DOMException('Full','QuotaExceededError');value=new Blob([data instanceof Blob ? await data.arrayBuffer() : data]);},
            close:async()=>this.nodes.set(name,value),
            abort:async()=>{},
          };
        },
      };
    }
    async removeEntry(name) { const node=this.nodes.get(name); if(node instanceof Directory) node.retire(); this.nodes.delete(name); }
  }
  const root=new Directory();
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{
    storage:{getDirectory:async()=>root},
    locks:{request:(name,options,callback)=>new Promise((resolve,reject)=>{
      const grant=()=>{
        locked=true;
        try { Promise.resolve(callback({})).then(resolve,reject); }
        catch(error){reject(error);}
      };
      if(!locked)grant();
      else if(options.ifAvailable) Promise.resolve(callback(null)).then(resolve,reject);
      else waiters.push(grant);
    })},
  }});
  Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'https://example.test'}});
  return {root,fail:()=>failWrites=true,release};
}
const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
const originalLocation=Object.getOwnPropertyDescriptor(globalThis,'location');
afterEach(()=>{
  if(originalNavigator) Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;
  if(originalLocation) Object.defineProperty(globalThis,'location',originalLocation);else delete globalThis.location;
});

test('opaque/file origins stay memory-only without accessing storage',async()=>{
  environment();
  const storage=new WorkspaceStorage();
  assert.equal(await storage.initialize({getDirectory:()=>{throw Error('Should not be called');}},'null'),null);
  assert.equal(storage.status.mode,'memory');
});

test('OPFS snapshot restores multiple databases, companion bytes, active DB and edits',async()=>{
  const env=environment(),SQL=await init(),engine=new Engine(SQL);
  engine.persistence=new WorkspaceStorage();
  await engine.initialize();
  engine.query({sql:"UPDATE customers SET name='Autosaved' WHERE id=1",confirmed:true});
  const other=new SQL.Database();other.run('CREATE TABLE second(id INTEGER)');
  engine.files.set('nested/second.db',other.export());other.close();
  engine.files.set('binary.dat',new Uint8Array([0,255,1]));
  await engine.storageSave();
  assert.equal(engine.persistence.status.state,'saved');
  env.release();
  const next=new Engine(SQL);next.persistence=new WorkspaceStorage();
  const restored=await next.initialize();
  assert.equal(restored.restored,true);
  assert.equal(restored.databases.length,2);
  assert.equal(restored.active,'commerce.db');
  assert.equal(next.values('SELECT name FROM customers WHERE id=1')[0].name,'Autosaved');
  assert.deepEqual(new Uint8Array(await next.files.get('binary.dat').arrayBuffer()),new Uint8Array([0,255,1]));
  assert.ok(restored.dirty.includes('commerce.db'));
  engine.db.close();next.db.close();
});

test('failed autosave preserves last committed snapshot and reports an error',async()=>{
  const env=environment(),storage=new WorkspaceStorage();
  await storage.initialize();
  await storage.save(()=>({active:'db',dirty:[],entries:[{path:'db',data:new Uint8Array([1])}]}));
  env.fail();
  await storage.save(()=>({active:'db',dirty:[],entries:[{path:'db',data:new Uint8Array([2])}]}));
  assert.equal(storage.status.state,'error');
  env.release();
  const restored=await new WorkspaceStorage().initialize();
  assert.deepEqual(new Uint8Array(await restored.entries[0].data.arrayBuffer()),new Uint8Array([1]));
});

test('a second tab cannot overwrite the first tab workspace',async()=>{
  environment();
  await new WorkspaceStorage().initialize();
  const other=new WorkspaceStorage();
  assert.equal(await other.initialize(),null);
  assert.match(other.status.message,/waiting for workspace access/);
});

test('corrupt HEAD is preserved and cannot be silently overwritten by the demo',async()=>{
  const env=environment(),dir=await env.root.getDirectoryHandle('squeaklite-v1',{create:true});
  const writer=await (await dir.getFileHandle('HEAD.json',{create:true})).createWritable();
  await writer.write('broken');await writer.close();
  const storage=new WorkspaceStorage();await storage.initialize();
  await storage.save(()=>{throw Error('Must not snapshot');});
  assert.equal(storage.status.state,'error');
  assert.equal(await (await (await dir.getFileHandle('HEAD.json')).getFile()).text(),'broken');
});

test('an open write transaction survives a failed snapshot and can still be rolled back',async()=>{
  environment();const SQL=await init(),engine=new Engine(SQL);engine.persistence=new WorkspaceStorage();await engine.initialize();
  const name=engine.values('SELECT name FROM customers WHERE id=1')[0].name;
  engine.query({sql:"BEGIN; UPDATE customers SET name='Pending' WHERE id=1",confirmed:true});
  await engine.storageSave();
  assert.equal(engine.persistence.status.state,'error');
  engine.query({sql:'ROLLBACK',confirmed:true});
  assert.equal(engine.values('SELECT name FROM customers WHERE id=1')[0].name,name);
  await engine.storageSave();assert.equal(engine.persistence.status.state,'saved');
  engine.db.close();
});


test('waiting tab is notified when the owner closes without polling or overwriting either workspace',async()=>{
  const env=environment(),owner=new WorkspaceStorage();
  await owner.initialize();
  await owner.save(()=>({active:'saved.db',dirty:[],entries:[{path:'saved.db',data:new Uint8Array([7])}]}));
  const events=[],waiting=new WorkspaceStorage(status=>events.push(status));
  assert.equal(await waiting.initialize(),null);
  assert.equal(events.length,0);
  env.release();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(events.length,1);
  assert.equal(waiting.status.state,'available');
  assert.equal(waiting.status.canRecover,true);
  assert.equal(waiting.status.mode,'memory');
  await waiting.save(()=>{throw Error('Memory edits must never be snapshotted automatically');});
  assert.equal(waiting.status.state,'available');
  env.release();
  const restored=await new WorkspaceStorage().initialize();
  assert.deepEqual(new Uint8Array(await restored.entries[0].data.arrayBuffer()),new Uint8Array([7]));
});

test('lock API errors are not reported as contention with another tab',async()=>{
  environment();
  navigator.locks.request=async()=>{throw new DOMException('Unavailable','SecurityError');};
  const storage=new WorkspaceStorage();
  assert.equal(await storage.initialize(),null);
  assert.equal(storage.status.state,'error');
  assert.doesNotMatch(storage.status.message,/another tab|waiting for workspace/);
});


test('restored file handles are rebound before retiring snapshots, across repeated edits, switches and exports',async()=>{
  const env=environment(),SQL=await init(),engine=new Engine(SQL);
  engine.persistence=new WorkspaceStorage();await engine.initialize();
  const other=new SQL.Database();other.run("CREATE TABLE notes(id INTEGER PRIMARY KEY,body TEXT);INSERT INTO notes VALUES(1,'second db');");
  engine.files.set('nested/other.db',other.export());other.close();
  engine.files.set('binary.dat',new Uint8Array([0,255,2]));await engine.storageSave();env.release();
  const restored=new Engine(SQL);restored.persistence=new WorkspaceStorage();assert.equal((await restored.initialize()).restored,true);
  const oldCompanion=restored.files.get('README.txt');
  for(let i=0;i<3;i++) {
    restored.edit({table:'customers',action:'update',key:{id:1},values:{name:'Edited '+i}});await restored.storageSave();
    assert.equal(restored.persistence.status.state,'saved');
    assert.equal((await restored.workspace()).databases.length,2);
    assert.match((await restored.readFile({path:'README.txt'})).text,/sample workspace/);
    const archive=await restored.export();assert.ok(archive.bytes.length>0);
  }
  await assert.rejects(()=>oldCompanion.arrayBuffer(),{name:'NotFoundError'});
  assert.deepEqual(new Uint8Array(await restored.files.get('binary.dat').arrayBuffer()),new Uint8Array([0,255,2]));
  await restored.open('nested/other.db');assert.equal(restored.browse({table:'notes'}).rows[0][1],'second db');await restored.storageSave();
  await restored.open('commerce.db');assert.equal(restored.values('SELECT name FROM customers WHERE id=1')[0].name,'Edited 2');
  const root=await env.root.getDirectoryHandle('squeaklite-v1');assert.equal([...root.nodes.keys()].filter(k=>k.startsWith('snapshot-')).length,1);
  engine.db.close();restored.db.close();
});
