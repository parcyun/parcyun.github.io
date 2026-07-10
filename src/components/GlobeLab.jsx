import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { countryInfo } from './globeCountryData.js';
import { STR, MONTHS_I18N } from './globeI18n.js';
import { GLSL, STRADDLE, LENSCLIP, meshVert, cloneVert, OCEANGRAD, meshFrag, cloneFrag, lineVert, lineFrag, fatLineVert, fatLineFrag, fillVert, fillFrag } from './globeShaders.js';
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
function glowTexture(){const S=512,cv=document.createElement('canvas');cv.width=S;cv.height=S;const c=cv.getContext('2d');const g=c.createRadialGradient(S/2,S/2,S*0.30,S/2,S/2,S*0.5);
  // 골든 글로우 제거, 네이비만 표면(구 반지름 1, 스프라이트 scale 2.7 기준 gradient fraction≈0.35 지점) 바로 바깥에 얇은 밴드로
  g.addColorStop(0,'rgba(120,150,210,0)');g.addColorStop(0.30,'rgba(120,150,210,0)');g.addColorStop(0.38,'rgba(120,150,210,0.16)');g.addColorStop(0.50,'rgba(120,150,210,0)');g.addColorStop(1,'rgba(120,150,210,0)');
  c.fillStyle=g;c.fillRect(0,0,S,S);return rawTex(cv);}

