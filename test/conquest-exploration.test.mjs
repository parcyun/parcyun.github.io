import {test} from 'node:test';import assert from 'node:assert/strict';
import {foundingSuitability,buildRiverEdges,siteCells} from '../src/components/conquestExploration.js';
import {cellAt,neighbors,initialWorld} from '../src/components/conquestEngine.js';
import {PLAYER_COLORS,randomAppearance,validAppearance} from '../src/components/conquestColors.js';
test('founding advice rewards cheap distant coastal temperate plains and rivers without permitting owned/water tiles',()=>{
 const w=initialWorld(),id=cellAt(130,35),plain={kind:'plain',climate:'temperate',attack:0,defense:0};let water=neighbors(id)[0];
 const opts={isLand:c=>c!==water,environment:()=>plain,nearRiver:()=>true};const favorable=foundingSuitability(w,id,opts);assert.equal(favorable.eligible,true);assert.ok(favorable.score>=80);assert.equal(favorable.coast,true);assert.equal(favorable.river,true);
 const harsh=foundingSuitability(w,id,{...opts,isLand:()=>true,environment:()=>({kind:'desert',climate:'dry',attack:40,defense:20}),nearRiver:()=>false});assert.ok(favorable.score>harsh.score);
 w.owners[id]='amber';assert.equal(foundingSuitability(w,id,opts).eligible,false);delete w.owners[id];w.owners[neighbors(id)[1]]='amber';assert.ok(foundingSuitability(w,id,opts).score<=35);assert.equal(foundingSuitability(w,water,opts).eligible,false);
});
test('river geometry snaps to real neighboring hex boundaries and coverage is bounded',()=>{
 const f={features:[{properties:{category:'rivers'},geometry:{type:'LineString',coordinates:[[0,0],[.5,.5]]}}]};const result=buildRiverEdges(f);assert.ok(result.edges.length);for(const [a,b] of result.edges){assert.ok(neighbors(a).includes(b));assert.ok(result.near.has(a));assert.ok(result.near.has(b));}assert.equal(siteCells(cellAt(0,0),2).length,19);
});
test('24 recommended player colors produce two validated independent fields',()=>{assert.equal(PLAYER_COLORS.length,24);for(let i=0;i<24;i++){const value=randomAppearance(()=>i/24);assert.equal(validAppearance(value),true);assert.notEqual(value.fill,value.border);}assert.equal(validAppearance({fill:'#000000',border:'red'}),false);});
