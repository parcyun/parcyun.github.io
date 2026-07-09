import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoEquirectangular, geoPath, geoContains } from 'd3-geo';

THREE.ColorManagement.enabled = false; // 원본 HTML과 색 정확히 일치(sRGB 값 passthrough)

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
// 원본 HTML 데이터 그대로
const CONT = {
  asia:   { ko:'아시아', en:'ASIA',          color:'#F2683C', ll:[95,46],   s:22, fact:'가장 큰 대륙. 세계 인구의 절반 이상이 살아요.' },
  europe: { ko:'유럽',   en:'EUROPE',        color:'#5AA9E6', ll:[18,56],   s:15, fact:'대륙은 작지만 많은 나라가 모여 있어요.' },
  africa: { ko:'아프리카', en:'AFRICA',       color:'#F4C145', ll:[20,2],    s:20, fact:'두 번째로 큰 대륙. 사하라 사막이 있어요.' },
  oceania:{ ko:'오세아니아', en:'OCEANIA',    color:'#3FC79A', ll:[134,-26], s:16, fact:'가장 작은 대륙. 오스트레일리아와 섬나라들로 이뤄져요.' },
  na:     { ko:'북아메리카', en:'NORTH AMERICA', color:'#C879E0', ll:[-100,46], s:19, fact:'북쪽의 큰 대륙. 캐나다·미국·멕시코가 있어요.' },
  sa:     { ko:'남아메리카', en:'SOUTH AMERICA', color:'#86D957', ll:[-61,-12], s:19, fact:'아마존 열대우림과 안데스산맥이 있는 대륙이에요.' },
  ant:    { ko:'남극',   en:'ANTARCTICA',    color:'#3A3F49', ll:[10,-80],  s:13, fact:'얼음으로 덮인 대륙. 한국 교육과정의 6대륙에는 넣지 않아요.' },
};
const CONT_ORDER = ['asia','europe','africa','oceania','na','sa']; // 남극 제외
const OCEAN = {
  pacific: { ko:'태평양', en:'PACIFIC OCEAN',  color:'#2E6CA6', fact:'가장 크고 깊은 바다. 아시아와 아메리카 사이에 있어요.' },
  atlantic:{ ko:'대서양', en:'ATLANTIC OCEAN', color:'#3E8FB0', fact:'두 번째로 큰 바다. 아메리카와 유럽·아프리카 사이예요.' },
  indian:  { ko:'인도양', en:'INDIAN OCEAN',   color:'#2FA39B', fact:'세 번째로 큰 바다. 아프리카·아시아·오세아니아 사이에 있어요.' },
  southern:{ ko:'남극해', en:'SOUTHERN OCEAN', color:'#5A78C2', fact:'남극 대륙을 둘러싼 차가운 바다예요.' },
  arctic:  { ko:'북극해', en:'ARCTIC OCEAN',   color:'#79B4D6', fact:'가장 작고 추운 바다. 북극 둘레에 얼음이 많아요.' },
};
const OCEAN_ORDER = ['pacific','atlantic','indian','southern','arctic'];
const OCEAN_PRIORITY=['southern','arctic','indian','atlantic','pacific']; // 클릭 판정 순서(원본과 동일): 남극해·북극해 스트립이 다른 대양 밴드와 겹쳐 먼저 검사해야 정확
const OCEAN_LABELS = [ // 지도 라벨(KR+EN), 태평양·대서양은 2곳
  {o:'pacific',en:'Pacific Ocean',ll:[-148,6]},{o:'pacific',en:'Pacific Ocean',ll:[168,-14]},
  {o:'atlantic',en:'Atlantic Ocean',ll:[-32,26]},{o:'atlantic',en:'Atlantic Ocean',ll:[-18,-32]},
  {o:'indian',en:'Indian Ocean',ll:[78,-24]},
  {o:'southern',en:'Southern Ocean',ll:[30,-60]},
  {o:'arctic',en:'Arctic Ocean',ll:[-46,74]},
];
const RES=4096, MS=2/Math.PI, STE=1.0, WORLD_W=2*Math.PI*MS, D2R=Math.PI/180, R2D=180/Math.PI;
const sameSel=(a,b)=>!!a&&!!b&&a.type===b.type&&a.key===b.key&&(a.type!=='country'||a.name===b.name);
const MAP_HALF=Math.log(Math.tan(Math.PI/4+(84*D2R)/2))*MS; // 메르카토 세로 절반(±84°, 원본과 동일 — 그린란드 북단 83.6°N 표시)
const projFor=(ctx)=>geoEquirectangular().scale(RES/(2*Math.PI)).translate([RES/2,RES/4]);
const solarDeclDeg=(m)=>23.44*Math.sin((2*Math.PI*((m-0.5)*30.44-80))/365);
const shade=(hex,amt)=>{const n=parseInt(hex.slice(1),16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;const f=amt<0?1+amt:1,a=amt>0?255*amt:0;return `rgb(${Math.round(r*f+a)},${Math.round(g*f+a)},${Math.round(b*f+a)})`;};
const rawTex=(cv)=>{const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.NoColorSpace;t.anisotropy=8;t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;return t;}; // #1b 경도 180° seam 제거(가로 래핑)
function lonLatToVec3(lon,lat,r){const u=(lon+180)/360,v=(90-lat)/180,th=u*2*Math.PI,ph=v*Math.PI;return new THREE.Vector3(-Math.cos(th)*Math.sin(ph),Math.cos(ph),Math.sin(th)*Math.sin(ph)).multiplyScalar(r);}
function vec3ToLonLat(v){const n=v.clone().normalize();const lat=R2D*Math.asin(THREE.MathUtils.clamp(n.y,-1,1));let a=Math.atan2(n.z,-n.x)/(2*Math.PI);if(a<0)a+=1;return [a*360-180,lat];}
const rotY=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return new THREE.Vector3(v.x*c+v.z*s,v.y,-v.x*s+v.z*c);};
const rotX=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return new THREE.Vector3(v.x,v.y*c-v.z*s,v.y*s+v.z*c);};

function buildBase({world,night}){
  const W=RES,H=RES/2,cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');const path=geoPath(projFor(ctx),ctx);
  // 바다는 투명(alpha 0) — 셰이더가 원본 화면공간 oceanGrad를 그림. 여기선 육지만 그린다(dc.a=1 판별용).
  const byC={};for(const f of world.features)(byC[f.properties.c]||=[]).push(f);
  for(const [c,feats] of Object.entries(byC)){ctx.beginPath();for(const f of feats)path(f);const col=(CONT[c]||{}).color||'#888';ctx.fillStyle=night?shade(col,-0.6):col;ctx.fill();ctx.lineWidth=0.5;ctx.strokeStyle=night?'rgba(255,255,255,0.06)':'#04060B';ctx.stroke();}
  return rawTex(cv);
}
const OCEAN_LAT_CLIP={pacific:{smin:-60},atlantic:{smin:-60,smax:66.5},indian:{smin:-60},southern:{smax:-60},arctic:{smin:66.5}}; // 대양 영역 분할: 개방대양은 60°S 위(smin)만·남극해는 60°S 아래(smax)만 / 북극권 66.5°N에서 대서양(위 잘림)·북극해(아래 잘림) 분할(그린란드 동쪽 겹침 제거)
const latRow=(lat)=>RES/4-(RES/(2*Math.PI))*(lat*D2R);                                              // projFor(equirect) 위도→텍스처 y (equator=RES/4, 남쪽일수록 큼)
function featherOcean(baseCtx,geom,color,world,key){
  // 안개형 페더: 대양색은 폴리곤 깊은 안쪽만 solid, 모든 경계(대양-대양·대양-육지)로 갈수록 배경으로 소멸.
  // 방법 — solid 마스크에서 ①육지를 빼고(대양-육지 경계 확보) ②60°S 위/아래로 대양 영역 클립(태평양이 남극해로 −72까지 침범하던 겹침 제거)
  //   ③안쪽으로 erode(모든 경계에서 안으로) ④blur(그 경계를 안개처럼 알파 0%로). 아래엔 base oceanGrad(배경)이라 색이 배경으로 녹는다.
  // 반자오선(lon180) 래핑: ±W 복사로 캔버스를 주기적으로 만들어 seam 연속 — erode/blur도 wide 마스크 위에서 수행.
  const W=RES,H=RES/2;
  const FADE=key==='southern'?1:1.1;  // 남극해 제외 4개 대양(태평양·대서양·인도양·북극해)은 바깥 페이드 10%↑
  const ER=Math.round(RES/360*1.7*FADE);   // 안쪽 침식(~1.7°): 페이드 시작점 + 이웃 대양 경계 넘침 방지
  const BL=RES/360*2.8*FADE;               // 페더 반경(~2.8°): 경계를 배경으로 소멸시키는 안개 프로파일
  const PAD=Math.ceil(ER+BL*4);       // wide 마스크 좌우 여백(erode 이동 + 블러 지원폭)
  // 1) 색 채움(±W 래핑 복사)
  const off=document.createElement('canvas');off.width=W;off.height=H;const o=off.getContext('2d');const op=geoPath(projFor(o),o);
  o.fillStyle=color;for(const dx of [-W,0,W]){o.save();o.translate(dx,0);o.beginPath();op(geom);o.fill();o.restore();}
  // 2) solid 마스크(wide, wrapped) = 대양 폴리곤 − 육지
  const WW=W+2*PAD,A=document.createElement('canvas');A.width=WW;A.height=H;const a=A.getContext('2d');const ap=geoPath(projFor(a),a);
  a.fillStyle='#fff';for(const dx of [-W,0,W]){a.save();a.translate(PAD+dx,0);a.beginPath();ap(geom);a.fill();a.restore();}
  if(world){a.globalCompositeOperation='destination-out'; // 육지 제거 → 대양-육지 경계가 마스크 경계가 되어 erode/blur가 함께 페이드
    for(const dx of [-W,0,W]){a.save();a.translate(PAD+dx,0);a.beginPath();for(const f of world.features)ap(f);a.fill();a.restore();}
    a.globalCompositeOperation='source-over';}
  const clip=OCEAN_LAT_CLIP[key]; // 60°S 위도 클립: erode 전에 잘라 클립 경계도 함께 안개 페이드
  if(clip){if(clip.smin!=null)a.clearRect(0,Math.round(latRow(clip.smin)),WW,H);   // smin 아래(더 남쪽) 제거 — 개방대양이 남극해 영역 침범 방지
    if(clip.smax!=null)a.clearRect(0,0,WW,Math.round(latRow(clip.smax)));}          // smax 위(더 북쪽) 제거 — 남극해가 타 대양 영역 침범 방지
  // 3) erode: snapshot(B)을 8방향(대각선은 1/√2)으로 shift해 destination-in — min-filter 근사(마스크를 모든 경계에서 안으로)
  const B=document.createElement('canvas');B.width=WW;B.height=H;B.getContext('2d').drawImage(A,0,0);
  const dg=Math.round(ER/Math.SQRT2);
  a.globalCompositeOperation='destination-in';
  for(const [sx,sy] of [[ER,0],[-ER,0],[0,ER],[0,-ER],[dg,dg],[dg,-dg],[-dg,dg],[-dg,-dg]]) a.drawImage(B,sx,sy);
  a.globalCompositeOperation='source-over';
  // 4) gaussian blur → W폭으로 crop(여백 덕에 seam 페이드 없음). 이 블러가 가장자리→0% 안개 알파 프로파일.
  const mk=document.createElement('canvas');mk.width=W;mk.height=H;const mc=mk.getContext('2d');
  mc.filter=`blur(${BL}px)`;mc.drawImage(A,-PAD,0);mc.filter='none';
  // 5) 색에 마스크 적용(destination-in 1회) — 안쪽 solid, 가장자리 알파 0%
  o.globalCompositeOperation='destination-in';o.drawImage(mk,0,0);o.globalCompositeOperation='source-over';
  baseCtx.save();baseCtx.globalAlpha=0.68;baseCtx.drawImage(off,0,0);baseCtx.restore(); // 채움 강도(0.62→0.68, 이전보다 ~10%↑)
}

