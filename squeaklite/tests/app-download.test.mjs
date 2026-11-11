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
