import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('expert deadline refresh preserves the first letter typed into the previewed next question',async()=>{
 const source=readFileSync('src/components/GeoBattle.jsx','utf8');
 const advance=source.match(/async function advance\(\) \{([\s\S]*?)\n    \}\n    timeout = setTimeout/)[1];
 let answer='ㄱ';
 const context={cancelled:false,expertDeadline:5000,Date:{now:()=>5000},serverOffset:{current:0},expired:false,setAnswer:value=>{answer=value;},setFeedback:()=>{},setClock:()=>{},document:{hidden:false},refreshRoom:async()=>{},roomRef:{current:{question:{startedAt:5000}}},EXPERT_ANSWER_MS:5000,setTimeout:()=>{},timeout:null};
 await vm.runInNewContext(`(async function advance(){${advance}})()`,context);
 assert.equal(answer,'ㄱ');
});