function buildOverlay({sel,world,oceans,oceansFill}){
  const W=RES,H=RES/2,cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');const path=geoPath(projFor(ctx),ctx);
  if(sel){ if(sel.type==='ocean'&&oceans[sel.key]) featherOcean(ctx,{type:'Feature',geometry:(oceansFill&&oceansFill[sel.key])||oceans[sel.key]},(OCEAN[sel.key]||{}).color||'#3E8FB0',world,sel.key); // 채움은 매끈하게 정리된 폴리곤(있으면), 클릭 판정은 원본. world=육지 빼기용(안개 페더)
    else if(sel.type==='continent'||sel.type==='country'){
      const drawSel=()=>{ctx.beginPath();for(const f of world.features){const m=sel.type==='continent'?f.properties.c===sel.key:f.properties.n===sel.name;if(m)path(f);}};
      ctx.fillStyle='rgba(3,5,10,0.6)';ctx.fillRect(0,0,W,H);             // 나머지 대륙 dim
      ctx.globalCompositeOperation='destination-out';drawSel();ctx.fill(); // 선택 영역 뚫어 원래 색 유지
      ctx.globalCompositeOperation='source-over';
      // #4 가장자리 앰버 하이라이트 + 글로우(원본 .land.active: stroke amber + drop-shadow)
      ctx.shadowColor='rgba(255,177,26,0.9)';ctx.shadowBlur=RES/2048*9;ctx.strokeStyle='#FFB11A';ctx.lineWidth=sel.type==='country'?3.5:5;
      drawSel();ctx.stroke();ctx.stroke();ctx.shadowBlur=0;
    } }
  return rawTex(cv);
}
function glowTexture(){const S=512,cv=document.createElement('canvas');cv.width=S;cv.height=S;const c=cv.getContext('2d');const g=c.createRadialGradient(S/2,S/2,S*0.30,S/2,S/2,S*0.5);g.addColorStop(0,'rgba(255,177,26,0)');g.addColorStop(0.72,'rgba(255,177,26,0.10)');g.addColorStop(0.86,'rgba(120,150,210,0.10)');g.addColorStop(1,'rgba(120,150,210,0)');c.fillStyle=g;c.fillRect(0,0,S,S);return rawTex(cv);}

const GLSL=`const float PI=3.141592653589793; const float MS=0.6366197723675814; const float STE=1.0;
float wrapLon(float x){ return x-2.0*PI*floor(x/(2.0*PI)); } // [0,2π) 안전 래핑(seam 상대좌표·straddle 판정 공용)
vec3 project(vec2 uv, vec3 sphere, float morph, float lens, float rotY, float rotX, float lon0, float lat0, float lonC, float offX){
  float lon=(uv.x-0.5)*2.0*PI; float lat=(uv.y-0.5)*PI; float latC=clamp(lat,-1.4661,1.4661);
  float lonRel=wrapLon(lon-lonC+PI)-PI;                                    // (-π,π], seam=lonC+π(시선 대척점) — 메르카토 이음새가 뷰 중심을 따라다님
  vec3 pl=vec3((lonC+lonRel)*MS+offX, log(tan(PI/4.0+latC/2.0))*MS, 0.0);
  // 렌즈 = stereographic(방위·등각 도법, 원본 HTML과 동일): 중앙 실제비율·형태보존, 가장자리로 갈수록 확대. lon0,lat0=시선중심(rad)
  float slon=lon-lon0, sl0=sin(lat0), cl0=cos(lat0);
  float cosc=sl0*sin(lat)+cl0*cos(lat)*cos(slon);
  float ks=STE*2.0/(1.0+max(cosc,-0.985));
  vec3 st=vec3(ks*cos(lat)*sin(slon), ks*(cl0*sin(lat)-sl0*cos(lat)*cos(slon)), 0.0);
  // 구 회전: Y(경도) 후 X(위도 틸트)
  float cy=cos(rotY), sy=sin(rotY); vec3 s1=vec3(sphere.x*cy+sphere.z*sy, sphere.y, -sphere.x*sy+sphere.z*cy);
  float cx=cos(rotX), sx=sin(rotX); vec3 sph=vec3(s1.x, s1.y*cx-s1.z*sx, s1.y*sx+s1.z*cx);
  return sph*(1.0-morph-lens)+pl*morph+st*lens;
}`;
// seam(lonC+π) 걸친 삼각형 판정: 세 꼭짓점 경도를 lonC 기준 [0,2π)로 래핑 → span>π면 straddle → 정점 전부 클립 밖으로(파생함수 없이 결정적 붕괴)
const STRADDLE=`bool straddle3(vec3 tl,float lonC){ float w0=wrapLon(tl.x-lonC+PI),w1=wrapLon(tl.y-lonC+PI),w2=wrapLon(tl.z-lonC+PI);
  return max(w0,max(w1,w2))-min(w0,min(w1,w2))>PI; }`;
const meshVert=GLSL+STRADDLE+`attribute vec3 aTriLon; uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC; varying vec2 vUv;
void main(){ vUv=uv; if(morph>0.001&&straddle3(aTriLon,uLonC)){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  vec3 p=project(uv,position,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,0.0); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);} `;
// 클론 타일: 중심 메쉬와 동일하게 모핑(morph/lens/rot 공유) + 경도 오프셋. seam 상대 pl이라 타일끼리 연속 — 평면 무한스크롤 전용.
const cloneVert=GLSL+STRADDLE+`attribute vec3 aTriLon; uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX; varying vec2 vUv;
void main(){ vUv=uv; if(morph>0.001&&straddle3(aTriLon,uLonC)){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  vec3 p=project(uv,position,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);} `;
// 원본 oceanGrad 정확 재현: 화면공간 radial gradient (cx50% cy42% r75%), stops #0A1322/#060B16/#04060B.
// gl_FragCoord(디바이스px, 원점=좌하단)라 y=42%(위)→sc.y 0.58. dc.a로 육지(1)/바다(0) 구분.
const OCEANGRAD=`vec3 oceanGrad(vec2 fc, vec2 res){ vec2 sc=fc/res; float d=clamp(length((sc-vec2(0.5,0.58))/1.5),0.0,1.0);
  vec3 g0=vec3(10.0,19.0,34.0)/255.0,g1=vec3(6.0,11.0,22.0)/255.0,g2=vec3(4.0,6.0,11.0)/255.0;
  return d<0.55?mix(g0,g1,d/0.55):mix(g1,g2,(d-0.55)/0.45);} `;
const meshFrag=OCEANGRAD+`uniform sampler2D dayTex,nightTex,overlayTex; uniform float sunLon,sunLat,nightBoost,dayNightOn,lens,uLon0,uLat0; uniform vec2 uScreen; varying vec2 vUv;
void main(){ float lon=(vUv.x-0.5)*360.0, lat=(vUv.y-0.5)*180.0;
  if(lens>0.5){ float cc=sin(uLat0)*sin(radians(lat))+cos(uLat0)*cos(radians(lat))*cos(radians(lon)-uLon0); if(cc<-0.985) discard; } // stereographic: 대척점 근방만 미렌더
  float rl=radians(lat),ro=radians(lon),sa=radians(sunLat),so=radians(sunLon);
  float cz=sin(rl)*sin(sa)+cos(rl)*cos(sa)*cos(ro-so); float t=mix(1.0,smoothstep(-0.10,0.12,cz),dayNightOn);
  vec4 dc=texture2D(dayTex,vUv),nc=texture2D(nightTex,vUv);
  vec3 land=mix(nc.rgb*nightBoost, dc.rgb, t);
  vec3 ocean=oceanGrad(gl_FragCoord.xy,uScreen)*mix(0.32,1.0,t);          // 바다=원본 그라디언트(밤엔 어둡게)
  vec3 base=mix(ocean, land, dc.a);                                       // dc.a: 육지 1 / 바다 0
  vec4 ov=texture2D(overlayTex,vUv);
  gl_FragColor=vec4(mix(base,ov.rgb,ov.a),1.0);} `;
// 클론 프래그먼트: 중심과 동일 셰이딩 + 알파=uCloneAmt(평면=1, 전환 중엔 morph≥0.8에서만 페이드 — 가장자리 커버용, seam 마스킹 아님)
const cloneFrag=OCEANGRAD+`uniform sampler2D dayTex,nightTex,overlayTex; uniform float sunLon,sunLat,nightBoost,dayNightOn,uCloneAmt; uniform vec2 uScreen; varying vec2 vUv;
void main(){ float rl=radians((vUv.y-0.5)*180.0),ro=radians((vUv.x-0.5)*360.0),sa=radians(sunLat),so=radians(sunLon);
  float cz=sin(rl)*sin(sa)+cos(rl)*cos(sa)*cos(ro-so); float t=mix(1.0,smoothstep(-0.10,0.12,cz),dayNightOn);
  vec4 dc=texture2D(dayTex,vUv),nc=texture2D(nightTex,vUv);
  vec3 land=mix(nc.rgb*nightBoost, dc.rgb, t); vec3 ocean=oceanGrad(gl_FragCoord.xy,uScreen)*mix(0.32,1.0,t);
  vec3 base=mix(ocean, land, dc.a); vec4 ov=texture2D(overlayTex,vUv);
  gl_FragColor=vec4(mix(base,ov.rgb,ov.a), clamp(uCloneAmt,0.0,1.0));} `;
const lineVert=GLSL+`attribute vec2 aGeo; attribute vec2 aGeoB; uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX; varying float vCosc,vFrontZ,vSphereW;
void main(){ // seam 걸친 세그먼트 붕괴(국경 LineSegments용 — 짝 끝점 aGeoB와 비교; 라인스트립은 aGeoB=aGeo라 절대 미발동)
  if(morph>0.001){ float wa=wrapLon(radians(aGeo.x)-uLonC+PI),wb=wrapLon(radians(aGeoB.x)-uLonC+PI); if(abs(wa-wb)>PI){gl_Position=vec4(2.0,2.0,2.0,1.0);return;} }
  vec2 uv=vec2((aGeo.x+180.0)/360.0,(aGeo.y+90.0)/180.0); vec3 nn=normalize(vec3(-cos(uv.x*2.0*PI)*sin((1.0-uv.y)*PI),cos((1.0-uv.y)*PI),sin(uv.x*2.0*PI)*sin((1.0-uv.y)*PI)));
  float glon=(uv.x-0.5)*2.0*PI, glat=(uv.y-0.5)*PI; vCosc=sin(uLat0)*sin(glat)+cos(uLat0)*cos(glat)*cos(glon-uLon0); // 렌즈 대척점 클립용
  vec3 p=project(uv,nn*1.003,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX);
  // 구 뒷면 컬: 실제 카메라 위치(cameraPosition, Three가 자동 주입) 기준으로 판정 — 지구본 뷰 드래그 회전은 OrbitControls가
  // 카메라를 궤도이동시키는 것이라 uRotY/uRotX(고정 카메라 가정, 씬 전환 때만 바뀜)만으로 계산하면 사용자가 돌린 만큼 어긋나
  // 정확히 절반이 잘못 잘리는 버그가 있었음(회전 각도가 클수록 어긋남 커짐). p는 project()의 최종 위치라 카메라 상대 벡터도 정확.
  vFrontZ=dot(normalize(p),normalize(cameraPosition-p)); vSphereW=1.0-morph-lens;
  p.z+=0.006; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);} `;
