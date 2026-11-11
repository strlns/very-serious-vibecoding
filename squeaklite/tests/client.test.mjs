import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./helpers/worker-loader.mjs', import.meta.url);

async function client(label) {
  const sent = [];
  const worker = { postMessage: message => sent.push(message) };
  globalThis.__squeakliteTestWorker = worker;
  const { rpc } = await import(`../src/client.ts?case=${label}`);
  return { rpc, sent, worker };
}

test('RPC pairs out-of-order replies and preserves worker errors', async () => {
  const { rpc, sent, worker } = await client('replies');
  const first = rpc('demo');
  const second = rpc('workspace');
  worker.onmessage({ data: { id: sent[1].id, result: { count: 123n } } });
  assert.deepEqual(await second, { count: 123n });
  const rejected = assert.rejects(first, /Invalid database/);
  worker.onmessage({ data: { id: sent[0].id, error: 'Invalid database' } });
  await rejected;
});

test('a failed worker rejects pending and future calls instead of hanging', async () => {
  const { rpc, worker, sent } = await client('failure');
  const waiting = rpc('demo');
  const rejected = assert.rejects(waiting, /Worker crashed/);
  worker.onerror({ message: 'Worker crashed' });
  await rejected;
  await assert.rejects(rpc('workspace'), /Worker crashed/);
  assert.equal(sent.length, 1);
});

test('structured-clone errors reject only their request', async () => {
  const { rpc, sent, worker } = await client('clone');
  worker.postMessage = () => { throw new Error('Cannot clone'); };
  await assert.rejects(rpc('demo'), /Cannot clone/);
  worker.postMessage = message => sent.push(message);
  const next = rpc('workspace');
  worker.onmessage({ data: { id: sent[0].id, result: 'still working' } });
  assert.equal(await next, 'still working');
});


test('worker status events reach subscribers without an RPC request',async()=>{
  const sent=[],worker={postMessage:message=>sent.push(message)};
  globalThis.__squeakliteTestWorker=worker;
  const {subscribeStorage}=await import('../src/client.ts?case=status-events');
  const events=[],unsubscribe=subscribeStorage(status=>events.push(status));
  const status={mode:'memory',state:'available',canRecover:true,message:'Storage available'};
  worker.onmessage({data:{persistence:status}});
  assert.deepEqual(events,[status]);
  unsubscribe();worker.onmessage({data:{persistence:status}});
  assert.equal(events.length,1);
});
