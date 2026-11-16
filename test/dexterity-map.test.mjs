import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('public/dexterity-map.js','utf8');
function execute(addresses) {
 const host={dataset:{},clientWidth:600,clientHeight:320,setAttribute(){}},status={};
 let script,geocodes=0,maps=0,options;
 const api={Service:{Status:{OK:200},geocode(_query,done){geocodes++;done(200,{v2:{addresses}});}},
   LatLng:class {constructor(lat,lng){this.lat=lat;this.lng=lng;}},
   Map:class {constructor(_host,o){maps++;options=o;}setSize(){}},
   Marker:class {},InfoWindow:class {open(){}},Position:{TOP_RIGHT:1},Event:{addListener(){}},Size:class {}};
 const context={document:{getElementById:id=>id==='dexterity-map'?host:status,createElement:()=>({}),head:{append:s=>{script=s;}}},
   window:{naver:{maps:api},addEventListener(){}},matchMedia:()=>({matches:true}),
   ResizeObserver:class {observe(){}},setTimeout:()=>1,clearTimeout(){}};
 vm.runInNewContext(source,context);
 context.window.psDexterityMapReady();
 return {host,status,script,get geocodes(){return geocodes;},get maps(){return maps;},get options(){return options;},context};
}
test('map uses current domain-restricted JS API and geocodes its address once',()=>{
 const result=execute([{x:'129.2',y:'35.8'}]);
 assert.equal(result.host.dataset.state,'ready');
 assert.equal(result.geocodes,1);assert.equal(result.maps,1);
 assert.match(result.script.src,/oapi.map.naver.com\/openapi\/v3\/maps.js\?ncpKeyId=/);
 assert.match(result.script.src,/submodules=geocoder/);
 assert.equal(result.options.scrollWheel,false);
 assert.equal(result.options.draggable,false);
 result.context.window.psDexterityMapReady();
 assert.equal(result.geocodes,1);
});
test('missing address never shows a misleading map location',()=>{
 const result=execute([]);
 assert.equal(result.host.dataset.state,'error');
 assert.equal(result.maps,0);
 assert.match(result.status.textContent,/네이버 지도 링크/);
});
test('geocoding data is not persisted or exposed as a provider secret',()=>{
 assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|X-NCP-APIGW-API-KEY['"]/);
 const article=readFileSync('src/pages/dexterity/hyangmisa.astro','utf8');
 assert.match(article,/id="dexterity-map" role="region"/);
 assert.match(article,/src="\/dexterity-map.js/);
});