const lineFrag=`uniform vec3 uColor; uniform float uOp,lens; varying float vCosc,vFrontZ,vSphereW;
void main(){ if(vSphereW>0.5&&vFrontZ<-0.02) discard; if(lens>0.5&&vCosc<-0.72) discard; gl_FragColor=vec4(uColor,uOp);} `;
// 화면공간 일정굵기 선(#2 오버레이): 두 끝점을 클립공간으로 투영 → 화면 수직으로 uPx만큼 오프셋.
// 도법·줌 무관하게 항상 같은 px 두께. depthTest off + 구 뒷면/렌즈 대척점 컬로 오버레이처럼 항상 위에.
const fatLineVert=GLSL+`attribute vec2 aGeoA,aGeoB; attribute float aEnd,aSide;
uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX,uPx; uniform vec2 uRes; varying float vCosc,vFrontZ,vSphereW;
vec3 uSph(vec2 g){vec2 uv=vec2((g.x+180.0)/360.0,(g.y+90.0)/180.0);return normalize(vec3(-cos(uv.x*2.0*PI)*sin((1.0-uv.y)*PI),cos((1.0-uv.y)*PI),sin(uv.x*2.0*PI)*sin((1.0-uv.y)*PI)));}
vec3 posOf(vec2 g){vec2 uv=vec2((g.x+180.0)/360.0,(g.y+90.0)/180.0);return project(uv,uSph(g)*1.003,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX);}
// 실제 카메라 위치(cameraPosition) 기준 뒷면 판정 — 지구본 드래그 회전은 OrbitControls가 카메라를 옮기는 것이라
// uRotY/uRotX(전환 때만 바뀌는 고정 카메라 가정)만으로 계산하면 회전한 만큼 어긋나 절반이 잘못 컬링되던 버그의 원인이었음.
float frontZOf(vec2 g){vec3 p=posOf(g);return dot(normalize(p),normalize(cameraPosition-p));}
vec4 clipOf(vec2 g){vec3 p=posOf(g);p.z+=0.009;return projectionMatrix*modelViewMatrix*vec4(p,1.0);}
void main(){ // seam 걸친 세그먼트 붕괴(양 끝점 모두 정점에 있음 → 결정적)
  if(morph>0.001){ float wa=wrapLon(radians(aGeoA.x)-uLonC+PI),wb=wrapLon(radians(aGeoB.x)-uLonC+PI); if(abs(wa-wb)>PI){gl_Position=vec4(2.0,2.0,2.0,1.0);return;} }
  // 구 뒷면(림) 경계 걸친 세그먼트 붕괴: 두 끝점이 전면/후면으로 갈리면 화면공간 리본 방향(dir)이 두 클립좌표 차로 계산되는데
  // 후면 점의 직교투영 좌표가 전면과 무관하게 튀어 dir이 폭주 → 적도선이 화면을 가로지르는 고리로 뻗치는 버그의 원인.
  // 프래그먼트 discard(vFrontZ)는 이미 있지만 그건 정점이 만들어진 *뒤*라 리본 폭 계산 자체를 못 막음 — 정점 단계에서 미리 끊어야 함.
  if(1.0-morph-lens>0.5){ bool visA=frontZOf(aGeoA)>-0.02, visB=frontZOf(aGeoB)>-0.02; if(visA!=visB){gl_Position=vec4(2.0,2.0,2.0,1.0);return;} }
  vec4 cA=clipOf(aGeoA),cB=clipOf(aGeoB); vec4 cT=(aEnd<0.5)?cA:cB;
  vec2 sA=cA.xy/cA.w,sB=cB.xy/cB.w; vec2 diff=(sB-sA)*uRes; float dl=length(diff);
  // dl≈0(두 끝점이 화면상 같은 점에 투영)이면 normalize가 NaN → perp도 NaN이 되어 리본이 화면을 가로지르는 스파이크로 폭주.
  // 안전 폴백(가로 방향 dir)으로 대체 — 폭 계산만 무해해지고(폭 0에 가까운 리본), 위치 자체는 정상 유지.
  vec2 dir=dl>1e-4?diff/dl:vec2(1.0,0.0); vec2 perp=vec2(-dir.y,dir.x);
  cT.xy+=perp*(2.0*uPx)/uRes*aSide*cT.w;
  vec2 g=(aEnd<0.5)?aGeoA:aGeoB; float glon=g.x*PI/180.0,glat=g.y*PI/180.0;
  vCosc=sin(uLat0)*sin(glat)+cos(uLat0)*cos(glat)*cos(glon-uLon0);
  vFrontZ=frontZOf(g); vSphereW=1.0-morph-lens;
  gl_Position=cT;}`;
