import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appDownloadHref} from '../src/app-download.ts';

test('portable build links to its own URL after rename, route change or download',()=>{
  for(const page of [
    'file:///Users/demo/My%20SQLite%20app.html#/data?table=customers',
    'https://example.test/tools/renamed.html#/query',
    'http://localhost:8000/dist-singlefile/index.html#/files',
  ]) {
    assert.equal(appDownloadHref(page,true),page.split('#')[0]);
  }
});

test('split build uses relative download paths for hosted roots and sibling build folders',()=>{
  for(const [page,relative,expected] of [
    ['https://example.test/nested/squeaklite/#/query','./dist-singlefile/index.html','https://example.test/nested/squeaklite/dist-singlefile/index.html'],
    ['https://example.test/nested/index.html#/files','./dist-singlefile/index.html','https://example.test/nested/dist-singlefile/index.html'],
    ['http://localhost:8000/dist/index.html#/query','../dist-singlefile/index.html','http://localhost:8000/dist-singlefile/index.html'],
    ['http://localhost:8000/nested/dist/#/data','../dist-singlefile/index.html','http://localhost:8000/nested/dist-singlefile/index.html'],
  ]) {
    assert.equal(appDownloadHref(page,false),relative);
    assert.equal(new URL(relative,page).href,expected);
  }
});

test('HTTP downloads use a build version while portable file URLs remain self links',()=>{
  assert.equal(appDownloadHref('https://example.test/squeaklite/#/data',false,'abc123'),'./dist-singlefile/index.html?v=abc123');
  assert.equal(appDownloadHref('http://localhost/dist/index.html#/query',false,'build with spaces'),'../dist-singlefile/index.html?v=build%20with%20spaces');
  assert.equal(appDownloadHref('https://example.test/renamed.html?lang=en&v=old#/data',true,'new'),'https://example.test/renamed.html?lang=en&v=new');
  assert.equal(appDownloadHref('file:///tmp/My%20App.html#/query',true,'new'),'file:///tmp/My%20App.html');
});
