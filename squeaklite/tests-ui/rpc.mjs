import init from 'sql.js';
import {Engine} from '../src/engine.mjs';
export const engine=new Engine(await init());
export const calls=[];
export async function rpc(method,args){calls.push({method,args});return engine[method](args);}

export const subscribeStorage = () => () => {};
