import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle} from '../server/geoweb-battle/engine.mjs';
import {setPlayerFocus} from '../server/spell-battle/player-focus.mjs';
const identity=id=>({id,subject:id,name:id,kind:'browser'});
test('a paused expert player keeps their question clock while the other participant keeps playing',()=>{
 let now=1000;
 const game=new Battle({country:[{id:'x',mode:'country',answers:['정답']}]},{now:()=>now});
 const room=game.create(identity('host'));
 game.configure(room.code,'host',{difficulty:'country',level:'expert',seconds:60,rounds:1});
 for(const id of ['one','two']){game.join(room.code,identity(id));game.ready(room.code,id,true);}
 game.start(room.code,'host');now+=3000;
 const one=game.view(room,'one').question;
 game.view(room,'two');now+=1000;
 setPlayerFocus(game,room,'one',true);
 now+=6000;
 assert.equal(game.view(room,'one').question.index,one.index);
 assert.equal(game.view(room,'two').question.index,1);
 assert.throws(()=>game.answer(room.code,'one','정답',one.index),/계속/);
 setPlayerFocus(game,room,'one',false);
 assert.equal(game.view(room,'one').question.startedAt,one.startedAt+6000);
 assert.equal(game.answer(room.code,'one','정답',one.index).correct,true);
 assert.equal(room.phase,'playing');
});
