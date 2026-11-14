import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,cp,mkdir,symlink,rm,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {buildVersion} from '../scripts/build-version.mjs';
const root=resolve(import.meta.dirname,'..');

test('split HTML stays thin, cache policy ships only with split output, and both bundles carry the build version',async()=>{
 const html=await readFile(join(root,'dist/index.html'),'utf8');assert.ok(Buffer.byteLength(html)<1500);assert.match(html,/<script[^>]+src="\.\/assets\/[^"/]+-[\w-]{8,}\.js"/);for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))assert.equal(match[1].trim(),'');
 assert.equal(await readFile(join(root,'dist/.htaccess'),'utf8'),await readFile(join(root,'deployment/apache-cache.htaccess'),'utf8'));
 assert.deepEqual(await readdir(join(root,'dist-singlefile')),['index.html']);
 const version=await buildVersion(root),js=html.match(/src="\.\/([^\"]+\.js)"/)[1];
 assert.ok((await readFile(join(root,'dist',js),'utf8')).includes(version),'Split app has a versioned download link');
 assert.ok((await readFile(join(root,'dist-singlefile/index.html'),'utf8')).includes(version),'Portable app versions its HTTP self link');
});

const httpd=['/usr/sbin/httpd','/usr/sbin/apache2'].find(existsSync);
const modules=['/usr/libexec/apache2','/usr/lib/apache2/modules'].find(p=>existsSync(join(p,'mod_headers.so'))&&existsSync(join(p,'mod_mpm_event.so'))&&existsSync(join(p,'mod_unixd.so')));
test('Apache revalidates both HTML URLs and caches only successful hashed assets immutably',{skip:!httpd||!modules},async()=>{
 const temp=await mkdtemp(join(tmpdir(),'squeaklite-apache-'));let child;
 try {
  const www=join(temp,'www');await mkdir(www);
  await cp(join(root,'dist'),join(www,'squeaklite'),{recursive:true});await mkdir(join(www,'dist-singlefile'));
  await cp(join(root,'dist-singlefile/index.html'),join(www,'dist-singlefile/index.html'));await cp(join(root,'dist/.htaccess'),join(www,'dist-singlefile/.htaccess'));
  await symlink('../dist-singlefile',join(www,'squeaklite/dist-singlefile'));
  const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
  const config=join(temp,'httpd.conf');
  await writeFile(config,`ServerRoot "${temp}"
ServerName 127.0.0.1
Listen 127.0.0.1:${port}
PidFile "${temp}/httpd.pid"
ErrorLog "${temp}/error.log"
LoadModule mpm_event_module "${modules}/mod_mpm_event.so"
LoadModule unixd_module "${modules}/mod_unixd.so"
LoadModule authz_core_module "${modules}/mod_authz_core.so"
LoadModule dir_module "${modules}/mod_dir.so"
LoadModule headers_module "${modules}/mod_headers.so"
LoadModule mime_module "${modules}/mod_mime.so"
TypesConfig /dev/null
AddType text/html .html
AddType text/css .css
AddType application/javascript .js
AddType application/wasm .wasm
DocumentRoot "${www}"
DirectoryIndex index.html
<Directory "${www}">
  Require all granted
  AllowOverride FileInfo
  Options FollowSymLinks
</Directory>
`);
  child=spawn(httpd,['-f',config,'-DFOREGROUND'],{stdio:['ignore','ignore','pipe']});let logs='';child.stderr.on('data',chunk=>logs+=chunk);let spawnError;child.on('error',e=>spawnError=e);
  const base=`http://127.0.0.1:${port}`;let ready=false;
  for(let i=0;i<60;i++){
   if(spawnError)throw spawnError;
   if(child.exitCode!==null)throw new Error(logs+'\n'+await readFile(join(temp,'error.log'),'utf8').catch(()=>''));
   try{const response=await fetch(base+'/squeaklite/');if(response.status===200){ready=true;break;}}catch{}
   await new Promise(r=>setTimeout(r,50));
  }
  assert.ok(ready,logs+'\n'+await readFile(join(temp,'error.log'),'utf8').catch(()=>''));
  for(const path of ['/squeaklite/','/squeaklite/index.html','/dist-singlefile/index.html?v=first','/squeaklite/dist-singlefile/index.html?v=second']){
   const response=await fetch(base+path);assert.equal(response.status,200,path);assert.equal(response.headers.get('cache-control'),'no-cache',path);
  }
  const shell=await fetch(base+'/squeaklite/');const revalidated=await fetch(base+'/squeaklite/',{headers:{'If-None-Match':shell.headers.get('etag')}});assert.equal(revalidated.status,304);assert.equal(revalidated.headers.get('cache-control'),'no-cache');
  const assets=await readdir(join(root,'dist/assets'));
  for(const asset of assets){
   const response=await fetch(base+'/squeaklite/assets/'+asset,{method:'HEAD'});assert.equal(response.status,200,asset);assert.equal(response.headers.get('cache-control'),'public, max-age=31536000, immutable',asset);
  }
  const asset=assets.find(p=>p.endsWith('.js')),first=await fetch(base+'/squeaklite/assets/'+asset);
  const cached=await fetch(base+'/squeaklite/assets/'+asset,{headers:{'If-None-Match':first.headers.get('etag')}});assert.equal(cached.status,304);assert.equal(cached.headers.get('cache-control'),'public, max-age=31536000, immutable');
  const missing=await fetch(base+'/squeaklite/assets/missing-Abcd1234.js');assert.equal(missing.status,404);assert.equal(missing.headers.get('cache-control'),'no-cache');
 }finally{
  if(child&&child.exitCode===null){const exit=once(child,'exit');child.kill('SIGTERM');await exit;}
  await rm(temp,{recursive:true,force:true});
 }
});