const fatLineFrag=`uniform vec3 uColor; uniform float uOp,lens; varying float vCosc,vFrontZ,vSphereW;
void main(){ if(vSphereW>0.5&&vFrontZ<-0.02) discard; if(lens>0.5&&vCosc<-0.72) discard; gl_FragColor=vec4(uColor,uOp);}`;
const densify=(pts,maxStep=3)=>{const out=[pts[0]];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/maxStep));for(let j=1;j<=n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}return out;};
// #5 벡터 대륙 채움(딥줌 선명): 폴리곤을 lon/lat 공간에서 삼각분할→aGeo 모핑 셰이더로 투영. 텍스처 대신 벡터라 어느 배율에도 안 깨짐.
// 채색·낮밤·선택 dim은 meshFrag와 동일 로직 재현(vCol 베이스 + overlayTex 블렌드). 대척점/구 뒷면 컬 포함.
const fillVert=GLSL+STRADDLE+`attribute vec2 aGeo; attribute vec3 aColor; attribute vec3 aTriLon; uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX;
varying vec2 vUv; varying vec3 vCol; varying float vCosc,vFrontZ,vSphereW;
void main(){ vUv=vec2((aGeo.x+180.0)/360.0,(aGeo.y+90.0)/180.0); vCol=aColor;
  if(morph>0.001&&straddle3(aTriLon,uLonC)){gl_Position=vec4(2.0,2.0,2.0,1.0);return;} // seam 걸친 삼각형 붕괴(빠진 곳은 아래 텍스처 메쉬가 동일색 폴백)
  vec3 nn=normalize(vec3(-cos(vUv.x*2.0*PI)*sin((1.0-vUv.y)*PI),cos((1.0-vUv.y)*PI),sin(vUv.x*2.0*PI)*sin((1.0-vUv.y)*PI)));
  float glon=(vUv.x-0.5)*2.0*PI,glat=(vUv.y-0.5)*PI; vCosc=sin(uLat0)*sin(glat)+cos(uLat0)*cos(glat)*cos(glon-uLon0);
  vec3 p=project(vUv,nn,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX);
  vFrontZ=dot(normalize(p),normalize(cameraPosition-p)); vSphereW=1.0-morph-lens; // 실제 카메라 위치 기준(lineVert와 동일 이유)
  p.z+=0.0025;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
const fillFrag=`uniform sampler2D overlayTex; uniform float sunLon,sunLat,dayNightOn,lens; varying vec2 vUv; varying vec3 vCol; varying float vCosc,vFrontZ,vSphereW;
void main(){ if(vSphereW>0.5&&vFrontZ<-0.02) discard; if(lens>0.5&&vCosc<-0.985) discard;
  float lat=(vUv.y-0.5)*180.0,lon=(vUv.x-0.5)*360.0;
  float rl=radians(lat),ro=radians(lon),sa=radians(sunLat),so=radians(sunLon);
  float cz=sin(rl)*sin(sa)+cos(rl)*cos(sa)*cos(ro-so); float t=mix(1.0,smoothstep(-0.10,0.12,cz),dayNightOn);
  vec3 base=mix(vCol*0.4,vCol,t); vec4 ov=texture2D(overlayTex,vUv);
  gl_FragColor=vec4(mix(base,ov.rgb,ov.a),1.0);}`;

function morphGeom(lonN,latN){const g=new THREE.BufferGeometry();const pos=[],uv=[],tri=[];
  // 논인덱스드(삼각형 전개, 180×90×6≈97k 정점): 삼각형별 aTriLon(세 꼭짓점 경도 rad, 세 정점 동일값) → 셰이더 straddle 붕괴용
  const V=[];for(let j=0;j<=latN;j++){const lat=-90+180*j/latN;for(let i=0;i<=lonN;i++){const lon=-180+360*i/lonN;const s=lonLatToVec3(lon,lat,1);V.push([s.x,s.y,s.z,(lon+180)/360,(lat+90)/180,lon*D2R]);}}
  const row=lonN+1,pushTri=(a,b,c)=>{const l0=V[a][5],l1=V[b][5],l2=V[c][5];for(const vi of [a,b,c]){const v=V[vi];pos.push(v[0],v[1],v[2]);uv.push(v[3],v[4]);tri.push(l0,l1,l2);}};
  for(let j=0;j<latN;j++)for(let i=0;i<lonN;i++){const a=j*row+i;pushTri(a,a+row,a+1);pushTri(a+1,a+row,a+row+1);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('aTriLon',new THREE.Float32BufferAttribute(tri,3));return g;}
function morphLine(pts,color,opacity,U,offX=0){const g=new THREE.BufferGeometry();const pos=[],geo=[];
  for(const [lo,la] of pts){const s=lonLatToVec3(lo,la,1.003);pos.push(s.x,s.y,s.z);geo.push(lo,la);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aGeo',new THREE.Float32BufferAttribute(geo,2));g.setAttribute('aGeoB',new THREE.Float32BufferAttribute(geo.slice(),2)); // 라인스트립: aGeoB=자기 자신 → straddle 미발동(위선 랩 세그먼트는 수평 동일선상이라 무해)
  const m=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:offX},uColor:{value:new THREE.Color(color)},uOp:{value:opacity}},vertexShader:lineVert,fragmentShader:lineFrag});
  m.uniforms.uColor.value.convertLinearToSRGB&&(m.uniforms.uColor.value=new THREE.Color(color)); const ln=new THREE.Line(g,m);ln.renderOrder=2;ln.frustumCulled=false;return ln;} // depthTest off+뒷면컬(림 z-fighting 제거). frustumCulled=false 필수: 정점 셰이더가 uRotY/uRotX로 회전시키는데 Three의 자동 프러스텀 컬링은 회전 전 원본 좌표(호 하나의 바운딩스피어, 구 중심이 아님)로 판정 → 줌인(직교 프러스텀 축소) 시 회전 각도에 따라 화면에 보여야 할 선이 잘못 컬링됨(그래서 격자가 회전하면 사라졌었음).
// 굵은 선(적도/본초/날짜변경선): 폴리라인을 리본(삼각 스트립)으로 확장 → WebGL 1px 한계 우회, 도법 모핑 유지.
// 각 정점에서 화면수직 방향(cos(lat) 보정)으로 ±halfDeg 오프셋. lineVert가 aGeo→구→project 처리.
function morphRibbon(pts,halfDeg,color,opacity,U,offX=0){const g=new THREE.BufferGeometry();const pos=[],geo=[],idx=[];const n=pts.length;
  const perp=(i)=>{const p=pts[i],pa=pts[Math.max(0,i-1)],pb=pts[Math.min(n-1,i+1)];const cl=Math.max(0.15,Math.cos(p[1]*D2R));let tx=(pb[0]-pa[0])*cl,ty=(pb[1]-pa[1]);const L=Math.hypot(tx,ty)||1;tx/=L;ty/=L;return [(-ty)/cl*halfDeg,tx*halfDeg];};
  for(let i=0;i<n;i++){const [dLo,dLa]=perp(i),lo=pts[i][0],la=pts[i][1];for(const s of [1,-1]){const vlo=lo+s*dLo,vla=la+s*dLa,v=lonLatToVec3(vlo,vla,1.003);pos.push(v.x,v.y,v.z);geo.push(vlo,vla);}}
  for(let i=0;i<n-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aGeo',new THREE.Float32BufferAttribute(geo,2));g.setAttribute('aGeoB',new THREE.Float32BufferAttribute(geo.slice(),2));g.setIndex(idx);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:offX},uColor:{value:new THREE.Color(color)},uOp:{value:opacity}},vertexShader:lineVert,fragmentShader:lineFrag});
  return new THREE.Mesh(g,m);}
// 화면공간 일정굵기 선(#2): 세그먼트마다 4정점 쿼드(양끝×양쪽). uRes=CSS크기 → px 두께가 pixelRatio 무관하게 정확.
function makeFatLine(pts,halfPx,color,opacity,U,uRes,offX=0){const gA=[],gB=[],ends=[],sides=[],pos=[],idx=[];let vi=0;
  for(let i=0;i<pts.length-1;i++){const A=pts[i],B=pts[i+1];
    for(const [e,s] of [[0,1],[0,-1],[1,1],[1,-1]]){gA.push(A[0],A[1]);gB.push(B[0],B[1]);ends.push(e);sides.push(s);const g=e<0.5?A:B,v=lonLatToVec3(g[0],g[1],1.003);pos.push(v.x,v.y,v.z);}
    idx.push(vi,vi+1,vi+2,vi+1,vi+3,vi+2);vi+=4;}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('aGeoA',new THREE.Float32BufferAttribute(gA,2));geo.setAttribute('aGeoB',new THREE.Float32BufferAttribute(gB,2));
  geo.setAttribute('aEnd',new THREE.Float32BufferAttribute(ends,1));geo.setAttribute('aSide',new THREE.Float32BufferAttribute(sides,1));geo.setIndex(idx);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:offX},uColor:{value:new THREE.Color(color)},uOp:{value:opacity},uPx:{value:halfPx},uRes},vertexShader:fatLineVert,fragmentShader:fatLineFrag});
  const mesh=new THREE.Mesh(geo,m);mesh.frustumCulled=false;mesh.renderOrder=3;return mesh;}

// 직교 카메라(원근 왜곡 0 = d3 2D 도법과 동일). zoom = d3 픽셀 스케일 매칭:
//  frustum 반높이 1 → 보이는 월드 반높이 = 1/zoom. 픽셀 = R월드·zoom·H/2.
//  globe: 구반경1 → d3 fit=min·0.46 ⇒ zoom 0.92 / lens: 90°=2·SC → d3 fit·0.62·0.285 ⇒ zoom 0.248 / flat: MS·zoom·.5=.46 ⇒ 1.445
const VIEW={
  globe:{morph:0,lens:0,rotY:-Math.PI/2,zoom:0.92, rotate:true, pan:false,zmin:0.45,zmax:11},
  lens: {morph:0,lens:1,rotY:0,        zoom:0.285,rotate:false,pan:false,zmin:0.12,zmax:2.2},
  flat: {morph:1,lens:0,rotY:0,        zoom:0.74, rotate:false,pan:true, zmin:0.64,zmax:30},
};
const MODE_WM={flat:'Mercator Projection',lens:'Focus Lens View',globe:'Orthographic Globe'};
const ease=(t)=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

export default function GlobeLab(){
  const mountRef=useRef(null),labelRef=useRef(null),api=useRef({});
  const S=useRef({view:'flat',country:false,dayNight:false,dnPlay:true,month:6,grat:true,eq:true,prime:false,step:20,sunLon:-90});
  const [view,setView]=useState('flat');
  const [country,setCountry]=useState(false),[dayNight,setDayNight]=useState(false),[dnPlay,setDnPlay]=useState(true),[month,setMonth]=useState(6);
  const [grat,setGrat]=useState(true),[eq,setEq]=useState(true),[prime,setPrime]=useState(false),[dateline,setDateline]=useState(false),[step,setStep]=useState(20);
  const [sel,setSel]=useState(null),[status,setStatus]=useState('로딩 중…');
  const [hint,setHint]=useState(true); // 힌트=일시 온보딩(원본과 동일): 7초 또는 첫 조작 시 사라짐, 뷰 전환 시 잠깐 재표시
  useEffect(()=>{setHint(true);const t=setTimeout(()=>setHint(false),7000);return()=>clearTimeout(t);},[view]);
  const [guide,setGuide]=useState(true); // #6 접속(새로고침) 시 사용 가이드 오버레이 — 클릭해서 닫기

  useEffect(()=>{Object.assign(S.current,{view,country,dayNight,dnPlay,month,grat,eq,prime,dateline,step:Math.max(5,Math.min(90,+step||20))});},[view,country,dayNight,dnPlay,month,grat,eq,prime,dateline,step]); // 간격 5–90 클램프(원본과 동일)
  useEffect(()=>{api.current.goView&&api.current.goView(view);},[view]);
  useEffect(()=>{api.current.applyGrid&&api.current.applyGrid();},[grat,eq,prime,dateline,step]);
  useEffect(()=>{S.current.sel=sel;api.current.applySel&&api.current.applySel(sel);},[sel]);
  useEffect(()=>{if(api.current.onDN)api.current.onDN(dayNight);},[dayNight]);

  useEffect(()=>{
    const mount=mountRef.current;let raf,renderer,controls,cleanupFn=null,disposed=false;
    (async()=>{
      const w=mount.clientWidth,h=mount.clientHeight;
      const scene=new THREE.Scene();
      const aspect=w/h;const camera=new THREE.OrthographicCamera(-aspect,aspect,1,-1,0.01,100);camera.position.set(0,0,10);camera.zoom=VIEW.flat.zoom;camera.updateProjectionMatrix();
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);mount.appendChild(renderer.domElement);
      controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=0.08;controls.enablePan=false;controls.screenSpacePanning=true;controls.zoomSpeed=2.4;

      const sg=new THREE.BufferGeometry(),Ns=1100,spp=new Float32Array(Ns*3);
      for(let i=0;i<Ns;i++){const r=60+Math.random()*45,t=Math.acos(2*Math.random()-1),p=2*Math.PI*Math.random();spp[i*3]=r*Math.sin(t)*Math.cos(p);spp[i*3+1]=r*Math.cos(t);spp[i*3+2]=r*Math.sin(t)*Math.sin(p);}
      sg.setAttribute('position',new THREE.BufferAttribute(spp,3));scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0x555a68,size:0.12,sizeAttenuation:true})));
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,opacity:0.9}));glow.scale.set(2.7,2.7,1);glow.renderOrder=-1;scene.add(glow);

      setStatus('지형 데이터 로딩…');
      const [world,oceans,oceansFill]=await Promise.all([fetch('/lab-data/world.json').then(r=>r.json()),fetch('/lab-data/oceans.json').then(r=>r.json()),fetch('/lab-data/oceans-fill.json').then(r=>r.json()).catch(()=>({}))]);
      if(disposed)return;
      const vDay=buildBase({world,night:false}),vNight=buildBase({world,night:true});
      const U={morph:{value:VIEW.flat.morph},lens:{value:VIEW.flat.lens},uRotY:{value:VIEW.flat.rotY},uRotX:{value:0},uLon0:{value:0},uLat0:{value:0},uLonC:{value:0}}; // uLonC=메르카토 중앙자오선(rad, seam=uLonC+π)
      const uRes={value:new THREE.Vector2(mount.clientWidth,mount.clientHeight)}; // 화면공간 fat-line용(CSS px)
      const uScreen={value:new THREE.Vector2(renderer.domElement.width,renderer.domElement.height)}; // gl_FragCoord용(디바이스 px) — 화면공간 oceanGrad
      const uCloneAmt={value:1}; // 클론 타일 알파(정상상태 평면 무한스크롤 전용 — 전환 중엔 seam이 뷰 대척점에 파킹돼 마스킹 불필요)
      let overlayTex=buildOverlay({sel:null,world,oceans});
      const u={dayTex:{value:vDay},nightTex:{value:vNight},overlayTex:{value:overlayTex},...U,sunLon:{value:S.current.sunLon},sunLat:{value:solarDeclDeg(6)},nightBoost:{value:1},dayNightOn:{value:0},uScreen};
      const mesh=new THREE.Mesh(morphGeom(180,90),new THREE.ShaderMaterial({vertexShader:meshVert,fragmentShader:meshFrag,uniforms:u,side:THREE.DoubleSide}));
      mesh.frustumCulled=false; // 커스텀 회전 셰이더 공통 규칙(아래 grat/border와 동일 이유) — 전체 구 형상이라 우연히 안 걸렸을 뿐, 명시적으로 방지
      scene.add(mesh);
      // 평면 seam 배경: 화면 전체를 base oceanGrad로 채우는 fullscreen 삼각형(뒤에 깔림). 모프 seam 갭이 페이지 검정 대신 바다색으로 채워져 검은 세로선 제거. 평면에서만 표시(구/렌즈의 검은 우주 배경 보존).
      const bgGeo=new THREE.BufferGeometry();bgGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
      const bgMesh=new THREE.Mesh(bgGeo,new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uScreen},vertexShader:'void main(){gl_Position=vec4(position,1.0);}',fragmentShader:OCEANGRAD+'uniform vec2 uScreen;void main(){gl_FragColor=vec4(oceanGrad(gl_FragCoord.xy,uScreen),1.0);}'}));
      bgMesh.frustumCulled=false;bgMesh.renderOrder=-3;bgMesh.visible=false;scene.add(bgMesh);
      // 평면 좌우 순환용 클론 타일(±월드폭)
      const cloneMat=(off)=>new THREE.ShaderMaterial({vertexShader:cloneVert,fragmentShader:cloneFrag,side:THREE.DoubleSide,transparent:true,
        uniforms:{dayTex:u.dayTex,nightTex:u.nightTex,overlayTex:u.overlayTex,sunLon:u.sunLon,sunLat:u.sunLat,nightBoost:u.nightBoost,dayNightOn:u.dayNightOn,morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:off},uCloneAmt,uScreen}});
      const tileL=new THREE.Mesh(mesh.geometry,cloneMat(-WORLD_W)),tileR=new THREE.Mesh(mesh.geometry,cloneMat(WORLD_W));
      tileL.frustumCulled=tileR.frustumCulled=false;tileL.visible=tileR.visible=false;scene.add(tileL,tileR);
      let borderClones=null,fillClones=null; // 국경·벡터채움의 ±WORLD_W 클론(아래서 채워짐) — 클론 타일 영역에서도 크리스프 렌더 유지
      // 평면 seam 패치: uLonC=π 복사본(콘텐츠 동일, seam만 lon180→lon0). 정상상태 평면(uLonC=0)의 lon180 seam 갭을 덮어 검은선·지도 잘림 제거. base 메쉬(바다+선택 오버레이) + 좌우 타일 각각.
      const patchU=Object.assign({},u,{uLonC:{value:Math.PI}});
      const meshPatch=new THREE.Mesh(mesh.geometry,new THREE.ShaderMaterial({vertexShader:meshVert,fragmentShader:meshFrag,uniforms:patchU,side:THREE.DoubleSide}));
      const clonePatchMat=(off)=>new THREE.ShaderMaterial({vertexShader:cloneVert,fragmentShader:cloneFrag,side:THREE.DoubleSide,transparent:true,
        uniforms:{dayTex:u.dayTex,nightTex:u.nightTex,overlayTex:u.overlayTex,sunLon:u.sunLon,sunLat:u.sunLat,nightBoost:u.nightBoost,dayNightOn:u.dayNightOn,morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:{value:Math.PI},uOffsetX:{value:off},uCloneAmt,uScreen}});
      const tileLp=new THREE.Mesh(mesh.geometry,clonePatchMat(-WORLD_W)),tileRp=new THREE.Mesh(mesh.geometry,clonePatchMat(WORLD_W));
      meshPatch.frustumCulled=tileLp.frustumCulled=tileRp.frustumCulled=false;meshPatch.visible=tileLp.visible=tileRp.visible=false;scene.add(meshPatch,tileLp,tileRp);

      // 격자 세트(중심 offX=0은 항상, 평면 타일용 ±WORLD_W는 gridFlat에). 구/렌즈에선 중심만 → 중복선 없음(#7)
      const IDL=[[180,90],[180,73],[190.5,68],[190.5,65],[192.5,60],[180,53],[180,50],[180,7],[203,7],[203,-9],[188,-13],[180,-16],[180,-47],[180,-90]]; // 실제 날짜변경선 근사(#1)
      const makeGridSet=(offX,stp)=>{const grat=new THREE.Group();
        for(let lon=-180;lon<180;lon+=stp){const p=[];for(let la=-90;la<=90;la+=3)p.push([lon,la]);grat.add(morphLine(p,0x9098A4,0.28,U,offX));} // lon<180: 대척자오선 중복선 제거(#1c)
        for(let lat=-90+stp;lat<90;lat+=stp){const p=[];for(let lo=-180;lo<=180;lo+=3)p.push([lo,lat]);grat.add(morphLine(p,0x9098A4,0.28,U,offX));}
        const eqP=[];for(let lo=-180;lo<=180;lo+=3)eqP.push([lo,0]);const eq=makeFatLine(eqP,1.5,0xFF7B7B,0.72,U,uRes,offX);
        const pmP=[];for(let la=-90;la<=90;la+=3)pmP.push([0,la]);const pm=makeFatLine(pmP,1.3,0xFFB270,0.7,U,uRes,offX);
        const dl=makeFatLine(densify(IDL),1.4,0x38E0D0,0.9,U,uRes,offX);
        const g=new THREE.Group();g.add(grat,eq,pm,dl);g.userData={grat,eq,pm,dl};return g;};
      // 크리스프 벡터 국경/해안선(#4 심층줌): 채움은 텍스처(솔리드색), 경계선만 벡터라 딥줌에서 선명.
      // 평상시엔 원본과 동일한 어두운 스트로크(#04060B) → 딥줌에서만 밝게 블렌드(텍스처 픽셀레이션 보완).
      const borderMat=(()=>{const pos=[],geo=[],geoB=[];const addRing=(ring)=>{for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1];if(Math.abs(a[0]-b[0])>180)continue;
          const n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/2)); // 원본 정점 간격이 넓은 구간(사막 한가운데 직선 국경 등) 세분 — 딥줌에서 직선 각짐(저해상도) 방지
          let pa=a;for(let j=1;j<=n;j++){const pb=j===n?b:[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n];
            const va=lonLatToVec3(pa[0],pa[1],1.0045),vb=lonLatToVec3(pb[0],pb[1],1.0045);pos.push(va.x,va.y,va.z,vb.x,vb.y,vb.z);geo.push(pa[0],pa[1],pb[0],pb[1]);geoB.push(pb[0],pb[1],pa[0],pa[1]);pa=pb;}
        }}; // aGeoB=짝 끝점 → seam 걸친 세그먼트 셰이더 붕괴(러시아·피지 등 lon180 횡단 스미어 방지)
        for(const f of world.features){const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;for(const poly of polys)for(const ring of poly)addRing(ring);}
        const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bg.setAttribute('aGeo',new THREE.Float32BufferAttribute(geo,2));bg.setAttribute('aGeoB',new THREE.Float32BufferAttribute(geoB,2));
        const bm=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:0},uColor:{value:new THREE.Color(0x04060B)},uOp:{value:0.42}},vertexShader:lineVert,fragmentShader:lineFrag});
        const bls=new THREE.LineSegments(bg,bm);bls.renderOrder=1;bls.frustumCulled=false;scene.add(bls);
        // 평면 좌우 무한스크롤 클론 타일(±WORLD_W)에도 벡터 국경 복제 — 없으면 클론 타일 영역(팬 위치에 따라 항상 보일 수 있음)에서
        // 텍스처 폴백(저해상도)만 남아 "한쪽만 해상도가 낮다"는 버그가 됨. geometry는 공유, uOffsetX만 다른 재질.
        const cloneBorderMat=(off)=>new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:off},uColor:{value:new THREE.Color(0x04060B)},uOp:{value:0.42}},vertexShader:lineVert,fragmentShader:lineFrag});
        const blsL=new THREE.LineSegments(bg,cloneBorderMat(-WORLD_W)),blsR=new THREE.LineSegments(bg,cloneBorderMat(WORLD_W));
        blsL.renderOrder=blsR.renderOrder=1;blsL.frustumCulled=blsR.frustumCulled=false;blsL.visible=blsR.visible=false;scene.add(blsL,blsR);
        borderClones={blsL,blsR};
        return bm;})();
      const BORDER_DARK=new THREE.Color(0x04060B),BORDER_LIT=new THREE.Color(0x46586e);
      // #5 벡터 대륙 채움 빌드: 각 폴리곤(외곽+구멍)을 ShapeGeometry(내부 earcut)로 삼각분할 → aGeo/aColor.
      (()=>{const aGeo=[],aCol=[],aTri=[],tmp=new THREE.Color();
        for(const f of world.features){const col=(CONT[f.properties.c]||{}).color||'#888';tmp.set(col);
          const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
          for(const poly of polys){const outer=poly[0];if(!outer||outer.length<4)continue;
            let mn=180,mx=-180;for(const p of outer){if(p[0]<mn)mn=p[0];if(p[0]>mx)mx=p[0];}
            if(mx-mn>180)continue; // 반자오선 횡단 폴리곤 스킵(삼각분할 왜곡 방지 — 딥줌에선 텍스처 폴백)
            const shape=new THREE.Shape(outer.map(p=>new THREE.Vector2(p[0],p[1])));
            for(let h=1;h<poly.length;h++){const r=poly[h];if(r&&r.length>=4)shape.holes.push(new THREE.Path(r.map(p=>new THREE.Vector2(p[0],p[1]))));}
            let sg;try{sg=new THREE.ShapeGeometry(shape);}catch(e){continue;}
            const ps=sg.attributes.position.array,ix=sg.index?sg.index.array:null;if(!ix){sg.dispose();continue;}
            for(let i=0;i<ix.length;i+=3){const i0=ix[i],i1=ix[i+1],i2=ix[i+2],l0=ps[i0*3]*D2R,l1=ps[i1*3]*D2R,l2=ps[i2*3]*D2R; // aTriLon=삼각형 세 꼭짓점 경도(rad, 세 정점 동일) → straddle 붕괴
              for(const vi of [i0,i1,i2]){aGeo.push(ps[vi*3],ps[vi*3+1]);aCol.push(tmp.r,tmp.g,tmp.b);aTri.push(l0,l1,l2);}}
            sg.dispose();}}
        const fg=new THREE.BufferGeometry();fg.setAttribute('aGeo',new THREE.Float32BufferAttribute(aGeo,2));fg.setAttribute('aColor',new THREE.Float32BufferAttribute(aCol,3));fg.setAttribute('aTriLon',new THREE.Float32BufferAttribute(aTri,3));
        const pos=new Float32Array(aGeo.length/2*3);for(let i=0;i<aGeo.length/2;i++){const v=lonLatToVec3(aGeo[i*2],aGeo[i*2+1],1);pos[i*3]=v.x;pos[i*3+1]=v.y;pos[i*3+2]=v.z;}
        fg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
        const fm=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:0},overlayTex:u.overlayTex,sunLon:u.sunLon,sunLat:u.sunLat,dayNightOn:u.dayNightOn},vertexShader:fillVert,fragmentShader:fillFrag});
        const fmesh=new THREE.Mesh(fg,fm);fmesh.frustumCulled=false;fmesh.renderOrder=0.5;scene.add(fmesh);
        // 클론 타일용 벡터 대륙 채움 복제(국경과 동일 이유 — 클론 영역에서 텍스처 폴백만 남는 저해상도 버그 방지)
        const cloneFillMat=(off)=>new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:off},overlayTex:u.overlayTex,sunLon:u.sunLon,sunLat:u.sunLat,dayNightOn:u.dayNightOn},vertexShader:fillVert,fragmentShader:fillFrag});
        const fmeshL=new THREE.Mesh(fg,cloneFillMat(-WORLD_W)),fmeshR=new THREE.Mesh(fg,cloneFillMat(WORLD_W));
        fmeshL.frustumCulled=fmeshR.frustumCulled=false;fmeshL.renderOrder=fmeshR.renderOrder=0.5;fmeshL.visible=fmeshR.visible=false;scene.add(fmeshL,fmeshR);
        fillClones={fmeshL,fmeshR};
        })();
      // #2 줌 적응형 격자: 확대할수록 중심 격자를 더 촘촘히(딥줌에서 위경도선 유지). 중심 세트만 세분(성능), 평면 클론은 사용자 간격 유지.
      const NICE=[90,45,30,20,15,10,5,3,2,1,0.5]; // 깊은 줌에서 더 촘촘히 → 격자선 사라짐 방지(뷰 폭보다 간격이 커지지 않게)
      const adaptiveStep=(base)=>{const z0={flat:0.74,globe:0.92,lens:0.285}[S.current.view]||0.74;
        const lv=Math.max(0,Math.floor(Math.log2(Math.max(1,camera.zoom/z0))));let i=NICE.findIndex(v=>v<=base);if(i<0)i=0;return NICE[Math.min(NICE.length-1,i+lv)];};
      let curEff=S.current.step;
      let center=makeGridSet(0,curEff);
      // 평면 클론 타일(±WORLD_W)도 center와 동일한 적응형 간격(curEff) 사용 — 예전엔 클론이 고정 curStep(사용자 설정값,
      // 기본 20°)만 써서 딥줌 시 center는 촘촘해지는데 클론 쪽(팬 위치에 따라 화면에 보일 수 있음)은 그대로라
      // "격자가 반응형으로 확대되지 않고 고정된" 것처럼 보이던 버그의 원인.
      let gridFlat=new THREE.Group();gridFlat.add(makeGridSet(-WORLD_W,curEff),makeGridSet(WORLD_W,curEff));
      scene.add(center,gridFlat);
      const setGridVis=()=>{const st=S.current;for(const s of [center,...gridFlat.children]){const u2=s.userData;u2.grat.visible=st.grat;u2.eq.visible=st.eq;u2.pm.visible=st.prime;u2.dl.visible=st.dateline;}};
      const applyGrid=()=>{const st=S.current;
        const eff=adaptiveStep(st.step);
        if(eff!==curEff){curEff=eff;scene.remove(center,gridFlat);center=makeGridSet(0,curEff);gridFlat=new THREE.Group();gridFlat.add(makeGridSet(-WORLD_W,curEff),makeGridSet(WORLD_W,curEff));scene.add(center,gridFlat);}
        setGridVis();};

      const oceanLblEls=[]; // 대양 라벨 활성/딤 상태용(원본 .ocean-label.active/.dim)
      const applySel=(s)=>{overlayTex.dispose();overlayTex=buildOverlay({sel:s,world,oceans,oceansFill});u.overlayTex.value=overlayTex;
        const oc=!!s&&s.type==='ocean';
        for(const {el,o} of oceanLblEls){el.classList.toggle('active',oc&&o===s.key);el.classList.toggle('dim',oc&&o!==s.key);}};
      const centerLonRad=()=>U.lens.value>0.5?U.uLon0.value:(U.morph.value>0.5?controls.target.x/MS:-Math.PI/2-U.uRotY.value);
      const onDN=(on)=>{if(on)S.current.sunLon=R2D*centerLonRad()-90;u.dayNightOn.value=on?1:0;}; // 켤 때 명암 경계선이 현재 뷰에 걸치게(원본과 동일)
      const dolly=(f)=>{camera.zoom=THREE.MathUtils.clamp(camera.zoom/f,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();controls.update();};
      let tr=null;
      const goView=(v)=>{const to=VIEW[v];
        // 현재 화면 상태로 소스 중심 경위도(rad) 산출 → 뷰 전환 후에도 같은 지점 유지(#5)
        const m=U.morph.value,l=U.lens.value; let clR,claR;
        const home=S.current.homeReq;S.current.homeReq=false;
        if(home){clR=0;claR=0;}                                                                                 // ⟳홈=중심·줌 완전 리셋(원본과 동일)
        else if(l>0.5){clR=U.uLon0.value;claR=U.uLat0.value;}                                                   // 렌즈=시선중심(rad)
        else if(m>0.5){clR=controls.target.x/MS;claR=2*Math.atan(Math.exp(controls.target.y/MS))-Math.PI/2;}    // 평면
        else{const fr=camera.position.clone().sub(controls.target).normalize();const g=vec3ToLonLat(rotY(rotX(fr,-U.uRotX.value),-U.uRotY.value));clR=g[0]*D2R;claR=g[1]*D2R;} // 지구본
        // uLonC는 이제 항상 0 고정(중심 카피)+π 고정(패치 카피)이라 seam이 파킹 없이 상시 이중 커버됨 — clR을 중심 카피의 유효범위(-π,π]로 감싸기만 하면 됨(렌즈 드래그 누적 등으로 clR이 범위 밖이어도 안전).
        const toLonC=Math.atan2(Math.sin(clR),Math.cos(clR));
        // 평면행 카메라 타깃은 toLonC 기준(clR과 2πk 차이 가능) → 메쉬 중심과 일치, settle 후 isFlat 랩이 카메라와 함께 재중심화(무점프)
        const tx=(v==='flat'?toLonC:clR)*MS,ty=Math.log(Math.tan(Math.PI/4+THREE.MathUtils.clamp(claR,-1.4,1.4)/2))*MS;
        // #1 자연 전환(스핀·지구본 생성 없음): 해당 항이 화면에 안 보이는 시점에 방향/중심을 즉시 세팅,
        //   보이는 상태로 전환될 땐 회전을 유지. 구는 morph=1(평면)·lens=1(렌즈)일 때 안 보이고, 렌즈 st는 lens=0일 때 안 보임.
        let fromRotY=U.uRotY.value,fromRotX=U.uRotX.value,fromLon0=U.uLon0.value,fromLat0=U.uLat0.value;
        let toRotY,toRotXv,toLon0,toLat0,toTgt,toPos;
        if(v==='globe'){ toRotY=-Math.PI/2-clR;toRotXv=claR;fromRotY=toRotY;fromRotX=toRotXv; // 구 방향 즉시(시작 시 안 보임)→회전 없이 펼쳐짐
          toLon0=fromLon0;toLat0=fromLat0;toTgt=new THREE.Vector3(0,0,0);toPos=new THREE.Vector3(0,0,10);}
        else if(v==='lens'){ toLon0=clR;toLat0=claR;fromLon0=toLon0;fromLat0=toLat0; // 렌즈 중심 즉시(시작 시 lens=0)
          toRotY=fromRotY;toRotXv=fromRotX;toTgt=new THREE.Vector3(0,0,0);toPos=new THREE.Vector3(0,0,10);} // 구 회전 유지(구→렌즈 스핀 방지)
        else{ toRotY=fromRotY;toRotXv=fromRotX;toLon0=fromLon0;toLat0=fromLat0; // 평면: 구 회전 유지(구→평면 스핀 방지), 중심은 카메라 팬
          toTgt=new THREE.Vector3(tx,ty,0);toPos=new THREE.Vector3(tx,ty,10);}
        // 렌즈·지구본 전환 시 목표 zoom을 동적 계산 → 소스 뷰 중심부의 화면 크기와 일치(급격한 축소 없이 자연 전환).
        //  중심 월드스케일(ground-rad당): 평면=MS/cos(lat), 지구본=1, 렌즈=STE. 화면스케일(월드스케일·zoom)을 같게 → destZoom=srcScale·srcZoom/destScale.
        const cosLat=Math.cos(THREE.MathUtils.clamp(claR,-1.45,1.45));
        const srcScale=(m>0.5)?MS/cosLat:(l>0.5?STE:1.0); // 소스 중심 월드스케일: 평면=MS/cos, 렌즈=STE, 지구본=1
        let toZoomv=to.zoom;
        if(!home){ // 홈(⟳)은 기본 zoom 리셋. 그 외에는 소스 중심 크기에 맞춰 목표 zoom 계산
          if(v==='lens') toZoomv=THREE.MathUtils.clamp(srcScale*camera.zoom/STE,VIEW.lens.zmin,VIEW.lens.zmax);
          else if(v==='globe') toZoomv=THREE.MathUtils.clamp(srcScale*camera.zoom,VIEW.globe.zmin,VIEW.globe.zmax); // 지구본 월드스케일=1
          else toZoomv=THREE.MathUtils.clamp(srcScale*camera.zoom*cosLat/MS,VIEW.flat.zmin,VIEW.flat.zmax); }        // 평면 월드스케일=MS/cos
        tr={t:0,dur:0.72,v,from:{morph:U.morph.value,lens:U.lens.value,rotY:fromRotY,rotX:fromRotX,lon0:fromLon0,lat0:fromLat0,lonC:0,zoom:camera.zoom,pos:camera.position.clone(),tgt:controls.target.clone()},
          to:{morph:to.morph,lens:to.lens,rotY:toRotY,rotX:toRotXv,lon0:toLon0,lat0:toLat0,lonC:0,zoom:toZoomv,pos:toPos,tgt:toTgt}};controls.enabled=false;}; // uLonC는 전환 내내 0 고정(패치가 항상 π를 커버) — toLonC(clR 래핑값)는 tx 계산에만 쓰고 uLonC 애니메이션엔 안 씀
      const settleView=(v)=>{const p=VIEW[v];controls.enabled=true;controls.enableRotate=p.rotate;controls.enablePan=p.pan;controls.minZoom=p.zmin;controls.maxZoom=p.zmax;
        if(v==='globe'){controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};}
        else if(v==='flat'){controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_PAN};}
        else{controls.mouseButtons={LEFT:-1,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:-1};controls.touches={ONE:-1,TWO:THREE.TOUCH.DOLLY_PAN};} // 렌즈=시선 커스텀 드래그
        controls.update();};
      api.current={applyGrid,applySel,onDN,dolly,goView,
        pickContinent:(k)=>setSel(sameSel(S.current.sel,{type:'continent',key:k})?null:{type:'continent',key:k}),
        pickOcean:(k)=>setSel(sameSel(S.current.sel,{type:'ocean',key:k})?null:{type:'ocean',key:k})};
      applyGrid();settleView('flat');

      const labels={};
      for(const [k,d] of Object.entries(CONT)){const el=document.createElement('div');el.className='gl-lbl cont';el.textContent=d.ko;el.style.fontSize=d.s+'px';labelRef.current.appendChild(el);labels['c'+k]={el,anchor:d.ll};}
      OCEAN_LABELS.forEach((L,i)=>{const el=document.createElement('div');el.className='gl-lbl ocn';el.innerHTML=`<div class="kr">${OCEAN[L.o].ko}</div><div class="en">${L.en}</div>`;labelRef.current.appendChild(el);labels['o'+i]={el,anchor:L.ll};oceanLblEls.push({el,o:L.o});});

      // 스테레오/메르카토 위치 계산(라벨용, project()와 동일)
      const projectJS=(lon,lat)=>{const morph=U.morph.value,lens=U.lens.value,rY=U.uRotY.value,rXv=U.uRotX.value,l0=U.uLon0.value,la0=U.uLat0.value;
        const loR=lon*D2R, laR=lat*D2R, latC=THREE.MathUtils.clamp(laR,-1.4661,1.4661);
        const lonC=U.uLonC.value;let lonRel=loR-lonC;lonRel=Math.atan2(Math.sin(lonRel),Math.cos(lonRel)); // 셰이더와 동일한 seam 상대 메르카토
        const pl=new THREE.Vector3((lonC+lonRel)*MS, Math.log(Math.tan(Math.PI/4+latC/2))*MS, 0.02);
        const slon=loR-l0,sl0=Math.sin(la0),cl0=Math.cos(la0),cosc=sl0*Math.sin(laR)+cl0*Math.cos(laR)*Math.cos(slon),ks=STE*2/(1+Math.max(cosc,-0.985)); // stereographic
        const st=new THREE.Vector3(ks*Math.cos(laR)*Math.sin(slon), ks*(cl0*Math.sin(laR)-sl0*Math.cos(laR)*Math.cos(slon)), 0.02);
        const sph=rotX(rotY(lonLatToVec3(lon,lat,1.02),rY),rXv);
        return sph.multiplyScalar(1-morph-lens).add(pl.multiplyScalar(morph)).add(st.multiplyScalar(lens));};

      const ray=new THREE.Raycaster(),ptr=new THREE.Vector2(),plane0=new THREE.Plane(new THREE.Vector3(0,0,1),0),unit=new THREE.Sphere(new THREE.Vector3(),1);
      let downXY=null,dragLens=null,ptrDown=false;const dom=renderer.domElement;
      dom.addEventListener('pointerdown',e=>{downXY=[e.clientX,e.clientY];ptrDown=true;if(S.current.view==='lens')dragLens=[e.clientX,e.clientY];});
      dom.addEventListener('pointermove',e=>{if(dragLens&&(e.buttons&1)){ // 렌즈: 시선(중심) 회전 = 구 안에서 둘러보기(원본 0.28°/px)
        const k=0.30*D2R,dx=e.clientX-dragLens[0],dy=e.clientY-dragLens[1];
        U.uLon0.value-=dx*k;U.uLat0.value=THREE.MathUtils.clamp(U.uLat0.value+dy*k,-1.45,1.45);dragLens=[e.clientX,e.clientY];}});
      window.addEventListener('pointerup',()=>{dragLens=null;ptrDown=false;});
      // 트랙패드 제스처(원본 v15): 핀치(ctrlKey wheel)=줌, 두 손가락 스크롤=이동/회전, 마우스 휠(가로0+큰 세로델타)=줌.
      // mount 캡처 단계에서 가로채 OrbitControls(canvas 리스너)보다 먼저 분기.
      mount.addEventListener('wheel',e=>{const st=S.current;
        const isPinch=e.ctrlKey, isWheel=!isPinch&&e.deltaX===0&&Math.abs(e.deltaY)>=30;
        if(isWheel)return;                                        // 마우스 휠 → OrbitControls 줌
        e.preventDefault();e.stopPropagation();
        if(isPinch){dolly(Math.exp(e.deltaY*0.01));return;}       // 핀치 줌
        if(tr)return;                                             // 전환 중 무시
        if(st.view==='flat'){const wpp=2/(camera.zoom*mount.clientHeight);controls.target.x+=e.deltaX*wpp;camera.position.x+=e.deltaX*wpp;controls.target.y-=e.deltaY*wpp;camera.position.y-=e.deltaY*wpp;}
        else if(st.view==='lens'){const k=0.28*D2R;U.uLon0.value+=e.deltaX*k;U.uLat0.value=THREE.MathUtils.clamp(U.uLat0.value-e.deltaY*k,-1.45,1.45);}
        else{const sph=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
          sph.theta-=e.deltaX*0.005;sph.phi=THREE.MathUtils.clamp(sph.phi+e.deltaY*0.005,0.05,Math.PI-0.05);
          camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));camera.lookAt(controls.target);}
      },{passive:false,capture:true});
      dom.addEventListener('pointerup',e=>{if(!downXY)return;const mv=Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1]);downXY=null;if(mv>6||tr)return;
        const rect=dom.getBoundingClientRect();ptr.x=((e.clientX-rect.left)/rect.width)*2-1;ptr.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(ptr,camera);const v=S.current.view;let lon,lat;
        if(v==='globe'){const hit=ray.ray.intersectSphere(unit,new THREE.Vector3());if(!hit)return;[lon,lat]=vec3ToLonLat(rotY(rotX(hit,-U.uRotX.value),-U.uRotY.value));}
        else if(v==='flat'){const hit=ray.ray.intersectPlane(plane0,new THREE.Vector3());if(!hit)return;lon=R2D*(hit.x/MS);lat=R2D*(2*Math.atan(Math.exp(hit.y/MS))-Math.PI/2);lon=((lon+180)%360+360)%360-180;if(Math.abs(lat)>85)return;}
        else{const hit=ray.ray.intersectPlane(plane0,new THREE.Vector3());if(!hit)return; // 렌즈=stereographic 역투영
          const X=hit.x,Y=hit.y,rho=Math.hypot(X,Y),lo0=U.uLon0.value,la0=U.uLat0.value;
          if(rho<1e-6){lon=R2D*lo0;lat=R2D*la0;}else{const c=2*Math.atan2(rho,2*STE),sc=Math.sin(c),cc=Math.cos(c); // r=2·STE·tan(c/2)
            lat=R2D*Math.asin(THREE.MathUtils.clamp(cc*Math.sin(la0)+Y*sc*Math.cos(la0)/rho,-1,1));
            lon=R2D*(lo0+Math.atan2(X*sc, rho*Math.cos(la0)*cc-Y*Math.sin(la0)*sc));}
          lon=((lon+180)%360+360)%360-180;}
        const cur=S.current.sel;
        const c=world.features.find(f=>geoContains(f,[lon,lat]));
        if(c){const ns=S.current.country?{type:'country',name:c.properties.n,key:c.properties.c}:{type:'continent',key:c.properties.c};setSel(sameSel(cur,ns)?null:ns);return;} // 재선택=해제
        if(S.current.country){setSel(null);return;} // 국가 모드: 물 클릭=선택 해제(원본과 동일, 대양 선택 안 함)
        let ok=null;for(const k of OCEAN_PRIORITY)if(oceans[k]&&geoContains({type:'Feature',geometry:oceans[k]},[lon,lat])){ok=k;break;}
        const ns=ok?{type:'ocean',key:ok}:null;setSel(ns&&sameSel(cur,ns)?null:ns);});

      const onResize=()=>{const W=mount.clientWidth,H=mount.clientHeight,a=W/H;camera.left=-a;camera.right=a;camera.top=1;camera.bottom=-1;camera.updateProjectionMatrix();renderer.setSize(W,H);uRes.value.set(W,H);uScreen.value.set(renderer.domElement.width,renderer.domElement.height);};
      window.addEventListener('resize',onResize);
      const clock=new THREE.Clock(),v3=new THREE.Vector3();
      const loop=()=>{if(disposed)return;raf=requestAnimationFrame(loop);const dt=clock.getDelta();const st=S.current;
        u.sunLat.value=solarDeclDeg(st.month);
        if(st.dayNight&&st.dnPlay&&!ptrDown&&!tr){ // 원본 v24: 평면=시간 흐름(12°/s), 구·렌즈=지구 자전(8°/s, 그림자는 지리에 부착돼 함께 회전)
          if(st.view==='flat')st.sunLon=((st.sunLon-dt*12+540)%360)-180;
          else if(st.view==='globe')U.uRotY.value-=dt*8*D2R;
          else U.uLon0.value=((U.uLon0.value+dt*8*D2R+Math.PI*3)%(Math.PI*2))-Math.PI;
        }
        u.sunLon.value=st.sunLon;
        const bt=THREE.MathUtils.clamp((camera.zoom-3)/6,0,1);borderMat.uniforms.uColor.value.copy(BORDER_DARK).lerp(BORDER_LIT,bt); // 딥줌에서만 경계선 밝게
        if(borderClones){borderClones.blsL.material.uniforms.uColor.value.copy(borderMat.uniforms.uColor.value);borderClones.blsR.material.uniforms.uColor.value.copy(borderMat.uniforms.uColor.value);}
        if(tr){tr.t=Math.min(1,tr.t+dt/tr.dur);const k=ease(tr.t);
          U.morph.value=tr.from.morph+(tr.to.morph-tr.from.morph)*k;U.lens.value=tr.from.lens+(tr.to.lens-tr.from.lens)*k;U.uRotY.value=tr.from.rotY+(tr.to.rotY-tr.from.rotY)*k;U.uRotX.value=tr.from.rotX+(tr.to.rotX-tr.from.rotX)*k;U.uLon0.value=tr.from.lon0+(tr.to.lon0-tr.from.lon0)*k;U.uLat0.value=tr.from.lat0+(tr.to.lat0-tr.from.lat0)*k;U.uLonC.value=tr.from.lonC+(tr.to.lonC-tr.from.lonC)*k;
          camera.zoom=tr.from.zoom+(tr.to.zoom-tr.from.zoom)*k;camera.updateProjectionMatrix();camera.position.lerpVectors(tr.from.pos,tr.to.pos,k);controls.target.lerpVectors(tr.from.tgt,tr.to.tgt,k);
          if(tr.t>=1){const v=tr.v;tr=null;settleView(v);}}
        if(!tr) applyGrid(); // 줌 적응형 격자 갱신(#2, 레벨 바뀔 때만 재빌드)
        // 클론 알파: 정상상태 평면=1(무한스크롤). 전환 뜯김 마스킹(trDatelineNear)은 seam 파킹으로 불필요해져 삭제 —
        // 전환 중엔 평면 근접(morph≥0.8)에서만 페이드 인/아웃: 넓은 화면에서 ±180° 밖 가장자리 커버 + settle 시 타일 팝인 방지(클론은 seam 상대라 본체와 연속).
        uCloneAmt.value = tr ? THREE.MathUtils.smoothstep(U.morph.value,0.8,1.0) : (st.view==='flat'?1:0);
        const isFlat=st.view==='flat'&&!tr;tileL.visible=tileR.visible=uCloneAmt.value>0.004;gridFlat.visible=isFlat;
        if(borderClones)borderClones.blsL.visible=borderClones.blsR.visible=tileL.visible;
        if(fillClones)fillClones.fmeshL.visible=fillClones.fmeshR.visible=tileL.visible;
        // seam 패치는 morph>0(평면 성분이 조금이라도 섞인 모든 상태: 정상상태 평면 + 전환 도중)에서 항상 표시 — 전환 중에만 꺼두면
        // (구·렌즈↔평면 전환이 uLonC 아는 것 없이 그 순간 seam이 화면에 걸쳐 뜯겨 보임: "태평양에서 전환 시 지도가 뜯기는" 버그의 원인이었음.
        const morphOn=U.morph.value>0.001;
        bgMesh.visible=meshPatch.visible=morphOn; tileLp.visible=tileL.visible; tileRp.visible=tileR.visible;
        glow.material.opacity=0.9*Math.max(0,1-U.morph.value-U.lens.value);glow.visible=glow.material.opacity>0.02;
        controls.update();
        if(isFlat){ // 좌우 무한 순환 + 세로 레터박스 방지
          if(controls.target.x>WORLD_W/2){controls.target.x-=WORLD_W;camera.position.x-=WORLD_W;}else if(controls.target.x<-WORLD_W/2){controls.target.x+=WORLD_W;camera.position.x+=WORLD_W;}
          const hh=1/camera.zoom, lim=Math.max(0,MAP_HALF-hh);   // 직교: 보이는 월드 반높이
          const cy=THREE.MathUtils.clamp(controls.target.y,-lim,lim), dy=cy-controls.target.y; if(dy){controls.target.y=cy;camera.position.y+=dy;}
          U.uLonC.value=0; // 정상상태 평면: seam(모프 갭)을 경도 180°(태평양)에 고정 → 육지 안 지남 + oceanGrad 배경이 갭을 바다색으로 채워 검은선 소멸. uLonC는 seam 위치만 바꾸고 콘텐츠 위치는 불변.
        }
        renderer.render(scene,camera);
        const globeish=U.morph.value<0.5&&U.lens.value<0.5;
        for(const key in labels){const {el,anchor}=labels[key];const w3=projectJS(anchor[0],anchor[1]);let faceOk=true;
          if(globeish){const nrm=rotX(rotY(lonLatToVec3(anchor[0],anchor[1],1),U.uRotY.value),U.uRotX.value);faceOk=nrm.dot(v3.copy(camera.position).sub(w3).normalize())>0.02;}
          const p=w3.clone().project(camera);
          if(!faceOk||p.z>1||Math.abs(p.x)>1.06||Math.abs(p.y)>1.06){el.style.display='none';continue;}
          el.style.display='block';el.style.left=((p.x*0.5+0.5)*mount.clientWidth)+'px';el.style.top=((-p.y*0.5+0.5)*mount.clientHeight)+'px';}
      };
      loop();setStatus('');
      cleanupFn=()=>{window.removeEventListener('resize',onResize);cancelAnimationFrame(raf);controls.dispose();renderer.dispose();if(dom.parentNode)dom.parentNode.removeChild(dom);if(labelRef.current)labelRef.current.innerHTML='';};
      if(disposed)cleanupFn();
    })();
    return ()=>{disposed=true;cancelAnimationFrame(raf);if(cleanupFn)cleanupFn();};
  },[]);

  const info=sel&&(sel.type==='ocean'?{sw:OCEAN[sel.key].color,en:OCEAN[sel.key].en,kr:OCEAN[sel.key].ko,fact:OCEAN[sel.key].fact}
    :sel.type==='continent'?{sw:CONT[sel.key].color,en:CONT[sel.key].en,kr:CONT[sel.key].ko,fact:CONT[sel.key].fact}
    :{sw:(CONT[sel.key]||{}).color||'#888',en:sel.name,kr:sel.name,fact:CONT[sel.key]?`${CONT[sel.key].ko} 대륙`:''});

  return (
    <div id="app" className="gl-app">
      <div className="topbar"><div className="title-wrap"><div className="kicker">World Map · Interactive</div><div className="title">세계 지도<span className="en">6대륙 5대양</span></div></div></div>
      <div id="stage" onPointerDownCapture={()=>setHint(false)}><div ref={mountRef} className="gl-canvas" /><div ref={labelRef} className="gl-labels" /></div>
      {status && <div className="gl-status">{status}</div>}
      <div className={'info'+(info?' show':'')}>{info&&<><div className="swatch" style={{background:info.sw}} /><div className="en">{info.en}</div><div className="kr">{info.kr}</div><div className="fact">{info.fact}</div></>}</div>
      <div className="legend"><div className="legend-cols">
        <div className="legend-col"><h4>6 Continents</h4>{CONT_ORDER.map(k=>(<button key={k} className={'chip'+(sel&&sel.type==='continent'&&sel.key===k?' on':'')} onClick={()=>api.current.pickContinent&&api.current.pickContinent(k)}><span className="dot" style={{background:CONT[k].color}} /><span>{CONT[k].ko}</span><small>{CONT[k].en.split(' ')[0]}</small></button>))}</div>
        <div className="legend-col"><h4>5 Oceans</h4>{OCEAN_ORDER.map(k=>(<button key={k} className={'chip'+(sel&&sel.type==='ocean'&&sel.key===k?' on':'')} onClick={()=>api.current.pickOcean&&api.current.pickOcean(k)}><span className="dot" style={{background:OCEAN[k].color}} /><span>{OCEAN[k].ko}</span><small>{OCEAN[k].en.split(' ')[0]}</small></button>))}</div>
      </div><div className="note">남극(Antarctica)은 6대륙에서 제외</div></div>
      <div className="grid-panel">
        <h4>Grid</h4>
        <label className="tg"><input type="checkbox" checked={grat} onChange={e=>setGrat(e.target.checked)} /><span>위경도 격자</span></label>
        <label className="tg"><input type="checkbox" checked={eq} onChange={e=>setEq(e.target.checked)} /><span>적도</span></label>
        <label className="tg"><input type="checkbox" checked={prime} onChange={e=>setPrime(e.target.checked)} /><span>본초자오선</span></label>
        <label className="tg"><input type="checkbox" checked={dateline} onChange={e=>setDateline(e.target.checked)} /><span>날짜변경선</span></label>
        <div className="step"><span>간격</span><input type="number" min="5" max="90" step="5" value={step} onChange={e=>setStep(e.target.value)} /><span>°</span></div>
        <label className="tg tg-sep"><input type="checkbox" checked={country} onChange={e=>{setCountry(e.target.checked);setSel(null);}} /><span>국가 선택</span></label>
        <label className="tg"><input type="checkbox" checked={dayNight} onChange={e=>setDayNight(e.target.checked)} /><span>낮과 밤</span></label>
        {dayNight && <div className="daynight-ctl"><button className={'dn-btn'+(dnPlay?' on':'')} onClick={()=>setDnPlay(p=>!p)}>{dnPlay?'❚❚':'▶'}</button><input type="range" min="1" max="12" step="1" value={month} onChange={e=>setMonth(+e.target.value)} /><span className="dn-lbl">{MONTHS[month-1]}</span></div>}
      </div>
      <div className="projseg">
        <button className={view==='flat'?'on':''} onClick={()=>setView('flat')}>평면</button>
        <button className={view==='lens'?'on':''} onClick={()=>setView('lens')}>Focus Lens</button>
        <button className={view==='globe'?'on':''} onClick={()=>setView('globe')}>지구본</button>
      </div>
      <div className="controls">
        <button className="ctrl" aria-label="확대" onClick={()=>api.current.dolly&&api.current.dolly(0.8)}>+</button>
        <button className="ctrl" aria-label="축소" onClick={()=>api.current.dolly&&api.current.dolly(1.25)}>−</button>
        <button className="ctrl home" aria-label="처음으로" onClick={()=>{setSel(null);S.current.homeReq=true;if(view==='flat')api.current.goView&&api.current.goView('flat');else setView('flat');}}>⟳</button>
      </div>
      <div className={'hint'+(hint?'':' off')}>{view==='flat'?'드래그하면 지도가 좌우로 끝없이 이어집니다 · 대륙을 클릭해 보세요':view==='lens'?'드래그로 렌즈 회전 · 대륙을 클릭해 보세요':'드래그로 회전 · 휠로 확대 · 대륙을 클릭해 보세요'}</div>
      <div className="watermark">{MODE_WM[view]}</div>
      <footer className="ps-footer">Designed by <span className="ps-signature">parcyun studio</span> · <a href="https://www.instagram.com/parcyun" className="ps-ig" target="_blank" rel="noopener">@parcyun</a> · <span style={{color:'var(--ps-primary)'}}>#3 개발자 뷰</span></footer>
      {guide && <div className="guide" onClick={()=>setGuide(false)}>
        <div className="guide-card" onClick={e=>e.stopPropagation()}>
          <div className="guide-kicker">World Map · Interactive</div>
          <h2>세계 지도 사용법</h2>
          <ul className="guide-list">
            <li><b>도법 전환</b> — 상단 <em>평면 · Focus Lens · 지구본</em>으로 3가지 시점을 오갑니다.</li>
            <li><b>탐색</b> — 드래그로 이동·회전, 휠/핀치로 확대·축소, <em>+ − ⟳</em>로 정밀 조작.</li>
            <li><b>선택</b> — 대륙·대양을 클릭하면 강조·정보 표시, 다시 클릭하면 해제됩니다.</li>
            <li><b>격자</b> — 좌측 패널에서 위경도·적도·본초자오선·날짜변경선·낮과 밤을 켤 수 있어요.</li>
          </ul>
          <button className="guide-btn" onClick={()=>setGuide(false)}>시작하기</button>
          <div className="guide-hint">화면 아무 곳이나 눌러도 닫혀요</div>
        </div>
      </div>}
      <style>{`
        .gl-app{--ps-primary:#FFB11A;--bg:#04060B;--surface-1:#101319;--surface-2:#191D26;--border:#2A2F3A;--text:#fff;--text-2:#8C93A1;--font-kr:'Pretendard Variable','Pretendard','Montserrat',system-ui,sans-serif;--font-en:'Montserrat',sans-serif;--font-sig:'Covered By Your Grace',cursive;--ease:cubic-bezier(0.16,1,0.3,1);position:fixed;inset:0;background:var(--bg);color:var(--text);font-family:var(--font-kr);user-select:none;overflow:hidden}
        .gl-canvas{position:absolute;inset:0}.gl-labels{position:absolute;inset:0;pointer-events:none}#stage{position:absolute;inset:0;cursor:grab}
        .gl-lbl{position:absolute;transform:translate(-50%,-50%);letter-spacing:.02em;text-shadow:0 0 3px #000,0 0 3px #000,0 1px 4px #000;white-space:nowrap;text-align:center}
        .gl-lbl.cont{font-weight:600;color:#fff}
        .gl-lbl.ocn .kr{color:#9DB0D6;font-weight:300;font-size:14px;letter-spacing:.18em}
        .gl-lbl.ocn .en{font-family:var(--font-en);font-weight:300;color:#56627E;font-size:8.5px;letter-spacing:.32em;text-transform:uppercase;margin-top:2px}
        .gl-lbl.ocn{transition:opacity .25s var(--ease),filter .25s var(--ease)}
        .gl-lbl.ocn.dim{opacity:.22}
        .gl-lbl.ocn.active{filter:drop-shadow(0 0 8px rgba(255,177,26,.55))}
        .gl-lbl.ocn.active .kr{color:var(--ps-primary);font-weight:500}
        .gl-lbl.ocn.active .en{color:var(--ps-primary)}
        .gl-status{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--ps-primary);font-size:14px;z-index:40}
        .topbar{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;padding:18px 22px;pointer-events:none}.title-wrap{pointer-events:auto}
        .kicker{font-family:var(--font-en);font-size:10px;letter-spacing:.28em;color:var(--ps-primary);font-weight:600;text-transform:uppercase}
        .title{font-size:19px;font-weight:600;letter-spacing:-.01em;margin-top:3px}.title .en{font-family:var(--font-en);color:var(--text-2);font-weight:300;font-size:13px;margin-left:8px}
        .legend{position:absolute;left:22px;bottom:54px;z-index:30;display:flex;flex-direction:column;gap:9px;background:rgba(16,19,25,.72);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:16px;padding:14px 16px;max-width:340px}
        .legend-cols{display:flex;gap:16px}.legend-col{display:flex;flex-direction:column;gap:6px;min-width:104px}
        .legend h4{font-family:var(--font-en);font-size:9px;letter-spacing:.22em;color:var(--text-2);font-weight:600;text-transform:uppercase;margin-bottom:3px}
        .chip{display:flex;align-items:center;gap:9px;cursor:pointer;border:none;background:none;padding:3px 4px;border-radius:8px;width:100%;text-align:left;transition:background .2s}
        .chip:hover{background:rgba(255,255,255,.06)}.chip.on{background:rgba(255,177,26,.12)}
        .dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}.chip>span:not(.dot){font-size:13px;color:var(--text);font-weight:300}.chip small{font-family:var(--font-en);font-size:9px;color:var(--text-2);margin-left:auto}
        .legend .note{font-size:10px;color:var(--text-2);line-height:1.45;margin-top:5px;border-top:1px solid var(--border);padding-top:7px}
        .grid-panel{position:absolute;left:22px;top:74px;z-index:30;display:flex;flex-direction:column;gap:7px;background:rgba(16,19,25,.72);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:16px;padding:13px 15px;min-width:164px}
        .grid-panel h4{font-family:var(--font-en);font-size:9px;letter-spacing:.22em;color:var(--text-2);font-weight:600;text-transform:uppercase;margin-bottom:2px}
        .grid-panel .tg{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text);font-weight:300;cursor:pointer}
        .grid-panel .tg small{color:var(--text-2)}.tg-sep{margin-top:8px;border-top:1px solid var(--border);padding-top:9px}
        .grid-panel .tg input[type=checkbox]{appearance:none;width:30px;height:17px;border-radius:9999px;background:var(--surface-2);border:1px solid var(--border);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
        .grid-panel .tg input[type=checkbox]::after{content:"";position:absolute;top:1.5px;left:1.5px;width:12px;height:12px;border-radius:50%;background:#8C93A1;transition:all .2s}
        .grid-panel .tg input:checked{background:rgba(255,177,26,.28);border-color:var(--ps-primary)}.grid-panel .tg input:checked::after{left:14px;background:var(--ps-primary)}
        .grid-panel .step{display:flex;align-items:center;gap:6px;margin-top:3px;border-top:1px solid var(--border);padding-top:8px}
        .grid-panel .step span{font-size:12px;color:var(--text-2);font-weight:300}
        .grid-panel .step input[type=number]{width:50px;background:var(--surface-1);border:1px solid var(--border);border-radius:7px;color:var(--text);font-family:var(--font-en);font-size:12px;padding:4px 6px;text-align:center}
        .daynight-ctl{display:flex;align-items:center;gap:9px;margin-top:8px;padding:8px 10px;background:rgba(255,177,26,.06);border:1px solid rgba(255,177,26,.18);border-radius:10px}
        .dn-btn{width:26px;height:24px;border:1px solid var(--border);border-radius:7px;background:var(--surface-1);color:var(--text-2);cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;transition:all .16s var(--ease);flex-shrink:0}
        .dn-btn.on{border-color:var(--ps-primary);color:var(--ps-primary);background:rgba(255,177,26,.12)}
        .daynight-ctl input[type=range]{flex:1;min-width:64px;height:3px;accent-color:var(--ps-primary);cursor:pointer}
        .dn-lbl{font-size:11px;color:var(--ps-primary);min-width:28px;text-align:right;font-variant-numeric:tabular-nums;font-weight:500}
        .controls{position:absolute;right:22px;bottom:54px;z-index:30;display:flex;flex-direction:column;gap:8px}
        .ctrl{width:42px;height:42px;border-radius:12px;border:1px solid var(--border);background:rgba(16,19,25,.72);backdrop-filter:blur(14px);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s var(--ease);font-family:var(--font-en)}
        .ctrl:hover{border-color:var(--ps-primary);color:var(--ps-primary)}.ctrl:active{transform:scale(.93)}.ctrl.home{font-size:15px}
        .info{position:absolute;top:74px;right:22px;z-index:30;width:248px;background:rgba(16,19,25,.82);backdrop-filter:blur(16px);border:1px solid var(--border);border-radius:20px;padding:20px;opacity:0;transform:translateY(-8px);pointer-events:none;transition:all .3s var(--ease)}
        .info.show{opacity:1;transform:translateY(0)}.info .swatch{width:34px;height:34px;border-radius:9px;margin-bottom:12px}.info .en{font-family:var(--font-en);font-size:10px;letter-spacing:.22em;color:var(--text-2);font-weight:600;text-transform:uppercase}
        .info .kr{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:2px 0 10px}.info .fact{font-size:13px;line-height:1.6;color:#C5CAD4;font-weight:300}
        .hint{position:absolute;bottom:54px;left:50%;transform:translateX(-50%);z-index:25;font-size:11px;color:var(--text-2);font-weight:300;text-align:center;background:rgba(4,6,11,.5);padding:6px 14px;border-radius:9999px;transition:opacity .4s}
        .hint.off{opacity:0;pointer-events:none}
        .guide{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(4,6,11,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:guideIn .3s var(--ease)}
        @keyframes guideIn{from{opacity:0}to{opacity:1}}
        .guide-card{width:min(440px,90vw);background:rgba(16,19,25,.94);border:1px solid var(--border);border-radius:22px;padding:30px 30px 24px;box-shadow:0 24px 70px rgba(0,0,0,.5);animation:guideCard .4s var(--ease)}
        @keyframes guideCard{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
        .guide-kicker{font-family:var(--font-en);font-size:10px;letter-spacing:.28em;color:var(--ps-primary);font-weight:600;text-transform:uppercase}
        .guide-card h2{font-size:23px;font-weight:700;letter-spacing:-.01em;margin:6px 0 16px}
        .guide-list{list-style:none;display:flex;flex-direction:column;gap:11px;margin:0 0 22px}
        .guide-list li{font-size:13.5px;line-height:1.5;color:#C5CAD4;font-weight:300;padding-left:18px;position:relative}
        .guide-list li::before{content:"";position:absolute;left:0;top:7px;width:6px;height:6px;border-radius:2px;background:var(--ps-primary)}
        .guide-list b{color:#fff;font-weight:600}.guide-list em{color:var(--ps-primary);font-style:normal;font-weight:500}
        .guide-btn{width:100%;padding:12px;border:0;border-radius:12px;background:var(--ps-primary);color:#0A0C10;font-family:var(--font-kr);font-size:14px;font-weight:700;cursor:pointer;transition:filter .16s var(--ease)}
        .guide-btn:hover{filter:brightness(1.08)}
        .guide-hint{text-align:center;font-size:11px;color:var(--text-2);font-weight:300;margin-top:12px}
        .projseg{position:absolute;top:18px;left:50%;transform:translateX(-50%);z-index:30;display:flex;gap:2px;padding:3px;border-radius:12px;border:1px solid var(--border);background:rgba(16,19,25,.72);backdrop-filter:blur(14px)}
        .projseg button{border:0;background:transparent;color:var(--text-2);font-family:var(--font-kr);font-size:12px;font-weight:500;padding:6px 13px;border-radius:9px;cursor:pointer;transition:all .18s var(--ease);white-space:nowrap}
        .projseg button:hover{color:#fff}.projseg button.on{background:var(--ps-primary);color:#0A0C10;font-weight:600}
        .watermark{position:absolute;bottom:50px;left:50%;transform:translateX(-50%);z-index:5;font-family:var(--font-en);font-size:9px;letter-spacing:.4em;color:#323a4a;text-transform:uppercase;pointer-events:none}
        .ps-footer{position:fixed;bottom:14px;right:20px;font-family:var(--font-en);font-weight:300;font-size:8pt;color:var(--text-2);display:flex;align-items:center;gap:8px;z-index:9999}
        .ps-signature{font-family:var(--font-sig);font-size:11pt;color:var(--ps-primary)}.ps-ig{color:inherit;text-decoration:none}.ps-ig:hover{color:var(--ps-primary)}
        @media(max-width:640px){.info{width:200px;padding:16px}.info .kr{font-size:24px}.legend{max-width:200px;padding:11px 13px;bottom:48px;left:14px}.legend-col{min-width:88px}.controls{right:14px;bottom:48px}.topbar{padding:14px 16px}.title{font-size:16px}.title .en{display:none}.grid-panel{left:14px;top:64px;min-width:0;padding:10px 12px}}
      `}</style>
    </div>
  );
}
