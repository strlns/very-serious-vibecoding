import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../src/worker-handler.mjs';
test('worker saves mutations and partial failed scripts, but skips read-only queries',async()=>{
  globalThis.self=globalThis;
  let saves=0;
  const engine={operationVersion:0,storageSave:async()=>{saves++;},
    edit:()=>42,
    query:({write,fail})=>{if(write)engine.operationVersion++;if(fail)throw Error('later statement failed');return 'ok';},
  };
  handle(engine);
  let id=0;
  const send=(method,args)=>new Promise(resolve=>{globalThis.postMessage=resolve;globalThis.onmessage({data:{id:++id,method,args}});});
  assert.equal((await send('edit',{})).result,42);
  assert.equal(saves,1);
  await send('query',{write:false});assert.equal(saves,1);
  assert.match((await send('query',{write:true,fail:true})).error,/later statement/);
  assert.equal(saves,2);
});
