import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {preview,createServer} from 'vite';
const root=fileURLToPath(new URL('..',import.meta.url));

test('dev and preview deliver the exact portable HTML under nested URLs without transforming it',async()=>{
  const expected=await readFile(new URL('../dist-singlefile/index.html',import.meta.url),'utf8');
  for(const kind of ['preview','dev']) {
    const config={root,base:'/nested/app/',logLevel:'silent',server:{host:'127.0.0.1',port:0},preview:{host:'127.0.0.1',port:0}};
    const server=kind==='preview'?await preview(config):await createServer(config);
    try {
      if(kind==='dev')await server.listen();
      const address=server.httpServer.address();
      const url=`http://127.0.0.1:${address.port}/nested/app/dist-singlefile/index.html`;
      const response=await fetch(url);
      assert.equal(response.status,200);
      assert.match(response.headers.get('content-type'),/text\/html/);
      assert.equal(await response.text(),expected);
      const head=await fetch(url,{method:'HEAD'});
      assert.equal(head.status,200);
      assert.equal(Number(head.headers.get('content-length')),Buffer.byteLength(expected));
    }finally{await server.close();}
  }
});