// 위성 사진(#2,3): Esri World Imagery XYZ 타일(웹 메르카토르)을 받아 mosaic로 합친 뒤 등장방형(equirectangular)으로 재투영.
// 무료·API키 불필요·상업적 사용 가능(사용자 선택). 웹메르카토르는 위도 ±85.05°까지만 커버 → 극지방은 검정으로 남김(우리 지형도 ±84 클립이라 무해).
const WEBMERC_LAT=85.05112878;
const ESRI_URL=(z,x,y)=>`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
function loadTileImg(src){return new Promise((res,rej)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>res(im);im.onerror=()=>rej(new Error('tile fail '+src));im.src=src;});}
// z=줌레벨(타일=2^z×2^z). onProgress(done,total). 반환: {tex, canvas}. 실패 타일은 건너뜀(검정).
async function buildSatelliteTexture(z,onProgress,shouldAbort){
  const n=1<<z, TS=256, mosaicW=n*TS, mosaicH=n*TS;
  const mos=document.createElement('canvas');mos.width=mosaicW;mos.height=mosaicH;const mc=mos.getContext('2d');
  mc.fillStyle='#0a0f18';mc.fillRect(0,0,mosaicW,mosaicH);
  const coords=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++)coords.push([x,y]);
  let done=0;const CONC=8; // 동시 8개 fetch(브라우저 커넥션 한도 내)
  let idx=0;
  const worker=async()=>{while(idx<coords.length){if(shouldAbort&&shouldAbort())return;const i=idx++;const [x,y]=coords[i];
    try{const im=await loadTileImg(ESRI_URL(z,x,y));mc.drawImage(im,x*TS,y*TS,TS,TS);}catch(e){/* 실패 타일=검정 유지 */}
    done++;if(onProgress)onProgress(done,coords.length);}};
  await Promise.all(Array.from({length:CONC},()=>worker()));
  if(shouldAbort&&shouldAbort())return null;
  // 재투영: x(경도)는 메르카토르·등장방형 둘 다 선형이라 그대로, y(위도)만 비선형 리매핑 → 출력 행마다 mosaic 1행을 수평 슬라이스 복사.
  const OW=mosaicW, OH=OW/2, out=document.createElement('canvas');out.width=OW;out.height=OH;const oc=out.getContext('2d');
  oc.fillStyle='#0a0f18';oc.fillRect(0,0,OW,OH);
  for(let py=0;py<OH;py++){const lat=90-(py+0.5)/OH*180;if(Math.abs(lat)>WEBMERC_LAT)continue; // 극지방=검정
    const latR=lat*D2R,myN=(1-Math.log(Math.tan(Math.PI/4+latR/2))/Math.PI)/2; // 0(북)..1(남)
    oc.drawImage(mos,0,myN*mosaicH,mosaicW,1,0,py,OW,1);}
  return {tex:rawTex(out),canvas:out};
}

const densify=(pts,maxStep=3)=>{const out=[pts[0]];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/maxStep));for(let j=1;j<=n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}return out;};

function morphGeom(lonN,latN){const g=new THREE.BufferGeometry();const pos=[],uv=[],tri=[],triLat=[];
  // 논인덱스드(삼각형 전개, 180×90×6≈97k 정점): 삼각형별 aTriLon/aTriLat(세 꼭짓점 경위도 rad, 세 정점 동일값)
  // → 셰이더에서 seam straddle 붕괴 + 렌즈 대척점 근처 삼각형 사전 붕괴(정점 단계, #4 폭주 방지)용
  const V=[];for(let j=0;j<=latN;j++){const lat=-90+180*j/latN;for(let i=0;i<=lonN;i++){const lon=-180+360*i/lonN;const s=lonLatToVec3(lon,lat,1);V.push([s.x,s.y,s.z,(lon+180)/360,(lat+90)/180,lon*D2R,lat*D2R]);}}
  const row=lonN+1,pushTri=(a,b,c)=>{const l0=V[a][5],l1=V[b][5],l2=V[c][5],a0=V[a][6],a1=V[b][6],a2=V[c][6];for(const vi of [a,b,c]){const v=V[vi];pos.push(v[0],v[1],v[2]);uv.push(v[3],v[4]);tri.push(l0,l1,l2);triLat.push(a0,a1,a2);}};
  for(let j=0;j<latN;j++)for(let i=0;i<lonN;i++){const a=j*row+i;pushTri(a,a+row,a+1);pushTri(a+1,a+row,a+row+1);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('aTriLon',new THREE.Float32BufferAttribute(tri,3));g.setAttribute('aTriLat',new THREE.Float32BufferAttribute(triLat,3));return g;}
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
// #5 실제 크기 비교(thetruesize.com): 메르카토르는 위도가 높을수록 면적을 과장. 나라를 다른 위도로 끌면
// 실제(지상) 크기를 유지하도록 렌더 크기를 sec(위도)에 맞춰 재조정 → 위도별 왜곡을 눈으로 비교.
const tsMercY=(latDeg)=>{const l=THREE.MathUtils.clamp(latDeg,-84,84)*D2R;return Math.log(Math.tan(Math.PI/4+l/2))*MS;};
function buildTrueSizeShape(features){ // features=선택된 대륙/국가의 GeoJSON feature 배열. 반환: {lat0, x0,y0, fill(merc 상대 삼각형 xy쌍), outlines[각 링 세그먼트 xy쌍]}
  const polys=[];for(const f of features){const g=f.geometry;const ps=g.type==='Polygon'?[g.coordinates]:g.coordinates;for(const p of ps)polys.push(p);}
  let best=null,bestA=-1; // 가장 큰 외곽링으로 중심 위도 산출
  for(const poly of polys){const o=poly[0];if(!o||o.length<4)continue;let a=0;for(let i=0;i<o.length-1;i++)a+=o[i][0]*o[i+1][1]-o[i+1][0]*o[i][1];a=Math.abs(a);if(a>bestA){bestA=a;best=o;}}
  if(!best)return null;
  let clon=0,clat=0;for(const p of best){clon+=p[0];clat+=p[1];}clon/=best.length;clat/=best.length;
  const MX=(lonDeg)=>lonDeg*D2R*MS; // 경도(도)→월드 x: 지도 평면과 동일하게 라디안·MS. (이전엔 도×MS라 x가 ~57배 늘어나 좌우로 극단 스트레치됐음 #4)
  const x0=MX(clon),y0=tsMercY(clat),lat0=clat*D2R;
  const fill=[],outlines=[];
  for(const poly of polys){const o=poly[0];if(!o||o.length<4)continue;
    let mn=180,mx=-180;for(const p of o){if(p[0]<mn)mn=p[0];if(p[0]>mx)mx=p[0];}if(mx-mn>180)continue; // 반자오선 횡단 스킵
    const shape=new THREE.Shape(o.map(p=>new THREE.Vector2(MX(p[0])-x0,tsMercY(p[1])-y0)));
    for(let h=1;h<poly.length;h++){const r=poly[h];if(r&&r.length>=4)shape.holes.push(new THREE.Path(r.map(p=>new THREE.Vector2(MX(p[0])-x0,tsMercY(p[1])-y0))));}
    let sg;try{sg=new THREE.ShapeGeometry(shape);}catch(e){continue;}
    const ps=sg.attributes.position.array,ix=sg.index?sg.index.array:null;if(ix)for(let i=0;i<ix.length;i++)fill.push(ps[ix[i]*3],ps[ix[i]*3+1]);sg.dispose();
    for(const ring of poly){if(ring.length<2)continue;const seg=[];for(let i=0;i<ring.length-1;i++)seg.push(MX(ring[i][0])-x0,tsMercY(ring[i][1])-y0,MX(ring[i+1][0])-x0,tsMercY(ring[i+1][1])-y0);outlines.push(new Float32Array(seg));}}
  return {lat0,x0,y0,fill:new Float32Array(fill),outlines};
}

// #5 드래그 가능한 플로팅 패널(모서리 자석 스냅). 4개 모서리 중 br(우하)은 확대/축소 컨트롤·푸터가 차지 → 후보에서 제외.
// 다른 패널이 이미 차지한 모서리도 제외해 겹침 방지. 놓으면 가장 가까운 후보 모서리로 오버슛(바운스) 애니메이션.
const PANEL_M=20, PANEL_TOP=64, PANEL_BOT=64;
const CORNER_IDS=['tl','tr','bl']; // br 예약(컨트롤/푸터)
function cornerXY(corner,bw,bh,W,H){const m=PANEL_M;
  switch(corner){case 'tl':return [m,PANEL_TOP];case 'tr':return [W-bw-m,PANEL_TOP];case 'bl':return [m,H-bh-PANEL_BOT];case 'br':return [W-bw-m,H-bh-PANEL_BOT];default:return [m,PANEL_TOP];}}
function DraggablePanel({corner,onDock,otherCorner,className,children,collapsed,onHeaderTap}){
  const ref=useRef(null),posRef=useRef({x:PANEL_M,y:PANEL_TOP}),[dragging,setDragging]=useState(false);
  const measure=()=>{const el=ref.current;if(!el)return[220,200];const r=el.getBoundingClientRect();return[r.width,r.height];};
  const applyCorner=(c)=>{const el=ref.current;if(!el)return;const [bw,bh]=measure();const [x,y]=cornerXY(c,bw,bh,window.innerWidth,window.innerHeight);posRef.current={x,y};el.style.transform=`translate(${x}px,${y}px)`;};
  useLayoutEffect(()=>{applyCorner(corner);},[corner]);
  // 접힘/펼침으로 높이가 바뀌는 동안 매 프레임 코너 재계산 → 하단 도킹 패널(bl/br)은 아래 모서리에 고정된 채
  // "위로 올라가며" 펼쳐짐(요청 #7). transform 전환을 잠시 꺼서 프레임마다 즉시 추종(높이만 max-height로 부드럽게 애니메이션).
  useEffect(()=>{const el=ref.current;if(!el)return;let raf,stop=false;let t0=null;const prev=el.style.transition;el.style.transition='none';
    const tick=(now)=>{if(stop)return;if(t0==null)t0=now;applyCorner(corner);if(now-t0<470){raf=requestAnimationFrame(tick);}else{el.style.transition=prev||'';}};
    raf=requestAnimationFrame(tick);
    return()=>{stop=true;cancelAnimationFrame(raf);el.style.transition=prev||'';};},[collapsed]);
  useEffect(()=>{const on=()=>applyCorner(corner);window.addEventListener('resize',on);return()=>window.removeEventListener('resize',on);},[corner]);
  const onDown=(e)=>{ if(e.target.closest('input,button,a,select,textarea,.no-drag'))return; // 인터랙션 요소에서 시작한 드래그는 무시
    const el=ref.current,r=el.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top,startX=e.clientX,startY=e.clientY;
    const headerTap=!!e.target.closest('[data-collapse]'); let moved=false; el.style.transition='none';
    const move=(ev)=>{const dx=ev.clientX-startX,dy=ev.clientY-startY;if(!moved&&Math.hypot(dx,dy)>4){moved=true;setDragging(true);}
      if(moved){const x=ev.clientX-ox,y=ev.clientY-oy;posRef.current={x,y};el.style.transform=`translate(${x}px,${y}px)`;}};
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);el.style.transition='';
      if(!moved){setDragging(false);applyCorner(corner);if(headerTap&&onHeaderTap)onHeaderTap();return;} // 이동 없음=클릭: 헤더면 접기 토글, 도킹 변경 없음
      setDragging(false);
      const [bw,bh]=measure(),cx=posRef.current.x+bw/2,cy=posRef.current.y+bh/2;
      const cands=CORNER_IDS.filter(c=>c!==otherCorner);let best=cands[0],bd=1e18;
      for(const c of cands){const [x,y]=cornerXY(c,bw,bh,window.innerWidth,window.innerHeight);const d=(x+bw/2-cx)**2+(y+bh/2-cy)**2;if(d<bd){bd=d;best=c;}}
      if(best===corner)applyCorner(corner); onDock(best);};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);};
  return <div ref={ref} className={'floaty'+(dragging?' dragging':'')+(collapsed?' collapsed':'')+(className?' '+className:'')} onPointerDown={onDown}>{children}</div>;
}

export default function GlobeLab(){
  const mountRef=useRef(null),labelRef=useRef(null),api=useRef({});
  const S=useRef({view:'flat',country:false,dayNight:false,dnPlay:true,month:6,grat:true,eq:true,prime:false,step:20,sunLon:-90});
  const [view,setView]=useState('flat');
  const [country,setCountry]=useState(false),[dayNight,setDayNight]=useState(false),[dnPlay,setDnPlay]=useState(true),[month,setMonth]=useState(6);
  const [grat,setGrat]=useState(true),[eq,setEq]=useState(true),[prime,setPrime]=useState(false),[dateline,setDateline]=useState(false),[step,setStep]=useState(20);
  const [sel,setSel]=useState(null),[status,setStatus]=useState('로딩 중…');
  const [sat,setSat]=useState(false); // #2 위성 사진 보기
  const [satBusy,setSatBusy]=useState(null); // {pct,label} 위성 타일 로딩 진행 or null
  const [trueSize,setTrueSize]=useState(false); // #5 실제 크기 비교(평면 전용)
  const [tsInfo,setTsInfo]=useState(false); // 실제 크기 비교 설명 팝업
  const [panels,setPanels]=useState({tools:'tl',legend:'tr'}); // #6 기본: 도구=좌상, 대륙/대양=우상 · #5 드래그로 이동/스냅
  const [toolsCollapsed,setToolsCollapsed]=useState(false); // 도구 상자 접힘
  const [legendCollapsed,setLegendCollapsed]=useState(false); // 대륙/대양 상자 접힘
  const [coffee,setCoffee]=useState(false); // 커피 후원 QR 모달(메인 푸터와 동일)
  const [lang,setLang]=useState('ko'); // #10 언어 토글(한국어/영어)
  const [northUp,setNorthUp]=useState(false); // #2 정북 고정(지구본에서 북극이 항상 위)
  const [hint,setHint]=useState(true); // 힌트=일시 온보딩(원본과 동일): 7초 또는 첫 조작 시 사라짐, 뷰 전환 시 잠깐 재표시
  useEffect(()=>{setHint(true);const t=setTimeout(()=>setHint(false),7000);return()=>clearTimeout(t);},[view]);
  const [guide,setGuide]=useState(true); // #6 접속(새로고침) 시 사용 가이드 오버레이 — 클릭해서 닫기

  useEffect(()=>{Object.assign(S.current,{view,country,dayNight,dnPlay,month,grat,eq,prime,dateline,step:Math.max(5,Math.min(90,+step||20))});},[view,country,dayNight,dnPlay,month,grat,eq,prime,dateline,step]); // 간격 5–90 클램프(원본과 동일)
  useEffect(()=>{api.current.goView&&api.current.goView(view);},[view]);
  useEffect(()=>{api.current.applyGrid&&api.current.applyGrid();},[grat,eq,prime,dateline,step]);
  useEffect(()=>{S.current.sel=sel;api.current.applySel&&api.current.applySel(sel);},[sel]);
  useEffect(()=>{if(api.current.onDN)api.current.onDN(dayNight);},[dayNight]);
  useEffect(()=>{S.current.sat=sat;if(api.current.applySat)api.current.applySat(sat);},[sat]);
  useEffect(()=>{S.current.trueSize=trueSize;if(api.current.refreshTrueSize)api.current.refreshTrueSize();},[trueSize,sel,view]);
  useEffect(()=>{S.current.northUp=northUp;if(api.current.applyNorthUp)api.current.applyNorthUp(northUp);},[northUp,view]);
  useEffect(()=>{S.current.lang=lang;if(api.current.setMapLang)api.current.setMapLang(lang);},[lang]); // #3 지도 라벨 언어 동기화

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
      // 위성 사진(#2,3): satTexU=Esri 위성 타일을 등장방형(equirectangular)으로 재투영한 텍스처(첫 토글 시 생성), uSat=0→1 크로스페이드.
      // 초기엔 1×1 회색 플레이스홀더(로딩 전 uSat=0이라 실제로 샘플되진 않지만 유효 텍스처 필요).
      const phCv=document.createElement('canvas');phCv.width=phCv.height=1;{const pc=phCv.getContext('2d');pc.fillStyle='#0a0f18';pc.fillRect(0,0,1,1);}
      const satTexU={value:rawTex(phCv)};const uSat={value:0};
      let overlayTex=buildOverlay({sel:null,world,oceans});
      const u={dayTex:{value:vDay},nightTex:{value:vNight},overlayTex:{value:overlayTex},satTex:satTexU,uSat,...U,sunLon:{value:S.current.sunLon},sunLat:{value:solarDeclDeg(6)},nightBoost:{value:1},dayNightOn:{value:0},uScreen};
      const mesh=new THREE.Mesh(morphGeom(180,90),new THREE.ShaderMaterial({vertexShader:meshVert,fragmentShader:meshFrag,uniforms:u,side:THREE.DoubleSide}));
      mesh.frustumCulled=false; // 커스텀 회전 셰이더 공통 규칙(아래 grat/border와 동일 이유) — 전체 구 형상이라 우연히 안 걸렸을 뿐, 명시적으로 방지
      scene.add(mesh);
      // 평면 seam 배경: 화면 전체를 base oceanGrad로 채우는 fullscreen 삼각형(뒤에 깔림). 모프 seam 갭이 페이지 검정 대신 바다색으로 채워져 검은 세로선 제거. 평면에서만 표시(구/렌즈의 검은 우주 배경 보존).
      const bgGeo=new THREE.BufferGeometry();bgGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
      const bgMesh=new THREE.Mesh(bgGeo,new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uScreen},vertexShader:'void main(){gl_Position=vec4(position,1.0);}',fragmentShader:OCEANGRAD+'uniform vec2 uScreen;void main(){gl_FragColor=vec4(oceanGrad(gl_FragCoord.xy,uScreen),1.0);}'}));
      bgMesh.frustumCulled=false;bgMesh.renderOrder=-3;bgMesh.visible=false;scene.add(bgMesh);
      // 평면 좌우 순환용 클론 타일(±월드폭)
      const cloneMat=(off)=>new THREE.ShaderMaterial({vertexShader:cloneVert,fragmentShader:cloneFrag,side:THREE.DoubleSide,transparent:true,
        uniforms:{dayTex:u.dayTex,nightTex:u.nightTex,overlayTex:u.overlayTex,satTex:satTexU,uSat,sunLon:u.sunLon,sunLat:u.sunLat,nightBoost:u.nightBoost,dayNightOn:u.dayNightOn,morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:off},uCloneAmt,uScreen}});
      const tileL=new THREE.Mesh(mesh.geometry,cloneMat(-WORLD_W)),tileR=new THREE.Mesh(mesh.geometry,cloneMat(WORLD_W));
      tileL.frustumCulled=tileR.frustumCulled=false;tileL.visible=tileR.visible=false;scene.add(tileL,tileR);
      let borderClones=null,fillClones=null; // 국경·벡터채움의 ±WORLD_W 클론(아래서 채워짐) — 클론 타일 영역에서도 크리스프 렌더 유지
      let borderGeoRef=null,fillGeoRef=null,curDetailStep=2; // #4 줌 적응형 디테일이 재사용할 geometry 참조 + 현재 세분 간격(°)
      let fillMain=null; // 위성 모드에서 숨길 벡터 대륙 채움 메쉬(#2) — 숨겨야 실사 위성 육지가 보임(borders·labels는 유지)
      // 평면 seam 패치: uLonC+π 복사본(콘텐츠 동일, seam만 반대편으로). uLonCPatch는 고정값이 아니라 매 프레임
      // "center의 현재 uLonC + π"로 갱신되는 라이브 유니폼(아래 루프) — center의 seam이 카메라를 따라 동적으로
      // 움직여도(파킹) 두 사본이 항상 180° 떨어져 서로의 빈틈을 덮는 관계가 깨지지 않아, 어떤 팬/줌에서도 seam이 안 보임.
      const uLonCPatch={value:Math.PI};
      const patchU=Object.assign({},u,{uLonC:uLonCPatch});
      const meshPatch=new THREE.Mesh(mesh.geometry,new THREE.ShaderMaterial({vertexShader:meshVert,fragmentShader:meshFrag,uniforms:patchU,side:THREE.DoubleSide}));
      const clonePatchMat=(off)=>new THREE.ShaderMaterial({vertexShader:cloneVert,fragmentShader:cloneFrag,side:THREE.DoubleSide,transparent:true,
        uniforms:{dayTex:u.dayTex,nightTex:u.nightTex,overlayTex:u.overlayTex,satTex:satTexU,uSat,sunLon:u.sunLon,sunLat:u.sunLat,nightBoost:u.nightBoost,dayNightOn:u.dayNightOn,morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:uLonCPatch,uOffsetX:{value:off},uCloneAmt,uScreen}});
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
      // #4 줌 적응형 국경·해안선 디테일: 격자(applyGrid)와 동일한 log2 줌레벨 방식으로, 확대 단계가 오를 때마다
      // 세분 간격(maxStep)을 절반으로(=정점밀도 2배) 줄여 bg/fg geometry를 재생성 — geometry 객체 참조는 그대로 유지한 채
      // setAttribute만 교체하므로 bls/blsL/blsR/blsPatch 등 이를 공유하는 모든 메쉬가 자동으로 새 디테일을 반영.
      const buildBorderArrays=(maxStep)=>{const pos=[],geo=[],geoB=[];const addRing=(ring)=>{for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1];if(Math.abs(a[0]-b[0])>180)continue;
          const n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/maxStep)); // 원본 정점 간격이 넓은 구간(사막 한가운데 직선 국경 등) 세분 — 딥줌에서 직선 각짐(저해상도) 방지
          let pa=a;for(let j=1;j<=n;j++){const pb=j===n?b:[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n];
            const va=lonLatToVec3(pa[0],pa[1],1.0045),vb=lonLatToVec3(pb[0],pb[1],1.0045);pos.push(va.x,va.y,va.z,vb.x,vb.y,vb.z);geo.push(pa[0],pa[1],pb[0],pb[1]);geoB.push(pb[0],pb[1],pa[0],pa[1]);pa=pb;}
        }}; // aGeoB=짝 끝점 → seam 걸친 세그먼트 셰이더 붕괴(러시아·피지 등 lon180 횡단 스미어 방지)
        for(const f of world.features){const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;for(const poly of polys)for(const ring of poly)addRing(ring);}
        return {pos,geo,geoB};};
      const borderMat=(()=>{const {pos,geo,geoB}=buildBorderArrays(2);
        const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bg.setAttribute('aGeo',new THREE.Float32BufferAttribute(geo,2));bg.setAttribute('aGeoB',new THREE.Float32BufferAttribute(geoB,2));
        borderGeoRef=bg;
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
      // #4 국경과 동일하게 densify(maxStep)로 링을 먼저 세분한 뒤 삼각분할 — 이미 직선인 변을 나누는 것 자체는
      // 모양을 바꾸지 않지만, project()가 매 정점을 구면/렌즈로 휘게 투영하므로 정점이 촘촘할수록 그 곡률이 매끈해짐
      // (국경 라인과 같은 이유로 딥줌에서 해안선이 각지지 않게).
      const buildFillArrays=(maxStep)=>{const aGeo=[],aCol=[],aTri=[],aTriLat=[],tmp=new THREE.Color();
        for(const f of world.features){const col=(CONT[f.properties.c]||{}).color||'#888';tmp.set(col);
          const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
          for(const poly of polys){const outer0=poly[0];if(!outer0||outer0.length<4)continue;
            let mn=180,mx=-180;for(const p of outer0){if(p[0]<mn)mn=p[0];if(p[0]>mx)mx=p[0];}
            if(mx-mn>180)continue; // 반자오선 횡단 폴리곤 스킵(삼각분할 왜곡 방지 — 딥줌에선 텍스처 폴백)
            const outer=densify(outer0,maxStep);
            const shape=new THREE.Shape(outer.map(p=>new THREE.Vector2(p[0],p[1])));
            for(let h=1;h<poly.length;h++){const r0=poly[h];if(r0&&r0.length>=4){const r=densify(r0,maxStep);shape.holes.push(new THREE.Path(r.map(p=>new THREE.Vector2(p[0],p[1]))));}}
            let sg;try{sg=new THREE.ShapeGeometry(shape);}catch(e){continue;}
            const ps=sg.attributes.position.array,ix=sg.index?sg.index.array:null;if(!ix){sg.dispose();continue;}
            for(let i=0;i<ix.length;i+=3){const i0=ix[i],i1=ix[i+1],i2=ix[i+2],l0=ps[i0*3]*D2R,l1=ps[i1*3]*D2R,l2=ps[i2*3]*D2R; // aTriLon=삼각형 세 꼭짓점 경도(rad, 세 정점 동일) → straddle 붕괴
              const a0=ps[i0*3+1]*D2R,a1=ps[i1*3+1]*D2R,a2=ps[i2*3+1]*D2R; // aTriLat=세 꼭짓점 위도(rad) → 렌즈 대척점 사전 붕괴(#4)
              for(const vi of [i0,i1,i2]){aGeo.push(ps[vi*3],ps[vi*3+1]);aCol.push(tmp.r,tmp.g,tmp.b);aTri.push(l0,l1,l2);aTriLat.push(a0,a1,a2);}}
            sg.dispose();}}
        const pos=new Float32Array(aGeo.length/2*3);for(let i=0;i<aGeo.length/2;i++){const v=lonLatToVec3(aGeo[i*2],aGeo[i*2+1],1);pos[i*3]=v.x;pos[i*3+1]=v.y;pos[i*3+2]=v.z;}
        return {aGeo,aCol,aTri,aTriLat,pos};};
      (()=>{const {aGeo,aCol,aTri,aTriLat,pos}=buildFillArrays(2);
        const fg=new THREE.BufferGeometry();fg.setAttribute('aGeo',new THREE.Float32BufferAttribute(aGeo,2));fg.setAttribute('aColor',new THREE.Float32BufferAttribute(aCol,3));fg.setAttribute('aTriLon',new THREE.Float32BufferAttribute(aTri,3));fg.setAttribute('aTriLat',new THREE.Float32BufferAttribute(aTriLat,3));
        fg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
        fillGeoRef=fg;
        const fm=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:0},overlayTex:u.overlayTex,sunLon:u.sunLon,sunLat:u.sunLat,dayNightOn:u.dayNightOn},vertexShader:fillVert,fragmentShader:fillFrag});
        const fmesh=new THREE.Mesh(fg,fm);fmesh.frustumCulled=false;fmesh.renderOrder=0.5;scene.add(fmesh);fillMain=fmesh;
        // 클론 타일용 벡터 대륙 채움 복제(국경과 동일 이유 — 클론 영역에서 텍스처 폴백만 남는 저해상도 버그 방지)
        const cloneFillMat=(off)=>new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uRotX:U.uRotX,uLon0:U.uLon0,uLat0:U.uLat0,uLonC:U.uLonC,uOffsetX:{value:off},overlayTex:u.overlayTex,sunLon:u.sunLon,sunLat:u.sunLat,dayNightOn:u.dayNightOn},vertexShader:fillVert,fragmentShader:fillFrag});
        const fmeshL=new THREE.Mesh(fg,cloneFillMat(-WORLD_W)),fmeshR=new THREE.Mesh(fg,cloneFillMat(WORLD_W));
        fmeshL.frustumCulled=fmeshR.frustumCulled=false;fmeshL.renderOrder=fmeshR.renderOrder=0.5;fmeshL.visible=fmeshR.visible=false;scene.add(fmeshL,fmeshR);
        fillClones={fmeshL,fmeshR};
        })();
      // #8 격자는 사용자 설정 간격(step, 기본 20°)에 고정 — 위경도는 지구 표면의 정해진 좌표라 줌에 따라 개수/간격이 바뀌면 안 됨.
      // (예전 줌 적응형 세분을 제거) 사용자가 간격 값을 바꿀 때만 재빌드.
      let curEff=Math.max(5,Math.min(90,S.current.step));
      let center=makeGridSet(0,curEff);
      let gridFlat=new THREE.Group();gridFlat.add(makeGridSet(-WORLD_W,curEff),makeGridSet(WORLD_W,curEff));
      scene.add(center,gridFlat);
      const setGridVis=()=>{const st=S.current;for(const s of [center,...gridFlat.children]){const u2=s.userData;u2.grat.visible=st.grat;u2.eq.visible=st.eq;u2.pm.visible=st.prime;u2.dl.visible=st.dateline;}};
      // #8 위경도 도수 라벨: 격자선마다 몇 도 선인지 DOM 라벨로 표기(매 프레임 뷰 중심 경/위도에 샘플점을 잡아 투영).
      let gridLabels=[];
      const buildGridLabels=(stp)=>{ for(const g of gridLabels)if(g.el.parentNode)g.el.parentNode.removeChild(g.el); gridLabels=[];
        const mk=(kind,v)=>{const el=document.createElement('div');el.className='gl-lbl grid';el.textContent=(kind==='lat'?(v>0?v+'°N':v<0?(-v)+'°S':'0°'):(v>0?v+'°E':v<0?(-v)+'°W':(v===180?'180°':'0°')));labelRef.current&&labelRef.current.appendChild(el);gridLabels.push({kind,v,el});};
        for(let lon=-180;lon<180;lon+=stp)mk('lon',lon);
        for(let lat=-90+stp;lat<90;lat+=stp)mk('lat',lat); };
      buildGridLabels(curEff);
      const applyGrid=()=>{const st=S.current;
        const eff=Math.max(5,Math.min(90,st.step));
        if(eff!==curEff){curEff=eff;scene.remove(center,gridFlat);center=makeGridSet(0,curEff);gridFlat=new THREE.Group();gridFlat.add(makeGridSet(-WORLD_W,curEff),makeGridSet(WORLD_W,curEff));scene.add(center,gridFlat);buildGridLabels(curEff);}
        setGridVis();};
      // #4 줌 적응형 국경·해안선 디테일: 격자와 동일한 log2 레벨(확대 1단계당 2배)로 세분 간격을 절반씩 줄임.
      // 레벨당 정점 수가 기하급수로 늘어나므로(특히 채움 ShapeGeometry 삼각분할 비용) 최대 3레벨(0.25°)로 캡.
      const detailStep=()=>{const z0={flat:0.74,globe:0.92,lens:0.285}[S.current.view]||0.74;
        const lv=THREE.MathUtils.clamp(Math.floor(Math.log2(Math.max(1,camera.zoom/z0))),0,3);return 2/Math.pow(2,lv);};
      const applyDetail=()=>{const d=detailStep();if(d===curDetailStep)return;curDetailStep=d;
        if(borderGeoRef){const {pos,geo,geoB}=buildBorderArrays(d);
          borderGeoRef.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));borderGeoRef.setAttribute('aGeo',new THREE.Float32BufferAttribute(geo,2));borderGeoRef.setAttribute('aGeoB',new THREE.Float32BufferAttribute(geoB,2));}
        if(fillGeoRef){const {aGeo,aCol,aTri,aTriLat,pos}=buildFillArrays(d);
          fillGeoRef.setAttribute('aGeo',new THREE.Float32BufferAttribute(aGeo,2));fillGeoRef.setAttribute('aColor',new THREE.Float32BufferAttribute(aCol,3));fillGeoRef.setAttribute('aTriLon',new THREE.Float32BufferAttribute(aTri,3));fillGeoRef.setAttribute('aTriLat',new THREE.Float32BufferAttribute(aTriLat,3));fillGeoRef.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));}};

      const oceanLblEls=[]; // 대양 라벨 활성/딤 상태용(원본 .ocean-label.active/.dim)
      const applySel=(s)=>{overlayTex.dispose();overlayTex=buildOverlay({sel:s,world,oceans,oceansFill});u.overlayTex.value=overlayTex;
        const oc=!!s&&s.type==='ocean';
        for(const {el,o} of oceanLblEls){el.classList.toggle('active',oc&&o===s.key);el.classList.toggle('dim',oc&&o!==s.key);}};
      const centerLonRad=()=>U.lens.value>0.5?U.uLon0.value:(U.morph.value>0.5?controls.target.x/MS:-Math.PI/2-U.uRotY.value);
      const centerLatRad=()=>U.lens.value>0.5?U.uLat0.value:(U.morph.value>0.5?(2*Math.atan(Math.exp(controls.target.y/MS))-Math.PI/2):U.uRotX.value); // #8 격자 라벨 배치용 뷰 중심 위도
      const onDN=(on)=>{if(on)S.current.sunLon=R2D*centerLonRad()-90;u.dayNightOn.value=on?1:0;}; // 켤 때 명암 경계선이 현재 뷰에 걸치게(원본과 동일)
      const dolly=(f)=>{camera.zoom=THREE.MathUtils.clamp(camera.zoom/f,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();controls.update();};
      // 평면 seam은 항상 화면 중심 대척점(WORLD_W/2 거리)에 파킹되지만, 그 가정은 "화면 반너비(월드단위) < WORLD_W/2"일 때만 성립.
      // 와이드 화면에서 zmin(0.64)까지 축소하면 aspect/zoom이 WORLD_W/2(=π·MS)를 넘어 seam이 좌우 가장자리로 들어와 보였음
      // (벡터 국경/채움 레이어는 텍스처 메쉬 같은 patch 이중화가 없어 그 지점에 얇은 틈으로 드러남). aspect에 맞춰 zmin 하한을 동적으로 올려 원천 차단.
      const flatSafeZmin=()=>{const w=mount.clientWidth,h=mount.clientHeight;if(!(w>0&&h>0))return VIEW.flat.zmin; // mount이 아직 0×0(초기 레이아웃 전)이면 aspect가 NaN → zoom NaN → 화면 blank. 폴백으로 기본 zmin 사용.
        return Math.max(VIEW.flat.zmin,(w/h)*1.08/(Math.PI*MS));};
      let tr=null,cloneFadeT=0,nuAnim=null; // nuAnim: 정북 고정 레벨링 애니메이션(#4)
      const goView=(v)=>{const to=VIEW[v];
        // 현재 화면 상태로 소스 중심 경위도(rad) 산출 → 뷰 전환 후에도 같은 지점 유지(#5)
        const m=U.morph.value,l=U.lens.value; let clR,claR;
        const home=S.current.homeReq;S.current.homeReq=false;
        if(home){clR=0;claR=0;}                                                                                 // ⟳홈=중심·줌 완전 리셋(원본과 동일)
        else if(l>0.5){clR=U.uLon0.value;claR=U.uLat0.value;}                                                   // 렌즈=시선중심(rad)
        else if(m>0.5){clR=controls.target.x/MS;claR=2*Math.atan(Math.exp(controls.target.y/MS))-Math.PI/2;}    // 평면
        else{const fr=camera.position.clone().sub(controls.target).normalize();const g=vec3ToLonLat(rotY(rotX(fr,-U.uRotX.value),-U.uRotY.value));clR=g[0]*D2R;claR=g[1]*D2R;} // 지구본
        // seam 파킹(카메라 반대편으로 이동): uLonC를 현재값(fromLonC)에서 목적지(clR)까지 최단호로 전환.
        // patch(uLonCPatch)가 매 프레임 "center uLonC + π"로 함께 따라가므로(아래 루프) 전환 도중에도 두 사본이
        // 항상 180° 떨어져 서로의 빈틈을 덮음 — seam이 어디로 움직이든 화면엔 절대 안 보임(예전 검은선 버그 재발 안 함).
        const fromLonC=U.uLonC.value;let dLonC=clR-fromLonC;dLonC=Math.atan2(Math.sin(dLonC),Math.cos(dLonC));const toLonC=fromLonC+dLonC;
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
          else toZoomv=THREE.MathUtils.clamp(srcScale*camera.zoom*cosLat/MS,flatSafeZmin(),VIEW.flat.zmax); }        // 평면 월드스케일=MS/cos
        tr={t:0,dur:0.72,v,from:{morph:U.morph.value,lens:U.lens.value,rotY:fromRotY,rotX:fromRotX,lon0:fromLon0,lat0:fromLat0,lonC:fromLonC,zoom:camera.zoom,pos:camera.position.clone(),tgt:controls.target.clone()},
          to:{morph:to.morph,lens:to.lens,rotY:toRotY,rotX:toRotXv,lon0:toLon0,lat0:toLat0,lonC:toLonC,zoom:toZoomv,pos:toPos,tgt:toTgt}};controls.enabled=false;}; // uLonC를 fromLonC→toLonC 최단호로 애니메이션(seam이 카메라 반대편을 따라 이동), patch가 매 프레임 동기화되어 항상 안 보임
      const settleView=(v)=>{const p=VIEW[v];controls.enabled=true;controls.enableRotate=p.rotate;controls.enablePan=p.pan;controls.minZoom=v==='flat'?flatSafeZmin():p.zmin;controls.maxZoom=p.zmax;
        if(v==='globe'){controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};}
        else if(v==='flat'){controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_PAN};}
        else{controls.mouseButtons={LEFT:-1,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:-1};controls.touches={ONE:-1,TWO:THREE.TOUCH.DOLLY_PAN};} // 렌즈=시선 커스텀 드래그
        applyNorthUp(S.current.northUp); controls.update();};
      // #2 정북 고정: "적도로 되돌리는 것"이 아니라, 현재 보고 있는 지점은 그대로 둔 채 지구본의 극축(북극)이 화면 위(정방향)를
      //   향하도록 레벨링. 원리: uRotX(위도 틸트)를 0으로 만들면 북극이 월드 +Y = 화면 위가 됨. 대신 그 위도를 보기 위해
      //   카메라를 그 지점 방향으로 옮김(중심 유지). 레벨링 후엔 자유 궤도(수평=경도 자전, 수직=위도 이동)로도 북극이 계속 위.
      const applyNorthUp=(on)=>{ if(!controls)return;
        controls.minPolarAngle=0; controls.maxPolarAngle=Math.PI; // polar 잠금 없음(자유 궤도)
        if(S.current.view==='globe'&&on){
          const tgt=controls.target;
          const fr=camera.position.clone().sub(tgt).normalize();
          const g=vec3ToLonLat(rotY(rotX(fr,-U.uRotX.value),-U.uRotY.value)); // 현재 화면 중심 경위도(deg)
          const dist=camera.position.distanceTo(tgt);
          const destDir=rotY(lonLatToVec3(g[0],g[1],1),U.uRotY.value).normalize(); // uRotX=0에서 같은 지점의 방향
          const destPos=tgt.clone().add(destDir.multiplyScalar(dist));
          nuAnim={t:0,dur:0.55,fromRotX:U.uRotX.value,fromPos:camera.position.clone(),toPos:destPos,tgt:tgt.clone()};
          camera.up.set(0,1,0); controls.enabled=false; // 애니메이션 동안 컨트롤 정지
        } else { nuAnim=null; if(S.current.view==='globe'&&!tr)controls.enabled=true; }
        controls.update(); };
      // ===== 위성 사진(#2) — Esri World Imagery z4(등장방형 재투영) =====
      let satReady=false,satBaseTex=null; // satReady: 텍스처 준비돼 uSat 크로스페이드 허용
      const applySat=async(on)=>{ if(!on){satReady=false;return;} // 끄기: uSat 페이드아웃(loop), 텍스처는 유지(재토글 즉시)
        if(satBaseTex){satTexU.value=satBaseTex;satReady=true;return;} // 이미 있으면 즉시
        setSatBusy({pct:0,label:'위성 사진 불러오는 중…'});
        const r=await buildSatelliteTexture(4,(d,t)=>setSatBusy({pct:Math.round(d/t*100),label:'위성 사진 불러오는 중…'}),()=>disposed);
        setSatBusy(null); if(!r||disposed)return; satBaseTex=r.tex;satTexU.value=satBaseTex;satReady=true; };
      // ===== 실제 크기 비교(#5) =====
      let tsShape=null,tsGhost=null,tsFillGeo=null,tsLineGeos=[],tsDragging=false;
      const removeGhost=()=>{if(tsGhost){scene.remove(tsGhost);tsGhost.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});}tsGhost=null;tsShape=null;tsLineGeos=[];tsFillGeo=null;tsDragging=false;if(controls&&S.current.view==='flat')controls.enablePan=true;};
      const updateGhost=(wx,wy)=>{ if(!tsShape||!tsGhost)return;
        const latC=2*Math.atan(Math.exp(wy/MS))-Math.PI/2, s=Math.cos(tsShape.lat0)/Math.max(0.02,Math.cos(latC)); // sec(위도) 비율로 실제크기 유지
        const fp=tsFillGeo.attributes.position.array,src=tsShape.fill;
        for(let i=0;i<src.length/2;i++){fp[i*3]=wx+s*src[i*2];fp[i*3+1]=wy+s*src[i*2+1];fp[i*3+2]=0.07;}tsFillGeo.attributes.position.needsUpdate=true;
        for(let li=0;li<tsLineGeos.length;li++){const g=tsLineGeos[li],ss=tsShape.outlines[li],lp=g.attributes.position.array;for(let i=0;i<ss.length/2;i++){lp[i*3]=wx+s*ss[i*2];lp[i*3+1]=wy+s*ss[i*2+1];lp[i*3+2]=0.07;}g.attributes.position.needsUpdate=true;} };
      const buildGhost=(feats)=>{ removeGhost(); const sh=buildTrueSizeShape(feats); if(!sh)return; tsShape=sh;
        const grp=new THREE.Group();
        tsFillGeo=new THREE.BufferGeometry();tsFillGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(sh.fill.length/2*3),3));
        const fillMesh=new THREE.Mesh(tsFillGeo,new THREE.MeshBasicMaterial({color:0xFFB11A,transparent:true,opacity:0.34,depthTest:false,side:THREE.DoubleSide}));fillMesh.frustumCulled=false;fillMesh.renderOrder=5;grp.add(fillMesh);
        tsLineGeos=[];for(const seg of sh.outlines){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(seg.length/2*3),3));tsLineGeos.push(g);const lm=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xFFB11A,transparent:true,opacity:0.95,depthTest:false}));lm.frustumCulled=false;lm.renderOrder=6;grp.add(lm);}
        scene.add(grp);tsGhost=grp; updateGhost(sh.x0,sh.y0); controls.enablePan=false; }; // 처음엔 원위치(원래 나라 위에 겹침); 팬 비활성화(드래그=고스트 이동)
      const refreshTrueSize=()=>{ if(!S.current.trueSize||S.current.view!=='flat'){removeGhost();return;}
        const sel=S.current.sel; if(!sel){removeGhost();return;}
        let feats=null;
        if(sel.type==='country')feats=world.features.filter(f=>f.properties.n===sel.name);
        else if(sel.type==='continent')feats=world.features.filter(f=>f.properties.c===sel.key);
        if(feats&&feats.length)buildGhost(feats); else removeGhost(); };
      api.current={applyGrid,applySel,onDN,dolly,goView,applySat,refreshTrueSize,applyNorthUp,
        tsDrag:{begin:()=>{if(tsGhost&&S.current.trueSize&&S.current.view==='flat'){tsDragging=true;return true;}return false;},
          move:(wx,wy)=>{if(tsDragging)updateGhost(wx,wy);},end:()=>{tsDragging=false;},active:()=>tsDragging},
        pickContinent:(k)=>setSel(sameSel(S.current.sel,{type:'continent',key:k})?null:{type:'continent',key:k}),
        pickOcean:(k)=>setSel(sameSel(S.current.sel,{type:'ocean',key:k})?null:{type:'ocean',key:k})};
      applyGrid();settleView('flat');

      const labels={};
      for(const [k,d] of Object.entries(CONT)){const el=document.createElement('div');el.className='gl-lbl cont';el.textContent=d.ko;el.style.fontSize=d.s+'px';labelRef.current.appendChild(el);labels['c'+k]={el,anchor:d.ll,contKey:k};}
      OCEAN_LABELS.forEach((L,i)=>{const el=document.createElement('div');el.className='gl-lbl ocn';el.innerHTML=`<div class="kr">${OCEAN[L.o].ko}</div><div class="en">${L.en}</div>`;labelRef.current.appendChild(el);labels['o'+i]={el,anchor:L.ll,oceanKey:L.o};oceanLblEls.push({el,o:L.o});});
      // #3 지도 위 라벨도 서비스 언어에 따라 전환(대륙=한 줄 국문/영문, 대양=국문 강조↔영문 강조)
      api.current.setMapLang=(lg)=>{const en=lg==='en';
        for(const key in labels){const L=labels[key];
          if(L.contKey){L.el.textContent=en?(CONT[L.contKey].en.split(' ')[0]):CONT[L.contKey].ko;}
          else if(L.oceanKey){const o=OCEAN[L.oceanKey];const kr=L.el.querySelector('.kr'),eng=L.el.querySelector('.en');if(kr&&eng){if(en){kr.textContent=o.en.split(' ')[0];eng.textContent=o.ko;}else{kr.textContent=o.ko;eng.textContent=o.en.split(' ')[0];}}}
        }};
      api.current.setMapLang(S.current.lang||'ko');

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
      const ghostHit=(e)=>{const rect=dom.getBoundingClientRect();ptr.x=((e.clientX-rect.left)/rect.width)*2-1;ptr.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(ptr,camera);return ray.ray.intersectPlane(plane0,new THREE.Vector3());};
      dom.addEventListener('pointerdown',e=>{downXY=[e.clientX,e.clientY];ptrDown=true;
        if(S.current.view==='lens')dragLens=[e.clientX,e.clientY];
        else if(tsGhost&&S.current.trueSize&&S.current.view==='flat'&&(e.buttons&1))tsDragging=true;}); // #5: 실제크기 고스트 드래그(팬은 refreshTrueSize에서 비활성화됨)
      dom.addEventListener('pointermove',e=>{
        if(tsDragging&&(e.buttons&1)){const hit=ghostHit(e);if(hit)updateGhost(hit.x,hit.y);return;} // #5 고스트 이동
        if(dragLens&&(e.buttons&1)){ // 렌즈: 시선(중심) 회전 = 구 안에서 둘러보기(원본 0.28°/px)
        const k=0.30*D2R,dx=e.clientX-dragLens[0],dy=e.clientY-dragLens[1];
        U.uLon0.value-=dx*k;U.uLat0.value=THREE.MathUtils.clamp(U.uLat0.value+dy*k,-1.45,1.45);dragLens=[e.clientX,e.clientY];}});
      window.addEventListener('pointerup',()=>{dragLens=null;ptrDown=false;tsDragging=false;});
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
          sph.theta-=e.deltaX*0.005;sph.phi=THREE.MathUtils.clamp(sph.phi+e.deltaY*0.005,0.05,Math.PI-0.05); // 정북 고정이어도 세로 이동 허용(uRotX=0이라 북극은 계속 화면 위)
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

      const onResize=()=>{const W=mount.clientWidth,H=mount.clientHeight,a=W/H;camera.left=-a;camera.right=a;camera.top=1;camera.bottom=-1;
        if(S.current.view==='flat'&&!tr){const zs=flatSafeZmin();controls.minZoom=zs;if(camera.zoom<zs)camera.zoom=zs;} // 리사이즈로 aspect가 넓어지면 seam 안전 zmin도 즉시 재계산(#2)
        camera.updateProjectionMatrix();renderer.setSize(W,H);uRes.value.set(W,H);uScreen.value.set(renderer.domElement.width,renderer.domElement.height);};
      window.addEventListener('resize',onResize);
      const clock=new THREE.Clock(),v3=new THREE.Vector3();
      const loop=()=>{if(disposed)return;raf=requestAnimationFrame(loop);const dt=clock.getDelta();const st=S.current;
        u.sunLat.value=solarDeclDeg(st.month);
        if(st.dayNight&&st.dnPlay&&!ptrDown&&!tr){ // 낮과 밤: 태양 경도(sunLon)를 흘려보내 명암 경계선(터미네이터)이 지표를 가로질러 이동.
          // 지구본도 이제 지구를 자전시키지 않고 sunLon만 이동 → 그림자가 표면에 붙어 함께 도는 게 아니라 표면 위를 따로 지나감(요청 #3).
          if(st.view==='lens')U.uLon0.value=((U.uLon0.value+dt*8*D2R+Math.PI*3)%(Math.PI*2))-Math.PI; // 렌즈=시선 자전(원본 유지)
          else st.sunLon=((st.sunLon-dt*12+540)%360)-180; // 평면·지구본=터미네이터 이동(12°/s)
        }
        u.sunLon.value=st.sunLon;
        const bt=THREE.MathUtils.clamp((camera.zoom-3)/6,0,1);borderMat.uniforms.uColor.value.copy(BORDER_DARK).lerp(BORDER_LIT,bt); // 딥줌에서만 경계선 밝게
        if(borderClones){borderClones.blsL.material.uniforms.uColor.value.copy(borderMat.uniforms.uColor.value);borderClones.blsR.material.uniforms.uColor.value.copy(borderMat.uniforms.uColor.value);}
        if(tr){tr.t=Math.min(1,tr.t+dt/tr.dur);const k=ease(tr.t);
          U.morph.value=tr.from.morph+(tr.to.morph-tr.from.morph)*k;U.lens.value=tr.from.lens+(tr.to.lens-tr.from.lens)*k;U.uRotY.value=tr.from.rotY+(tr.to.rotY-tr.from.rotY)*k;U.uRotX.value=tr.from.rotX+(tr.to.rotX-tr.from.rotX)*k;U.uLon0.value=tr.from.lon0+(tr.to.lon0-tr.from.lon0)*k;U.uLat0.value=tr.from.lat0+(tr.to.lat0-tr.from.lat0)*k;U.uLonC.value=tr.from.lonC+(tr.to.lonC-tr.from.lonC)*k;
          camera.zoom=tr.from.zoom+(tr.to.zoom-tr.from.zoom)*k;camera.updateProjectionMatrix();camera.position.lerpVectors(tr.from.pos,tr.to.pos,k);controls.target.lerpVectors(tr.from.tgt,tr.to.tgt,k);
          if(tr.t>=1){const v=tr.v;tr=null;settleView(v);}}
        if(nuAnim){ // #4 정북 고정 레벨링: uRotX→0 + 카메라를 같은 지점 방향으로 이동(중심 유지, 북극이 화면 위로)
          nuAnim.t=Math.min(1,nuAnim.t+dt/nuAnim.dur);const k=ease(nuAnim.t);
          U.uRotX.value=nuAnim.fromRotX*(1-k);
          camera.position.lerpVectors(nuAnim.fromPos,nuAnim.toPos,k);camera.up.set(0,1,0);camera.lookAt(nuAnim.tgt);
          if(nuAnim.t>=1){nuAnim=null;if(S.current.view==='globe')controls.enabled=true;} }
        if(!tr){applyGrid();applyDetail();} // 줌 적응형 격자(#2)·국경/해안선 디테일(#4) 갱신, 둘 다 레벨 바뀔 때만 재빌드
        // 클론 알파: 평면 정상상태에 "막 진입"했을 때만 짧게 페이드인(팝인 완화), 그 외(전환 도중 포함 다른 뷰로 나갈 때)엔 즉시 0 —
        // 예전엔 전환 중 morph≥0.8 구간에서 서서히 페이드했는데, 그 사이 카메라도 같이 움직여서 클론(월드 오프셋 사본)이
        // 화면을 가로질러 슬라이드해 지나가는 것처럼 보였음(평면↔렌즈 전환 시 특히 눈에 띔). 나갈 때는 여전히 즉시 0으로
        // 슬라이드 아티팩트를 막고, 들어올 때만 0.25초 페이드로 settle 순간의 딱딱한 팝인을 부드럽게.
        if(!tr&&st.view==='flat')cloneFadeT=Math.min(1,cloneFadeT+dt/0.25);else cloneFadeT=0;
        uCloneAmt.value=cloneFadeT;
        const satWant=(st.sat&&satReady)?1:0;uSat.value+=(satWant-uSat.value)*Math.min(1,dt*4); // 위성 크로스페이드(#2)
        const isFlat=st.view==='flat'&&!tr;tileL.visible=tileR.visible=uCloneAmt.value>0.004;gridFlat.visible=isFlat;
        const satShown=uSat.value>0.5; // 위성 모드 절반 이상: 솔리드 대륙 채움 숨겨 실사 위성 육지 노출(#2). 국경·라벨·선택 강조는 유지.
        if(borderClones)borderClones.blsL.visible=borderClones.blsR.visible=tileL.visible;
        if(fillMain)fillMain.visible=!satShown;
        if(fillClones){fillClones.fmeshL.visible=fillClones.fmeshR.visible=tileL.visible&&!satShown;}
        // seam 패치는 morph>0(평면 성분이 조금이라도 섞인 모든 상태: 정상상태 평면 + 전환 도중)에서 항상 표시 — 전환 중에만 꺼두면
        // (구·렌즈↔평면 전환이 uLonC 아는 것 없이 그 순간 seam이 화면에 걸쳐 뜯겨 보임: "태평양에서 전환 시 지도가 뜯기는" 버그의 원인이었음.
        const morphOn=U.morph.value>0.001;
        bgMesh.visible=meshPatch.visible=morphOn; tileLp.visible=tileL.visible; tileRp.visible=tileR.visible;
        glow.material.opacity=0.9*Math.max(0,1-U.morph.value-U.lens.value);glow.visible=glow.material.opacity>0.02;
        if(tsGhost)tsGhost.visible=(st.view==='flat'&&!tr); // #5 실제크기 고스트는 평면 정상상태에서만
        controls.update();
        if(isFlat){ // 좌우 무한 순환 + 세로 레터박스 방지
          if(controls.target.x>WORLD_W/2){controls.target.x-=WORLD_W;camera.position.x-=WORLD_W;}else if(controls.target.x<-WORLD_W/2){controls.target.x+=WORLD_W;camera.position.x+=WORLD_W;}
          const hh=1/camera.zoom, lim=Math.max(0,MAP_HALF-hh);   // 직교: 보이는 월드 반높이
          const cy=THREE.MathUtils.clamp(controls.target.y,-lim,lim), dy=cy-controls.target.y; if(dy){controls.target.y=cy;camera.position.y+=dy;}
          U.uLonC.value=controls.target.x/MS; // 정상상태 평면: seam을 항상 카메라(팬 중심) 반대편에 파킹 → 화면 시야각(<180°)보다 seam이 항상 더 멀리 있어 안 보임
        }
        uLonCPatch.value=U.uLonC.value+Math.PI; // patch를 매 프레임 "center uLonC + π"로 동기화 — 전환 중·정상상태 모두, seam이 어디로 움직이든 두 사본이 항상 서로의 빈틈을 덮음
        renderer.render(scene,camera);
        const globeish=U.morph.value<0.5&&U.lens.value<0.5;
        for(const key in labels){const {el,anchor}=labels[key];const w3=projectJS(anchor[0],anchor[1]);let faceOk=true;
          if(globeish){const nrm=rotX(rotY(lonLatToVec3(anchor[0],anchor[1],1),U.uRotY.value),U.uRotX.value);faceOk=nrm.dot(v3.copy(camera.position).sub(w3).normalize())>0.02;}
          const p=w3.clone().project(camera);
          if(!faceOk||p.z>1||Math.abs(p.x)>1.06||Math.abs(p.y)>1.06){el.style.display='none';continue;}
          el.style.display='block';el.style.left=((p.x*0.5+0.5)*mount.clientWidth)+'px';el.style.top=((-p.y*0.5+0.5)*mount.clientHeight)+'px';}
        // #8 격자 도수 라벨: 격자가 켜져 있고 전환 중이 아닐 때만. 경선은 뷰 중심 위도에, 위선은 뷰 중심 경도에 샘플점을 잡아 투영.
        const showGrid=S.current.grat&&!tr; const cLon=R2D*centerLonRad(),cLat=THREE.MathUtils.clamp(R2D*centerLatRad(),-80,80);
        // #4 위도 라벨은 카메라를 따라오도록: 평면에선 화면 좌측 가장자리 근처 경도에 고정(팬하면 함께 이동), 경도 라벨은 상단 근처 위도에.
        const flatMode=U.morph.value>0.5&&U.lens.value<0.5;
        const halfLonDeg=flatMode?R2D*(camera.right/camera.zoom)/MS:0; // 화면 반너비의 경도(도)
        const latSampleLon=flatMode?cLon-halfLonDeg*0.86:cLon; // 좌측 가장자리 근처
        for(const gl of gridLabels){ if(!showGrid){gl.el.style.display='none';continue;}
          const alon=gl.kind==='lon'?gl.v:latSampleLon, alat=gl.kind==='lat'?gl.v:cLat; const w3=projectJS(alon,alat);let faceOk=true;
          if(globeish){const nrm=rotX(rotY(lonLatToVec3(alon,alat,1),U.uRotY.value),U.uRotX.value);faceOk=nrm.dot(v3.copy(camera.position).sub(w3).normalize())>0.02;}
          const p=w3.clone().project(camera);
          if(!faceOk||p.z>1||Math.abs(p.x)>1.02||Math.abs(p.y)>1.02){gl.el.style.display='none';continue;}
          gl.el.style.display='block';gl.el.style.left=((p.x*0.5+0.5)*mount.clientWidth)+'px';gl.el.style.top=((-p.y*0.5+0.5)*mount.clientHeight)+'px';}
      };
      loop();setStatus('');
      cleanupFn=()=>{window.removeEventListener('resize',onResize);cancelAnimationFrame(raf);controls.dispose();renderer.dispose();if(dom.parentNode)dom.parentNode.removeChild(dom);if(labelRef.current)labelRef.current.innerHTML='';};
      if(disposed)cleanupFn();
    })().catch(e=>{console.error('GLOBE_MOUNT_ERROR',e);});
    return ()=>{disposed=true;cancelAnimationFrame(raf);if(cleanupFn)cleanupFn();};
  },[]);

  const EN=lang==='en'; // 영어 모드
  const T=STR[lang]||STR.ko; // #3 전체 UI 문자열
  let info=null;
  if(sel){
    if(sel.type==='ocean'){const o=OCEAN[sel.key];info={kind:'ocean',color:o.color,title:EN?o.en:o.ko,sub:EN?o.ko:o.en,fact:o.fact};}
    else if(sel.type==='continent'){const c=CONT[sel.key];info={kind:'continent',color:c.color,title:EN?c.en:c.ko,sub:EN?c.ko:c.en,fact:c.fact};}
    else { // 국가
      const cont=CONT[sel.key]||{}; const d=countryInfo(sel.name,lang); // 이중언어 해석(globeCountryData)
      const contKo=cont.ko?`${cont.ko}`:''; const contEn=cont.en?cont.en.split(' ')[0]:'';
      info={kind:'country',color:cont.color||'#888',
        flag:d?d.flag:'',
        title:d?d.name:sel.name,
        sub:d?d.official:sel.name,
        contLabel:EN?(contEn?`${contEn} · `:''):(contKo?`${contKo} · `:''),
        langs:d?d.langs:[],
        gov:d?d.gov:'', econ:d?d.econ:'',
        desc:d?d.desc:(EN?(cont.en?`A country in ${cont.en.split(' ')[0]}.`:''):(cont.ko?`${cont.ko} 대륙의 나라예요.`:''))};
    }
  }

  return (
    <div id="app" className="gl-app">
      <div className="topbar">
        <a className="home-fab" href="/" title="parcyun studio 홈으로" aria-label="홈으로"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-6h5v6"/></svg></a>
        <div className="title-wrap"><div className="kicker">{T.kicker}</div><div className="title">{T.title}<span className="en">{T.subtitle}</span></div></div>
      </div>
      <div id="stage" onPointerDownCapture={()=>setHint(false)}><div ref={mountRef} className="gl-canvas" /><div ref={labelRef} className="gl-labels" /></div>
      {status && <div className="gl-status">{status}</div>}
      {/* #4 도구 상자: 좌상단 고정, 접힘/펼침만(드래그 제거) */}
      <div className={'floaty grid-panel tools-fixed'+(toolsCollapsed?' collapsed':'')+(guide?' guide-lift':'')}>
        <div className="floaty-head" onClick={()=>setToolsCollapsed(v=>!v)} title="클릭하면 접기/펼치기"><div className="drag-grip"><span/><span/></div><span className="collapse-chev">{toolsCollapsed?'▸':'▾'}</span></div>
        <div className="panel-body">
        <h4>{T.gridTitle}</h4>
        <label className="tg"><input type="checkbox" checked={grat} onChange={e=>setGrat(e.target.checked)} /><span>{T.grat}</span></label>
        <label className="tg"><input type="checkbox" checked={eq} onChange={e=>setEq(e.target.checked)} /><span>{T.equator}</span></label>
        <label className="tg"><input type="checkbox" checked={prime} onChange={e=>setPrime(e.target.checked)} /><span>{T.prime}</span></label>
        <label className="tg"><input type="checkbox" checked={dateline} onChange={e=>setDateline(e.target.checked)} /><span>{T.dateline}</span></label>
        <div className="step"><span>{T.interval}</span><input type="number" min="5" max="90" step="5" value={step} onChange={e=>setStep(e.target.value)} /><span>°</span></div>
        <label className="tg tg-sep"><input type="checkbox" checked={country} onChange={e=>{setCountry(e.target.checked);setSel(null);}} /><span>{T.pickCountry}</span></label>
        <label className="tg"><input type="checkbox" checked={trueSize} disabled={view!=='flat'} onChange={e=>setTrueSize(e.target.checked)} /><span>{T.trueSize}{view!=='flat'&&<small style={{color:'var(--text-2)',marginLeft:4,fontSize:9}}>{T.flatOnly}</small>}<button className="ts-info-btn" onClick={e=>{e.preventDefault();setTsInfo(v=>!v);}} title={T.tsTitle}>!</button></span></label>
        <label className="tg tg-sep"><input type="checkbox" checked={sat} onChange={e=>setSat(e.target.checked)} /><span>{T.sat}</span></label>
        <label className="tg"><input type="checkbox" checked={dayNight} onChange={e=>setDayNight(e.target.checked)} /><span>{T.dayNight}</span></label>
        <div className="lang-seg tg-sep"><span className="lang-lbl">{T.langLabel}</span><div className="lang-btns"><button className={lang==='ko'?'on':''} onClick={()=>setLang('ko')}>한국어</button><button className={lang==='en'?'on':''} onClick={()=>setLang('en')}>ENG</button></div></div>
        <a className="earth-link tg-sep" href="https://earth.google.com/web/" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></svg><span>{T.earth}</span><span className="earth-ext">↗</span></a>
        </div>
      </div>
      {/* #4 대륙/대양 상자 + 국가 카드: 우상단 고정 스택. 상자 접으면 아래 국가 카드가 따라 올라감 */}
      <div className={'right-stack'+(guide?' guide-lift':'')}>
        <div className={'floaty legend'+(legendCollapsed?' collapsed':'')}>
          <div className="floaty-head legend-head" onClick={()=>setLegendCollapsed(v=>!v)} title="클릭하면 접기/펼치기"><div className="drag-grip"><span/><span/></div><span className="collapse-chev">{legendCollapsed?'▸':'▾'}</span></div>
          <div className="panel-body">
          <div className="legend-cols">
          <div className="legend-col"><h4>{T.contHead}</h4>{CONT_ORDER.map(k=>(<button key={k} className={'chip'+(sel&&sel.type==='continent'&&sel.key===k?' on':'')} onClick={()=>api.current.pickContinent&&api.current.pickContinent(k)}><span className="dot" style={{background:CONT[k].color}} /><span>{EN?CONT[k].en.split(' ')[0]:CONT[k].ko}</span><small>{EN?'':CONT[k].en.split(' ')[0]}</small></button>))}</div>
          <div className="legend-col"><h4>{T.oceanHead}</h4>{OCEAN_ORDER.map(k=>(<button key={k} className={'chip'+(sel&&sel.type==='ocean'&&sel.key===k?' on':'')} onClick={()=>api.current.pickOcean&&api.current.pickOcean(k)}><span className="dot" style={{background:OCEAN[k].color}} /><span>{EN?OCEAN[k].en.split(' ')[0]:OCEAN[k].ko}</span><small>{EN?'':OCEAN[k].en.split(' ')[0]}</small></button>))}</div>
        </div><div className="note">{T.antarcticaNote}</div></div>
        </div>
        {info && <div className={'info-card '+info.kind} style={{borderColor:info.color}}>
          <div className="ic-head">
            {info.kind==='country'
              ? <span className="ic-flag">{info.flag||'🏳️'}</span>
              : <span className="ic-swatch" style={{background:info.color}} />}
            <div className="ic-titles"><div className="ic-title">{info.title}</div><div className="ic-sub">{info.sub}</div></div>
          </div>
          {info.kind==='country'
            ? <>
                <div className="ic-meta">{info.contLabel}{info.langs.length?info.langs.join(' · '):(EN?'—':'—')}</div>
                {(info.gov||info.econ)&&<div className="ic-sys">{[info.gov,info.econ].filter(Boolean).join(' · ')}</div>}
                <div className="ic-hr" />
                <div className="ic-desc">{info.desc}</div>
              </>
            : <div className="ic-desc">{info.fact}</div>}
        </div>}
      </div>
      <div className={'projseg'+(guide?' guide-lift':'')}>
        <button className={view==='flat'?'on':''} onClick={()=>setView('flat')}>{T.flat}</button>
        <button className={view==='lens'?'on':''} onClick={()=>setView('lens')}>{T.lens}</button>
        <button className={view==='globe'?'on':''} onClick={()=>setView('globe')}>{T.globe}</button>
      </div>
      <div className={'controls'+(guide?' guide-lift':'')}>
        {view==='globe' && <button className={'ctrl northup'+(northUp?' on':'')} aria-label={T.northUp} title={T.northUp} onClick={()=>setNorthUp(v=>!v)}><span key={northUp?'on':'off'} className="nu-glyph">N</span></button>}
        <button className="ctrl" aria-label={T.zoomIn} onClick={()=>api.current.dolly&&api.current.dolly(0.8)}>+</button>
        <button className="ctrl" aria-label={T.zoomOut} onClick={()=>api.current.dolly&&api.current.dolly(1.25)}>−</button>
        <button className="ctrl home" aria-label={T.home} onClick={()=>{setSel(null);S.current.homeReq=true;if(view==='flat')api.current.goView&&api.current.goView('flat');else setView('flat');}}>⟳</button>
      </div>
      <div className={'hint'+(hint?'':' off')}>{view==='flat'?T.hintFlat:view==='lens'?T.hintLens:T.hintGlobe}</div>
      {dayNight && <div className="daynight-ctl"><button className={'dn-btn'+(dnPlay?' on':'')} onClick={()=>setDnPlay(p=>!p)}>{dnPlay?'❚❚':'▶'}</button><span className="dn-end">{T.janEnd}</span><input type="range" min="1" max="12" step="1" value={month} onChange={e=>setMonth(+e.target.value)} /><span className="dn-end">{T.decEnd}</span><span className="dn-lbl">{(MONTHS_I18N[lang]||MONTHS_I18N.ko)[month-1]}</span></div>}
      {tsInfo && <div className="ts-popup" onClick={()=>setTsInfo(false)}><div className="ts-popup-card" onClick={e=>e.stopPropagation()}>
        <div className="ts-popup-h">{T.tsTitle}</div>
        <p>{T.tsP1}</p>
        <p><b>{T.tsP2pre}</b>{T.tsP2}</p>
        <button className="ts-popup-close" onClick={()=>setTsInfo(false)}>{T.close}</button>
      </div></div>}
      <div className="watermark">{(lang==='en'?{flat:T.wmFlat,lens:T.wmLens,globe:T.wmGlobe}:MODE_WM)[view]}</div>
      {/* #5 방문자 카운터: 푸터 대신 플로팅 pill(좌하단)로 — visitor-counter.js가 #visitor-stats를 채움 */}
      <div className="visitor-float"><span id="visitor-stats" className="ps-visits" /></div>
      <footer className="ps-footer">
        <button type="button" className="ps-footer-coffee no-drag" onClick={()=>setCoffee(true)}>☕ {T.coffee}</button>
        <a href="/dashboard.html" className="ps-footer-link">{T.dashboard} ↗</a>
        {T.designedBy} <span className="ps-signature">parcyun studio</span>
        <a href="https://www.instagram.com/parcyun" className="ps-ig" target="_blank" rel="noopener"><svg className="ps-ig-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.3 1 .4 2.2.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .3-2.2.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 5.5a4.3 4.3 0 100 8.6 4.3 4.3 0 000-8.6zm5.4-.3a1 1 0 11-2 0 1 1 0 012 0zM12 9.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"/></svg>@parcyun</a>
      </footer>
      {coffee && <div className="coffee-modal" onClick={()=>setCoffee(false)}><div className="coffee-card" onClick={e=>e.stopPropagation()}>
        <button className="coffee-close" onClick={()=>setCoffee(false)} aria-label={T.close}>×</button>
        <div className="coffee-emoji">☕</div>
        <h3 className="coffee-title">{T.coffeeTitle}</h3>
        <p className="coffee-sub">{T.coffeeSub}</p>
        <img className="coffee-qr" src="/images/coffee-qr.png" alt="parcyun studio 후원 QR" />
        <div className="coffee-label">parcyun studio</div>
      </div></div>}
      {/* #13 가이드 리워크: 모달 대신 옅은 쉐이드로 화면을 덮되 도구 상자는 덮지 않고, 각 기능 옆에 한 줄 설명 */}
      {guide && <div className="guide-shade" onClick={()=>setGuide(false)}>
        <div className="gtip gtip-tools">{T.gTools}</div>
        <div className="gtip gtip-proj">{T.gProj}</div>
        <div className="gtip gtip-legend">{T.gLegend}</div>
        <div className="gtip gtip-ctrl">{T.gCtrl}</div>
        <div className="gtip gtip-center">{T.gCenter}<br/><span>{T.gCenterSub}</span></div>
      </div>}
      {satBusy && <div className="sat-busy"><div className="sat-busy-bar"><div className="sat-busy-fill" style={{width:satBusy.pct+'%'}} /></div><div className="sat-busy-lbl">{satBusy.label} {satBusy.pct}%</div></div>}
      <style>{`
        .gl-app{--ps-primary:#FFB11A;--bg:#04060B;--surface-1:#101319;--surface-2:#191D26;--border:#2A2F3A;--text:#fff;--text-2:#8C93A1;--font-kr:'Pretendard Variable','Pretendard','Montserrat',system-ui,sans-serif;--font-en:'Montserrat',sans-serif;--font-sig:'Covered By Your Grace',cursive;--ease:cubic-bezier(0.16,1,0.3,1);position:fixed;inset:0;background:var(--bg);color:var(--text);font-family:var(--font-kr);user-select:none;overflow:hidden}
        .gl-canvas{position:absolute;inset:0}.gl-labels{position:absolute;inset:0;pointer-events:none}#stage{position:absolute;inset:0;cursor:grab}
        .gl-lbl{position:absolute;transform:translate(-50%,-50%);letter-spacing:.02em;text-shadow:0 0 3px #000,0 0 3px #000,0 1px 4px #000;white-space:nowrap;text-align:center}
        .gl-lbl.cont{font-weight:600;color:#fff}
        .gl-lbl.grid{font-family:var(--font-en);font-size:9px;font-weight:500;letter-spacing:.04em;color:#7E8798;text-shadow:0 0 3px #000,0 1px 3px #000;background:rgba(4,6,11,.35);padding:1px 4px;border-radius:4px;pointer-events:none}
        .gl-lbl.ocn .kr{color:#9DB0D6;font-weight:300;font-size:14px;letter-spacing:.18em}
        .gl-lbl.ocn .en{font-family:var(--font-en);font-weight:300;color:#56627E;font-size:8.5px;letter-spacing:.32em;text-transform:uppercase;margin-top:2px}
        .gl-lbl.ocn{transition:opacity .25s var(--ease),filter .25s var(--ease)}
        .gl-lbl.ocn.dim{opacity:.22}
        .gl-lbl.ocn.active{filter:drop-shadow(0 0 8px rgba(255,177,26,.55))}
        .gl-lbl.ocn.active .kr{color:var(--ps-primary);font-weight:500}
        .gl-lbl.ocn.active .en{color:var(--ps-primary)}
        .gl-status{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--ps-primary);font-size:14px;z-index:40}
        .topbar{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;gap:12px;padding:16px 22px;pointer-events:none}.title-wrap{pointer-events:auto}
        .home-fab{pointer-events:auto;flex-shrink:0;width:38px;height:38px;border-radius:12px;border:1px solid var(--border);background:rgba(16,19,25,.72);backdrop-filter:blur(14px);color:#fff;display:flex;align-items:center;justify-content:center;transition:all .18s var(--ease)}
        .home-fab svg{width:18px;height:18px}.home-fab:hover{border-color:var(--ps-primary);color:var(--ps-primary);transform:translateY(-1px)}
        .kicker{font-family:var(--font-en);font-size:10px;letter-spacing:.28em;color:var(--ps-primary);font-weight:600;text-transform:uppercase}
        .title{font-size:19px;font-weight:600;letter-spacing:-.01em;margin-top:3px}.title .en{font-family:var(--font-en);color:var(--text-2);font-weight:300;font-size:13px;margin-left:8px}
        .floaty{z-index:30}
        .tools-fixed{position:fixed;left:20px;top:64px}
        .right-stack{position:fixed;right:20px;top:64px;z-index:30;display:flex;flex-direction:column;gap:10px;align-items:stretch;width:340px;max-width:calc(100vw - 40px)}
        .drag-grip{display:flex;flex-direction:column;align-items:center;gap:2px;opacity:.4;transition:opacity .2s;flex-shrink:0}
        .floaty:hover .drag-grip{opacity:.7}.drag-grip span{width:22px;height:2px;border-radius:2px;background:var(--text-2)}
        .floaty-head{display:flex;align-items:center;gap:8px;padding:2px 2px 8px;margin:-3px -4px 0;cursor:pointer;user-select:none}
        .collapse-chev{margin-left:auto;font-size:10px;color:var(--text-2);transition:color .2s}.floaty:hover .collapse-chev{color:var(--ps-primary)}
        .legend-head{padding:2px 2px 8px;margin:-3px -4px 0}
        .panel-body{display:flex;flex-direction:column;gap:7px;overflow:hidden;max-height:640px;opacity:1;transition:max-height .42s cubic-bezier(.34,1.42,.64,1),opacity .28s ease,margin-top .42s cubic-bezier(.34,1.42,.64,1)}
        .floaty.collapsed .panel-body{max-height:0;opacity:0;margin-top:-4px}
        .floaty.collapsed{padding-bottom:9px}
        .legend{display:flex;flex-direction:column;gap:9px;background:rgba(16,19,25,.72);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:16px;padding:12px 16px 14px}
        /* #4~9 국가/선택 카드 — 대륙 색 테두리, 국기, 공식명, 언어, 정치·경제, 헤어라인, 한 줄 설명 */
        .info-card{background:rgba(16,19,25,.86);backdrop-filter:blur(16px);border:1.5px solid var(--border);border-radius:16px;padding:15px 16px;box-shadow:0 12px 40px rgba(0,0,0,.35);animation:cardIn .34s var(--ease)}
        @keyframes cardIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        .ic-head{display:flex;align-items:center;gap:11px;margin-bottom:9px}
        .ic-flag{font-size:30px;line-height:1;width:40px;text-align:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}
        .ic-swatch{width:34px;height:34px;border-radius:9px;flex-shrink:0}
        .ic-titles{min-width:0}.ic-title{font-size:21px;font-weight:700;letter-spacing:-.02em;line-height:1.15;color:#fff}
        .ic-sub{font-family:var(--font-en);font-size:11px;color:var(--text-2);font-weight:400;margin-top:2px;letter-spacing:.01em}
        .ic-meta{font-size:12px;color:#C5CAD4;font-weight:300;line-height:1.5}
        .ic-sys{font-size:12px;color:var(--ps-primary);font-weight:500;margin-top:3px}
        .ic-hr{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);margin:10px 0}
        .ic-desc{font-size:12.5px;line-height:1.6;color:#AEB4C0;font-weight:300}
        .info-card.continent .ic-desc,.info-card.ocean .ic-desc{color:#C5CAD4}
        .lang-seg{display:flex;align-items:center;gap:8px;margin-top:8px;border-top:1px solid var(--border);padding-top:9px}
        .lang-lbl{font-size:12px;color:var(--text-2);font-weight:300}
        .lang-btns{margin-left:auto;display:flex;gap:2px;background:var(--surface-2);border-radius:8px;padding:2px}
        .lang-btns button{border:0;background:transparent;color:var(--text-2);font-family:var(--font-kr);font-size:11px;font-weight:500;padding:3px 9px;border-radius:6px;cursor:pointer;transition:all .16s var(--ease)}
        .lang-btns button.on{background:var(--ps-primary);color:#0A0C10;font-weight:600}
        .earth-link{display:flex;align-items:center;gap:8px;margin-top:8px;border-top:1px solid var(--border);padding-top:9px;color:var(--text);font-size:12px;font-weight:400;text-decoration:none;cursor:pointer;transition:color .16s var(--ease)}
        .earth-link svg{color:var(--ps-primary);flex-shrink:0}
        .earth-link .earth-ext{margin-left:auto;color:var(--text-2);font-size:11px}
        .earth-link:hover{color:var(--ps-primary)}
        .legend-cols{display:flex;gap:16px}.legend-col{display:flex;flex-direction:column;gap:6px;min-width:104px}
        .legend h4{font-family:var(--font-en);font-size:9px;letter-spacing:.22em;color:var(--text-2);font-weight:600;text-transform:uppercase;margin-bottom:3px}
        .chip{display:flex;align-items:center;gap:9px;cursor:pointer;border:none;background:none;padding:3px 4px;border-radius:8px;width:100%;text-align:left;transition:background .2s}
        .chip:hover{background:rgba(255,255,255,.06)}.chip.on{background:rgba(255,177,26,.12)}
        .dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}.chip>span:not(.dot){font-size:13px;color:var(--text);font-weight:300}.chip small{font-family:var(--font-en);font-size:9px;color:var(--text-2);margin-left:auto}
        .legend .note{font-size:10px;color:var(--text-2);line-height:1.45;margin-top:5px;border-top:1px solid var(--border);padding-top:7px}
        .sat-hires{margin-top:4px;padding:7px 10px;border:1px solid rgba(255,177,26,.32);border-radius:9px;background:rgba(255,177,26,.08);color:var(--ps-primary);font-family:var(--font-kr);font-size:11.5px;font-weight:500;cursor:pointer;transition:all .16s var(--ease);text-align:left}
        .sat-hires:hover:not(:disabled){background:rgba(255,177,26,.16)}.sat-hires:disabled{opacity:.7;cursor:default;color:#7BC98A;border-color:rgba(123,201,138,.3);background:rgba(123,201,138,.08)}
        .sat-busy{position:absolute;bottom:96px;left:50%;transform:translateX(-50%);z-index:45;width:min(340px,80vw);background:rgba(16,19,25,.92);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:12px;padding:12px 16px}
        .sat-busy-bar{height:5px;border-radius:3px;background:var(--surface-2);overflow:hidden}.sat-busy-fill{height:100%;background:var(--ps-primary);border-radius:3px;transition:width .2s var(--ease)}
        .sat-busy-lbl{margin-top:7px;font-size:11.5px;color:var(--text-2);font-weight:300;text-align:center;font-variant-numeric:tabular-nums}
        .ts-info-btn{margin-left:6px;width:15px;height:15px;flex-shrink:0;border-radius:50%;border:1px solid rgba(255,177,26,.5);background:rgba(255,177,26,.12);color:var(--ps-primary);font-family:var(--font-en);font-weight:700;font-size:10px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;vertical-align:middle;transition:all .15s var(--ease)}
        .ts-info-btn:hover{background:var(--ps-primary);color:#0A0C10}
        .ts-popup{position:fixed;inset:0;z-index:62;display:flex;align-items:center;justify-content:center;background:rgba(4,6,11,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
        .ts-popup-card{width:min(400px,88vw);background:rgba(16,19,25,.96);border:1px solid var(--border);border-radius:18px;padding:24px 24px 18px;box-shadow:0 24px 70px rgba(0,0,0,.5)}
        .ts-popup-h{font-size:18px;font-weight:700;margin-bottom:12px;color:#fff}
        .ts-popup-card p{font-size:13px;line-height:1.65;color:#C5CAD4;font-weight:300;margin:0 0 10px}.ts-popup-card p b{color:var(--ps-primary);font-weight:600}
        .ts-popup-close{margin-top:6px;width:100%;padding:10px;border:0;border-radius:10px;background:var(--ps-primary);color:#0A0C10;font-family:var(--font-kr);font-size:13px;font-weight:700;cursor:pointer}
        .grid-panel .tg input:disabled{opacity:.4;cursor:not-allowed}
        .grid-panel{display:flex;flex-direction:column;gap:7px;background:rgba(16,19,25,.72);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:16px;padding:11px 15px 13px;min-width:164px}
        .grid-panel h4{font-family:var(--font-en);font-size:9px;letter-spacing:.22em;color:var(--text-2);font-weight:600;text-transform:uppercase;margin-bottom:2px}
        .grid-panel .tg{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text);font-weight:300;cursor:pointer}
        .grid-panel .tg small{color:var(--text-2)}.tg-sep{margin-top:8px;border-top:1px solid var(--border);padding-top:9px}
        .grid-panel .tg input[type=checkbox]{appearance:none;width:30px;height:17px;border-radius:9999px;background:var(--surface-2);border:1px solid var(--border);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
        .grid-panel .tg input[type=checkbox]::after{content:"";position:absolute;top:1.5px;left:1.5px;width:12px;height:12px;border-radius:50%;background:#8C93A1;transition:all .2s}
        .grid-panel .tg input:checked{background:rgba(255,177,26,.28);border-color:var(--ps-primary)}.grid-panel .tg input:checked::after{left:14px;background:var(--ps-primary)}
        .grid-panel .step{display:flex;align-items:center;gap:6px;margin-top:3px;border-top:1px solid var(--border);padding-top:8px}
        .grid-panel .step span{font-size:12px;color:var(--text-2);font-weight:300}
        .grid-panel .step input[type=number]{width:50px;background:var(--surface-1);border:1px solid var(--border);border-radius:7px;color:var(--text);font-family:var(--font-en);font-size:12px;padding:4px 6px;text-align:center}
        .daynight-ctl{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:28;display:flex;align-items:center;gap:12px;padding:9px 16px;background:rgba(16,19,25,.82);backdrop-filter:blur(14px);border:1px solid rgba(255,177,26,.22);border-radius:100px;box-shadow:0 8px 30px rgba(0,0,0,.4)}
        .dn-btn{width:28px;height:26px;border:1px solid var(--border);border-radius:8px;background:var(--surface-1);color:var(--text-2);cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;transition:all .16s var(--ease);flex-shrink:0}
        .dn-btn.on{border-color:var(--ps-primary);color:var(--ps-primary);background:rgba(255,177,26,.12)}
        .dn-end{font-size:11px;color:var(--text-2);font-weight:400;flex-shrink:0;font-variant-numeric:tabular-nums}
        .daynight-ctl input[type=range]{width:min(46vw,420px);height:3px;accent-color:var(--ps-primary);cursor:pointer}
        .dn-lbl{font-size:12px;color:var(--ps-primary);min-width:30px;text-align:center;font-variant-numeric:tabular-nums;font-weight:600;flex-shrink:0}
        @media(max-width:640px){.daynight-ctl{bottom:92px;gap:8px;padding:8px 12px}.daynight-ctl input[type=range]{width:44vw}}
        .controls{position:fixed;right:22px;bottom:92px;z-index:31;display:flex;flex-direction:column;gap:8px}
        .ctrl{width:42px;height:42px;border-radius:12px;border:1px solid var(--border);background:rgba(16,19,25,.72);backdrop-filter:blur(14px);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s var(--ease);font-family:var(--font-en)}
        .ctrl:hover{border-color:var(--ps-primary);color:var(--ps-primary)}.ctrl:active{transform:scale(.93)}.ctrl.home{font-size:15px}
        .ctrl.on{border-color:var(--ps-primary);color:#0A0C10;background:var(--ps-primary);font-weight:700}
        /* #3 정북 고정 N: 글리프 정중앙 정렬 + 토글 시 앞뒤·상하 한 바퀴 뒤집힘 */
        .ctrl.northup{line-height:1;font-weight:700;perspective:120px}
        .ctrl.northup .nu-glyph{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;transform-style:preserve-3d;animation:nuFlip .62s var(--ease)}
        @keyframes nuFlip{0%{transform:rotateX(0) rotateY(0)}50%{transform:rotateX(180deg) rotateY(180deg)}100%{transform:rotateX(360deg) rotateY(360deg)}}
        .info{position:absolute;bottom:54px;left:22px;z-index:29;width:248px;background:rgba(16,19,25,.82);backdrop-filter:blur(16px);border:1px solid var(--border);border-radius:20px;padding:20px;opacity:0;transform:translateY(8px);pointer-events:none;transition:all .3s var(--ease)}
        .info.show{opacity:1;transform:translateY(0)}.info .swatch{width:34px;height:34px;border-radius:9px;margin-bottom:12px}.info .en{font-family:var(--font-en);font-size:10px;letter-spacing:.22em;color:var(--text-2);font-weight:600;text-transform:uppercase}
        .info .kr{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:2px 0 10px}.info .fact{font-size:13px;line-height:1.6;color:#C5CAD4;font-weight:300}
        .hint{position:absolute;bottom:54px;left:50%;transform:translateX(-50%);z-index:25;font-size:11px;color:var(--text-2);font-weight:300;text-align:center;background:rgba(4,6,11,.5);padding:6px 14px;border-radius:9999px;transition:opacity .4s}
        .hint.off{opacity:0;pointer-events:none}
        /* #13 가이드 쉐이드: 화면을 옅게 덮되 도구 상자(.guide-lift, z55)는 위로 띄워 안 덮음. 팁은 쉐이드 위(z51). */
        .guide-shade{position:fixed;inset:0;z-index:50;background:rgba(4,6,11,.72);backdrop-filter:blur(1.5px);-webkit-backdrop-filter:blur(1.5px);animation:guideIn .3s var(--ease);cursor:pointer}
        /* #1 가이드: 도구·대륙대양·도법·컨트롤 상자 전부 쉐이드 위로(안 덮음), 나머지 영역만 어둡게 */
        .tools-fixed.guide-lift,.right-stack.guide-lift,.projseg.guide-lift,.controls.guide-lift{z-index:55}
        .gtip{position:absolute;z-index:51;font-size:12.5px;line-height:1.5;color:#EAECF0;font-weight:400;text-shadow:0 1px 6px rgba(0,0,0,.9);max-width:230px}
        .gtip-tools{left:220px;top:96px}
        .gtip-proj{left:50%;top:66px;transform:translateX(-50%);text-align:center}
        .gtip-legend{right:372px;top:120px;text-align:right}
        .gtip-ctrl{right:78px;bottom:150px;text-align:right}
        .gtip-center{left:50%;top:52%;transform:translate(-50%,-50%);text-align:center;font-size:15px;color:#fff;font-weight:500}
        .gtip-center span{display:block;margin-top:6px;font-size:11.5px;color:var(--text-2);font-weight:300}
        @media(max-width:760px){.gtip-tools,.gtip-legend,.gtip-ctrl,.gtip-proj{display:none}}
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
        .ps-footer{position:fixed;bottom:16px;right:20px;font-family:var(--font-en);font-weight:300;font-size:11px;color:var(--text-2);display:flex;align-items:center;gap:8px;z-index:9999;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:6px 12px;border-radius:100px;border:1px solid rgba(255,255,255,.08)}
        .ps-signature{font-family:var(--font-sig);font-size:15px;color:var(--ps-primary);line-height:1}.ps-ig{display:inline-flex;align-items:center;gap:3px;color:inherit;text-decoration:none}.ps-ig:hover{color:var(--ps-primary)}.ps-ig-icon{width:10px;height:10px;vertical-align:middle}
        /* #5 방문자 카운터 플로팅 pill(좌하단) */
        .visitor-float{position:fixed;left:20px;bottom:18px;z-index:32;background:rgba(16,19,25,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:100px;padding:7px 14px}
        .visitor-float:has(.ps-visits:empty){display:none}
        /* 메인 페이지 푸터와 동일: 커피 후원·업무 대시보드·방문자 카운터(푸터 내부 우측) */
        .ps-footer-coffee{font-family:var(--font-en);font-size:11px;font-weight:400;color:var(--ps-primary);background:transparent;border:0;padding:0 10px 0 0;margin-right:2px;border-right:1px solid rgba(255,255,255,.14);cursor:pointer;transition:color .2s}
        .ps-footer-coffee:hover{filter:brightness(1.15)}
        .ps-footer-link{font-family:var(--font-en);font-size:11px;font-weight:400;color:var(--text-2);text-decoration:none;padding-right:10px;margin-right:2px;border-right:1px solid rgba(255,255,255,.14);transition:color .2s}
        .ps-footer-link:hover{color:var(--ps-primary)}
        .ps-visits-infooter{padding-right:10px;margin-right:2px;border-right:1px solid rgba(255,255,255,.14)}
        .ps-visits-infooter:empty{display:none}
        /* 혹시 카운터가 푸터 밖 플로트로 뜨면 좌하단 대신 우하단(푸터 위)로 */
        .ps-visits-float{left:auto !important;right:20px !important;bottom:58px !important}
        .coffee-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(4,6,11,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
        .coffee-card{position:relative;width:min(320px,88vw);background:rgba(16,19,25,.96);border:1px solid var(--border);border-radius:20px;padding:26px 24px 20px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.5)}
        .coffee-close{position:absolute;top:12px;right:14px;background:transparent;border:0;color:var(--text-2);font-size:20px;cursor:pointer;line-height:1}.coffee-close:hover{color:#fff}
        .coffee-emoji{font-size:34px}.coffee-title{font-size:17px;font-weight:700;margin:8px 0 4px;color:#fff}.coffee-sub{font-size:12px;color:var(--text-2);font-weight:300;margin:0 0 16px}
        .coffee-qr{width:180px;height:180px;object-fit:contain;border-radius:12px;background:#fff;padding:8px}.coffee-label{margin-top:12px;font-family:var(--font-sig);font-size:16px;color:var(--ps-primary)}
        @media(max-width:640px){.ps-footer{flex-wrap:wrap;max-width:calc(100vw - 40px);justify-content:flex-end}}
        @media(max-width:640px){.info{width:200px;padding:16px}.info .kr{font-size:24px}.legend{max-width:200px;padding:11px 13px}.legend-col{min-width:88px}.controls{right:14px;bottom:48px}.topbar{padding:14px 16px}.title{font-size:16px}.title .en{display:none}.grid-panel{min-width:0;padding:10px 12px}}
      `}</style>
    </div>
  );
}
