import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rename,utimes,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildVersion} from '../scripts/build-version.mjs';

test('download build fingerprint follows source/config/dependencies, not timestamps or output files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'squeaklite-build-id-'));
 try {
  for(const dir of ['src','scripts','deployment','dist','dist-singlefile'])await mkdir(join(root,dir));
  for(const file of ['index.html','package.json','package-lock.json','vite.config.js','src/app.ts','scripts/build.mjs','deployment/apache-cache.htaccess'])await writeFile(join(root,file),'initial');
  const first=await buildVersion(root);assert.match(first,/^[a-f0-9]{16}$/);assert.equal(await buildVersion(root),first);
  await utimes(join(root,'src/app.ts'),1,1);await writeFile(join(root,'dist/index.html'),'generated');await writeFile(join(root,'dist-singlefile/index.html'),'generated');assert.equal(await buildVersion(root),first);
  await writeFile(join(root,'src/app.ts'),'new source');const second=await buildVersion(root);assert.notEqual(second,first);
  await rename(join(root,'src/app.ts'),join(root,'src/renamed.ts'));const third=await buildVersion(root);assert.notEqual(third,second);
  await writeFile(join(root,'package-lock.json'),'new dependencies');assert.notEqual(await buildVersion(root),third);
 }finally{await rm(root,{recursive:true,force:true});}
});
