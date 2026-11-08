import {readFile} from 'node:fs/promises';
import {transformWithOxc} from 'vite';
export async function resolve(specifier,context,next){if(specifier==='./client.ts'&&['/src/App.jsx','/src/SchemaExplorer.jsx','/src/FileBrowser.jsx'].some(p=>context.parentURL?.endsWith(p)))return {url:new URL('./rpc.mjs',import.meta.url).href,shortCircuit:true};return next(specifier,context);}
export async function load(url,context,next){if(/\.(jsx|tsx|ts)$/.test(url)){const source=await readFile(new URL(url),'utf8');const {code}=await transformWithOxc(source,new URL(url).pathname);return {format:'module',source:code,shortCircuit:true};}return next(url,context);}
