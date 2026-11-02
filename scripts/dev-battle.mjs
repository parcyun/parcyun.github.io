import {createServer} from 'node:net';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
async function freePort(){const socket=createServer();await new Promise((resolve,reject)=>{socket.once('error',reject);socket.listen(0,'127.0.0.1',resolve)});const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));return port;}
const apiPort=await freePort(),webPort=await freePort();
const env={...process.env,ASTRO_DEV_BACKGROUND:'1',GEOWEB_LOCAL_BATTLE:'1',CONQUEST_STORAGE:'sqlite',CONQUEST_HOST:'127.0.0.1',CONQUEST_LOCAL_API:`http://127.0.0.1:${apiPort}`,CONQUEST_ORIGINS:`http://127.0.0.1:${webPort}`};
delete env.PUBLIC_CONQUEST_API;
const api=spawn(process.execPath,['server/conquest/server.mjs'],{cwd:root,env:{...env,PORT:String(apiPort)},stdio:'inherit'});
const web=spawn(process.execPath,['node_modules/.bin/astro','dev','--host','127.0.0.1','--port',String(webPort)],{cwd:root,env,stdio:'inherit'});
console.log(`Local-only Battleground: http://127.0.0.1:${webPort}/world-map/battle/`);
let stopping=false;function stop(){if(stopping)return;stopping=true;api.kill();web.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);for(const child of [api,web]){child.on('error',error=>{console.error(error.message);stop();process.exitCode=1;});child.on('exit',code=>{if(code)process.exitCode=code;stop();});}
