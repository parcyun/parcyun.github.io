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
const OCEAN_LABELS = [ // 지도 라벨(KR+EN), 태평양·대서양은 2곳
  {o:'pacific',en:'Pacific Ocean',ll:[-148,6]},{o:'pacific',en:'Pacific Ocean',ll:[168,-14]},
  {o:'atlantic',en:'Atlantic Ocean',ll:[-32,26]},{o:'atlantic',en:'Atlantic Ocean',ll:[-18,-32]},
  {o:'indian',en:'Indian Ocean',ll:[78,-24]},
  {o:'southern',en:'Southern Ocean',ll:[30,-60]},
  {o:'arctic',en:'Arctic Ocean',ll:[-46,74]},
];
const RES=2048, MS=2/Math.PI, SC=1.15, RMX=7.0, WORLD_W=2*Math.PI*MS, D2R=Math.PI/180, R2D=180/Math.PI;
const MAP_HALF=Math.log(Math.tan(Math.PI/4+0.7))*MS; // 메르카토 세로 절반(GLSL clamp 1.4rad=±80°)
const projFor=(ctx)=>geoEquirectangular().scale(RES/(2*Math.PI)).translate([RES/2,RES/4]);
const solarDeclDeg=(m)=>23.44*Math.sin((2*Math.PI*((m-0.5)*30.44-80))/365);
const shade=(hex,amt)=>{const n=parseInt(hex.slice(1),16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;const f=amt<0?1+amt:1,a=amt>0?255*amt:0;return `rgb(${Math.round(r*f+a)},${Math.round(g*f+a)},${Math.round(b*f+a)})`;};
const rawTex=(cv)=>{const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.NoColorSpace;t.anisotropy=8;return t;};
function lonLatToVec3(lon,lat,r){const u=(lon+180)/360,v=(90-lat)/180,th=u*2*Math.PI,ph=v*Math.PI;return new THREE.Vector3(-Math.cos(th)*Math.sin(ph),Math.cos(ph),Math.sin(th)*Math.sin(ph)).multiplyScalar(r);}
function vec3ToLonLat(v){const n=v.clone().normalize();const lat=R2D*Math.asin(THREE.MathUtils.clamp(n.y,-1,1));let a=Math.atan2(n.z,-n.x)/(2*Math.PI);if(a<0)a+=1;return [a*360-180,lat];}
const rotY=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return new THREE.Vector3(v.x*c+v.z*s,v.y,-v.x*s+v.z*c);};

function buildBase({world,night}){
  const W=RES,H=RES/2,cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');const path=geoPath(projFor(ctx),ctx);
  ctx.fillStyle=night?'#020308':'#04060B';ctx.fillRect(0,0,W,H);
  const byC={};for(const f of world.features)(byC[f.properties.c]||=[]).push(f);
  for(const [c,feats] of Object.entries(byC)){ctx.beginPath();for(const f of feats)path(f);const col=(CONT[c]||{}).color||'#888';ctx.fillStyle=night?shade(col,-0.6):col;ctx.fill();ctx.lineWidth=0.5;ctx.strokeStyle=night?'rgba(255,255,255,0.06)':'#04060B';ctx.stroke();}
  return rawTex(cv);
}
function featherOcean(baseCtx,geom){
  const W=RES,H=RES/2,off=document.createElement('canvas');off.width=W;off.height=H;const o=off.getContext('2d');const op=geoPath(projFor(o),o);
  o.beginPath();op(geom);o.fillStyle='rgba(120,180,230,0.5)';o.fill();
  o.globalCompositeOperation='destination-in';o.filter='blur(15px)';o.beginPath();op(geom);o.fillStyle='#fff';o.fill();
  o.filter='none';o.globalCompositeOperation='source-over';baseCtx.drawImage(off,0,0);
}
function buildOverlay({sel,world,oceans}){
  const W=RES,H=RES/2,cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');const path=geoPath(projFor(ctx),ctx);
  if(sel){ if(sel.type==='ocean'&&oceans[sel.key]) featherOcean(ctx,{type:'Feature',geometry:oceans[sel.key]});
    else if(sel.type==='continent'){ctx.beginPath();for(const f of world.features)if(f.properties.c===sel.key)path(f);ctx.fillStyle='rgba(255,177,26,0.20)';ctx.fill();ctx.lineWidth=2.2;ctx.strokeStyle='#FFB11A';ctx.stroke();}
    else if(sel.type==='country'){const f=world.features.find(x=>x.properties.n===sel.name);if(f){ctx.beginPath();path(f);ctx.fillStyle='rgba(255,177,26,0.30)';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#FFB11A';ctx.stroke();}} }
  return rawTex(cv);
}
function glowTexture(){const S=512,cv=document.createElement('canvas');cv.width=S;cv.height=S;const c=cv.getContext('2d');const g=c.createRadialGradient(S/2,S/2,S*0.30,S/2,S/2,S*0.5);g.addColorStop(0,'rgba(255,177,26,0)');g.addColorStop(0.72,'rgba(255,177,26,0.10)');g.addColorStop(0.86,'rgba(120,150,210,0.10)');g.addColorStop(1,'rgba(120,150,210,0)');c.fillStyle=g;c.fillRect(0,0,S,S);return rawTex(cv);}

const GLSL=`const float PI=3.141592653589793; const float MS=0.6366197723675814; const float SC=1.15; const float RMX=7.0;
vec3 project(vec2 uv, vec3 sphere, float morph, float lens, float rotY, float lon0, float offX){
  float lon=(uv.x-0.5)*2.0*PI; float lat=(uv.y-0.5)*PI; float latC=clamp(lat,-1.4,1.4);
  vec3 pl=vec3(lon*MS+offX, log(tan(PI/4.0+latC/2.0))*MS, 0.0);
  float slon=lon-lon0; float den=max(1.0+cos(lat)*cos(slon),0.14);
  vec3 st=vec3(2.0*SC*cos(lat)*sin(slon)/den, 2.0*SC*sin(lat)/den, 0.0); float rr=length(st.xy); if(rr>RMX) st.xy*=RMX/rr;
  float cy=cos(rotY), sy=sin(rotY); vec3 sph=vec3(sphere.x*cy+sphere.z*sy, sphere.y, -sphere.x*sy+sphere.z*cy);
  return sph*(1.0-morph-lens)+pl*morph+st*lens;
}`;
const meshVert=GLSL+`uniform float morph,lens,uRotY,uLon0; varying vec2 vUv;
void main(){ vUv=uv; vec3 p=project(uv,position,morph,lens,uRotY,uLon0,0.0); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);} `;
const cloneVert=GLSL+`uniform float uOffsetX; varying vec2 vUv;
void main(){ vUv=uv; vec3 p=project(uv,position,1.0,0.0,0.0,0.0,uOffsetX); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);} `;
const meshFrag=`uniform sampler2D dayTex,nightTex,overlayTex; uniform float sunLon,sunLat,nightBoost,dayNightOn; varying vec2 vUv;
void main(){ float lon=(vUv.x-0.5)*360.0, lat=(vUv.y-0.5)*180.0;
  float rl=radians(lat),ro=radians(lon),sa=radians(sunLat),so=radians(sunLon);
  float cz=sin(rl)*sin(sa)+cos(rl)*cos(sa)*cos(ro-so); float t=mix(1.0,smoothstep(-0.10,0.12,cz),dayNightOn);
  vec3 base=mix(texture2D(nightTex,vUv).rgb*nightBoost, texture2D(dayTex,vUv).rgb, t); vec4 ov=texture2D(overlayTex,vUv);
  gl_FragColor=vec4(mix(base,ov.rgb,ov.a),1.0);} `;
const lineVert=GLSL+`attribute vec2 aGeo; uniform float morph,lens,uRotY,uLon0;
void main(){ vec2 uv=vec2((aGeo.x+180.0)/360.0,(aGeo.y+90.0)/180.0); vec3 sph=normalize(vec3(-cos(uv.x*2.0*PI)*sin((1.0-uv.y)*PI),cos((1.0-uv.y)*PI),sin(uv.x*2.0*PI)*sin((1.0-uv.y)*PI)))*1.003;
  vec3 p=project(uv,sph,morph,lens,uRotY,uLon0,0.0); p.z+=0.006; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);} `;
const lineFrag=`uniform vec3 uColor; uniform float uOp; void main(){ gl_FragColor=vec4(uColor,uOp);} `;

function morphGeom(lonN,latN){const g=new THREE.BufferGeometry();const pos=[],uv=[],idx=[];
  for(let j=0;j<=latN;j++){const lat=-90+180*j/latN;for(let i=0;i<=lonN;i++){const lon=-180+360*i/lonN;const s=lonLatToVec3(lon,lat,1);pos.push(s.x,s.y,s.z);uv.push((lon+180)/360,(lat+90)/180);}}
  const row=lonN+1;for(let j=0;j<latN;j++)for(let i=0;i<lonN;i++){const a=j*row+i;idx.push(a,a+row,a+1,a+1,a+row,a+row+1);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;}
function morphLine(pts,color,opacity,U){const g=new THREE.BufferGeometry();const pos=[],geo=[];
  for(const [lo,la] of pts){const s=lonLatToVec3(lo,la,1.003);pos.push(s.x,s.y,s.z);geo.push(lo,la);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aGeo',new THREE.Float32BufferAttribute(geo,2));
  const m=new THREE.ShaderMaterial({transparent:true,uniforms:{morph:U.morph,lens:U.lens,uRotY:U.uRotY,uLon0:U.uLon0,uColor:{value:new THREE.Color(color)},uOp:{value:opacity}},vertexShader:lineVert,fragmentShader:lineFrag});
  m.uniforms.uColor.value.convertLinearToSRGB&&(m.uniforms.uColor.value=new THREE.Color(color)); return new THREE.Line(g,m);}

const VIEW={
  globe:{morph:0,lens:0,rotY:-Math.PI/2,fov:30,pos:[0,0.35,5.4],rotate:true,pan:false,min:2.4,max:9},
  lens: {morph:0,lens:1,rotY:0,        fov:46,pos:[0,0,7.2],   rotate:false,pan:false,min:4,max:10},
  flat: {morph:1,lens:0,rotY:0,        fov:40,pos:[0,0,3.7],   rotate:false,pan:true,min:1.6,max:4.2},
};
const MODE_WM={flat:'Mercator Projection',lens:'Focus Lens View',globe:'Orthographic Globe'};
const ease=(t)=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

export default function GlobeLab(){
  const mountRef=useRef(null),labelRef=useRef(null),api=useRef({});
  const S=useRef({view:'flat',country:false,dayNight:false,dnPlay:true,month:6,grat:true,eq:true,prime:false,step:20,sunLon:-90});
  const [view,setView]=useState('flat');
  const [country,setCountry]=useState(false),[dayNight,setDayNight]=useState(false),[dnPlay,setDnPlay]=useState(true),[month,setMonth]=useState(6);
  const [grat,setGrat]=useState(true),[eq,setEq]=useState(true),[prime,setPrime]=useState(false),[step,setStep]=useState(20);
  const [sel,setSel]=useState(null),[status,setStatus]=useState('로딩 중…');

  useEffect(()=>{Object.assign(S.current,{view,country,dayNight,dnPlay,month,grat,eq,prime,step:+step||20});},[view,country,dayNight,dnPlay,month,grat,eq,prime,step]);
  useEffect(()=>{api.current.goView&&api.current.goView(view);},[view]);
  useEffect(()=>{api.current.applyGrid&&api.current.applyGrid();},[grat,eq,prime,step]);
  useEffect(()=>{api.current.applySel&&api.current.applySel(sel);},[sel]);
  useEffect(()=>{if(api.current.onDN)api.current.onDN(dayNight);},[dayNight]);

  useEffect(()=>{
    const mount=mountRef.current;let raf,renderer,controls,cleanupFn=null,disposed=false;
    (async()=>{
      const w=mount.clientWidth,h=mount.clientHeight;
      const scene=new THREE.Scene();
      const camera=new THREE.PerspectiveCamera(VIEW.flat.fov,w/h,0.1,200);camera.position.set(...VIEW.flat.pos);
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);mount.appendChild(renderer.domElement);
      controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=0.08;controls.enablePan=false;controls.screenSpacePanning=true;

      const sg=new THREE.BufferGeometry(),Ns=1100,spp=new Float32Array(Ns*3);
      for(let i=0;i<Ns;i++){const r=60+Math.random()*45,t=Math.acos(2*Math.random()-1),p=2*Math.PI*Math.random();spp[i*3]=r*Math.sin(t)*Math.cos(p);spp[i*3+1]=r*Math.cos(t);spp[i*3+2]=r*Math.sin(t)*Math.sin(p);}
      sg.setAttribute('position',new THREE.BufferAttribute(spp,3));scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0x555a68,size:0.12,sizeAttenuation:true})));
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,opacity:0.9}));glow.scale.set(4.6,4.6,1);glow.renderOrder=-1;scene.add(glow);

      setStatus('지형 데이터 로딩…');
      const [world,oceans]=await Promise.all([fetch('/lab-data/world.json').then(r=>r.json()),fetch('/lab-data/oceans.json').then(r=>r.json())]);
      if(disposed)return;
      const vDay=buildBase({world,night:false}),vNight=buildBase({world,night:true});
      const U={morph:{value:VIEW.flat.morph},lens:{value:VIEW.flat.lens},uRotY:{value:VIEW.flat.rotY},uLon0:{value:0}};
      let overlayTex=buildOverlay({sel:null,world,oceans});
      const u={dayTex:{value:vDay},nightTex:{value:vNight},overlayTex:{value:overlayTex},...U,sunLon:{value:S.current.sunLon},sunLat:{value:solarDeclDeg(6)},nightBoost:{value:1},dayNightOn:{value:0}};
      const mesh=new THREE.Mesh(morphGeom(180,90),new THREE.ShaderMaterial({vertexShader:meshVert,fragmentShader:meshFrag,uniforms:u,side:THREE.DoubleSide}));
      scene.add(mesh);
      // 평면 좌우 순환용 클론 타일(±월드폭)
      const cloneMat=(off)=>new THREE.ShaderMaterial({vertexShader:cloneVert,fragmentShader:meshFrag,side:THREE.DoubleSide,
        uniforms:{dayTex:u.dayTex,nightTex:u.nightTex,overlayTex:u.overlayTex,sunLon:u.sunLon,sunLat:u.sunLat,nightBoost:u.nightBoost,dayNightOn:u.dayNightOn,uOffsetX:{value:off}}});
      const tileL=new THREE.Mesh(mesh.geometry,cloneMat(-WORLD_W)),tileR=new THREE.Mesh(mesh.geometry,cloneMat(WORLD_W));
      tileL.frustumCulled=tileR.frustumCulled=false;tileL.visible=tileR.visible=false;scene.add(tileL,tileR);

      const grat=new THREE.Group();
      // 평면 좌우 순환용으로 격자를 ±540°(3폭)로 그려 타일 전체에 이어지게. 구/렌즈에선 겹쳐 보여도 동일선이라 무해.
      const buildG=(stp)=>{while(grat.children.length)grat.remove(grat.children[0]);
        for(let lon=-540;lon<=540;lon+=stp){const p=[];for(let la=-85;la<=85;la+=3)p.push([lon,la]);grat.add(morphLine(p,0xffffff,0.30,U));}
        for(let lat=-90+stp;lat<90;lat+=stp){const p=[];for(let lo=-540;lo<=540;lo+=3)p.push([lo,lat]);grat.add(morphLine(p,0xffffff,0.30,U));}};
      buildG(S.current.step);
      const eqP=[];for(let lo=-540;lo<=540;lo+=3)eqP.push([lo,0]);const eqL=morphLine(eqP,0xFF7B7B,0.6,U);
      const pmL=new THREE.Group();for(const off of [-360,0,360]){const pmP=[];for(let la=-85;la<=85;la+=3)pmP.push([off,la]);pmL.add(morphLine(pmP,0xFFB270,0.6,U));}
      scene.add(grat,eqL,pmL);let curStep=S.current.step;
      const applyGrid=()=>{const st=S.current;if(st.step!==curStep){curStep=st.step;buildG(st.step);}grat.visible=st.grat;eqL.visible=st.eq;pmL.visible=st.prime;};

      const applySel=(s)=>{overlayTex.dispose();overlayTex=buildOverlay({sel:s,world,oceans});u.overlayTex.value=overlayTex;};
      const onDN=(on)=>{if(on)S.current.sunLon=-90;u.dayNightOn.value=on?1:0;};
      const dolly=(f)=>{const off=camera.position.clone().sub(controls.target);off.setLength(THREE.MathUtils.clamp(off.length()*f,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(off);controls.update();};
      let tr=null;
      const goView=(v)=>{const to=VIEW[v];
        // 현재 화면 상태로 소스 중심 경도(rad) 산출 → 뷰 전환 후에도 같은 지점 유지
        const m=U.morph.value,l=U.lens.value; let clR;
        if(m>0.5) clR=controls.target.x/MS;                                   // 평면에서
        else if(l>0.5) clR=U.uLon0.value;                                     // 렌즈에서
        else{const fr=camera.position.clone().sub(controls.target).normalize();clR=vec3ToLonLat(rotY(fr,-U.uRotY.value))[0]*D2R;} // 지구본에서
        let toRotY,toLon0,toTgt,toPos;
        if(v==='globe'){toRotY=-Math.PI/2-clR;toLon0=U.uLon0.value;toTgt=new THREE.Vector3(0,0,0);toPos=new THREE.Vector3(...to.pos);}
        else if(v==='lens'){toRotY=0;toLon0=clR;toTgt=new THREE.Vector3(0,0,0);toPos=new THREE.Vector3(...to.pos);}
        else{toRotY=0;toLon0=U.uLon0.value;const tx=clR*MS;toTgt=new THREE.Vector3(tx,0,0);toPos=new THREE.Vector3(to.pos[0]+tx,to.pos[1],to.pos[2]);}
        tr={t:0,dur:0.72,v,from:{morph:U.morph.value,lens:U.lens.value,rotY:U.uRotY.value,lon0:U.uLon0.value,fov:camera.fov,pos:camera.position.clone(),tgt:controls.target.clone()},
          to:{morph:to.morph,lens:to.lens,rotY:toRotY,lon0:toLon0,fov:to.fov,pos:toPos,tgt:toTgt}};controls.enabled=false;};
      const settleView=(v)=>{const p=VIEW[v];controls.enabled=true;controls.enableRotate=p.rotate;controls.enablePan=p.pan;controls.minDistance=p.min;controls.maxDistance=p.max;
        if(v==='flat'){controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_PAN};}
        else if(v==='globe'){controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};}
        else{controls.mouseButtons={LEFT:-1,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:-1};controls.touches={ONE:-1,TWO:THREE.TOUCH.DOLLY_PAN};}
        controls.update();};
      api.current={applyGrid,applySel,onDN,dolly,goView,pickContinent:(k)=>setSel({type:'continent',key:k}),pickOcean:(k)=>setSel({type:'ocean',key:k})};
      applyGrid();settleView('flat');

      const labels={};
      for(const [k,d] of Object.entries(CONT)){const el=document.createElement('div');el.className='gl-lbl cont';el.textContent=d.ko;el.style.fontSize=d.s+'px';labelRef.current.appendChild(el);labels['c'+k]={el,anchor:d.ll};}
      OCEAN_LABELS.forEach((L,i)=>{const el=document.createElement('div');el.className='gl-lbl ocn';el.innerHTML=`<div class="kr">${OCEAN[L.o].ko}</div><div class="en">${L.en}</div>`;labelRef.current.appendChild(el);labels['o'+i]={el,anchor:L.ll};});

      // 스테레오/메르카토 위치 계산(라벨용, project()와 동일)
      const projectJS=(lon,lat)=>{const uvx=(lon+180)/360; const morph=U.morph.value,lens=U.lens.value,rY=U.uRotY.value,l0=U.uLon0.value;
        const loR=lon*D2R, laR=lat*D2R, latC=THREE.MathUtils.clamp(laR,-1.4,1.4);
        const pl=new THREE.Vector3(loR*MS, Math.log(Math.tan(Math.PI/4+latC/2))*MS, 0.02);
        const slon=loR-l0, den=Math.max(1+Math.cos(laR)*Math.cos(slon),0.14); let st=new THREE.Vector3(2*SC*Math.cos(laR)*Math.sin(slon)/den,2*SC*Math.sin(laR)/den,0.02); const rr=Math.hypot(st.x,st.y); if(rr>RMX)st.multiplyScalar(RMX/rr);
        const sph=rotY(lonLatToVec3(lon,lat,1.02),rY);
        return sph.multiplyScalar(1-morph-lens).add(pl.multiplyScalar(morph)).add(st.multiplyScalar(lens));};

      const ray=new THREE.Raycaster(),ptr=new THREE.Vector2(),plane0=new THREE.Plane(new THREE.Vector3(0,0,1),0),unit=new THREE.Sphere(new THREE.Vector3(),1);
      let downXY=null,dragLens=null;const dom=renderer.domElement;
      dom.addEventListener('pointerdown',e=>{downXY=[e.clientX,e.clientY];if(S.current.view==='lens')dragLens=e.clientX;});
      dom.addEventListener('pointermove',e=>{if(dragLens!==null&&(e.buttons&1)){U.uLon0.value-=(e.clientX-dragLens)*0.006;dragLens=e.clientX;}});
      window.addEventListener('pointerup',()=>{dragLens=null;});
      dom.addEventListener('pointerup',e=>{if(!downXY)return;const mv=Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1]);downXY=null;if(mv>6||tr)return;
        const rect=dom.getBoundingClientRect();ptr.x=((e.clientX-rect.left)/rect.width)*2-1;ptr.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(ptr,camera);const v=S.current.view;let lon,lat;
        if(v==='globe'){const hit=ray.ray.intersectSphere(unit,new THREE.Vector3());if(!hit)return;[lon,lat]=vec3ToLonLat(rotY(hit,-U.uRotY.value));}
        else if(v==='flat'){const hit=ray.ray.intersectPlane(plane0,new THREE.Vector3());if(!hit)return;lon=R2D*(hit.x/MS);lat=R2D*(2*Math.atan(Math.exp(hit.y/MS))-Math.PI/2);lon=((lon+180)%360+360)%360-180;if(Math.abs(lat)>85)return;}
        else{const hit=ray.ray.intersectPlane(plane0,new THREE.Vector3());if(!hit)return;const uu=hit.x/(2*SC),vv=hit.y/(2*SC);const rho=Math.hypot(uu,vv);if(rho<1e-6){lon=R2D*U.uLon0.value;lat=0;}else{const c=2*Math.atan(rho);lat=R2D*Math.asin(THREE.MathUtils.clamp(vv*Math.sin(c)/rho,-1,1));lon=R2D*(Math.atan2(uu*Math.sin(c),rho*Math.cos(c))+U.uLon0.value);}lon=((lon+180)%360+360)%360-180;}
        const c=world.features.find(f=>geoContains(f,[lon,lat]));
        if(c){setSel(S.current.country?{type:'country',name:c.properties.n,key:c.properties.c}:{type:'continent',key:c.properties.c});return;}
        let ok=null;for(const k of Object.keys(OCEAN))if(oceans[k]&&geoContains({type:'Feature',geometry:oceans[k]},[lon,lat])){ok=k;break;}setSel(ok?{type:'ocean',key:ok}:null);});

      const onResize=()=>{const W=mount.clientWidth,H=mount.clientHeight;camera.aspect=W/H;camera.updateProjectionMatrix();renderer.setSize(W,H);};
      window.addEventListener('resize',onResize);
      const clock=new THREE.Clock(),v3=new THREE.Vector3();
      const loop=()=>{if(disposed)return;raf=requestAnimationFrame(loop);const dt=clock.getDelta();const st=S.current;
        u.sunLat.value=solarDeclDeg(st.month);if(st.dayNight&&st.dnPlay){st.sunLon=((st.sunLon-dt*15+540)%360)-180;}u.sunLon.value=st.sunLon;
        if(tr){tr.t=Math.min(1,tr.t+dt/tr.dur);const k=ease(tr.t);
          U.morph.value=tr.from.morph+(tr.to.morph-tr.from.morph)*k;U.lens.value=tr.from.lens+(tr.to.lens-tr.from.lens)*k;U.uRotY.value=tr.from.rotY+(tr.to.rotY-tr.from.rotY)*k;U.uLon0.value=tr.from.lon0+(tr.to.lon0-tr.from.lon0)*k;
          camera.fov=tr.from.fov+(tr.to.fov-tr.from.fov)*k;camera.updateProjectionMatrix();camera.position.lerpVectors(tr.from.pos,tr.to.pos,k);controls.target.lerpVectors(tr.from.tgt,tr.to.tgt,k);
          if(tr.t>=1){const v=tr.v;tr=null;settleView(v);}}
        const isFlat=st.view==='flat'&&!tr;tileL.visible=tileR.visible=isFlat;
        glow.material.opacity=0.9*Math.max(0,1-U.morph.value-U.lens.value);glow.visible=glow.material.opacity>0.02;
        controls.update();
        if(isFlat){ // 좌우 무한 순환 + 세로 레터박스 방지
          if(controls.target.x>WORLD_W/2){controls.target.x-=WORLD_W;camera.position.x-=WORLD_W;}else if(controls.target.x<-WORLD_W/2){controls.target.x+=WORLD_W;camera.position.x+=WORLD_W;}
          const hh=camera.position.distanceTo(controls.target)*Math.tan(camera.fov*D2R/2), lim=Math.max(0,MAP_HALF-hh);
          const cy=THREE.MathUtils.clamp(controls.target.y,-lim,lim), dy=cy-controls.target.y; if(dy){controls.target.y=cy;camera.position.y+=dy;}
        }
        renderer.render(scene,camera);
        const globeish=U.morph.value<0.5&&U.lens.value<0.5;
        for(const key in labels){const {el,anchor}=labels[key];const w3=projectJS(anchor[0],anchor[1]);let faceOk=true;
          if(globeish){const nrm=rotY(lonLatToVec3(anchor[0],anchor[1],1),U.uRotY.value);faceOk=nrm.dot(v3.copy(camera.position).sub(w3).normalize())>0.02;}
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
      <div id="stage"><div ref={mountRef} className="gl-canvas" /><div ref={labelRef} className="gl-labels" /></div>
      {status && <div className="gl-status">{status}</div>}
      <div className={'info'+(info?' show':'')}>{info&&<><div className="swatch" style={{background:info.sw}} /><div className="en">{info.en}</div><div className="kr">{info.kr}</div><div className="fact">{info.fact}</div></>}</div>
      <div className="legend"><div className="legend-cols">
        <div className="legend-col"><h4>6 Continents</h4>{CONT_ORDER.map(k=>(<button key={k} className={'chip'+(sel&&sel.key===k&&sel.type!=='ocean'?' on':'')} onClick={()=>api.current.pickContinent&&api.current.pickContinent(k)}><span className="dot" style={{background:CONT[k].color}} /><span>{CONT[k].ko}</span><small>{CONT[k].en.split(' ')[0]}</small></button>))}</div>
        <div className="legend-col"><h4>5 Oceans</h4>{OCEAN_ORDER.map(k=>(<button key={k} className={'chip'+(sel&&sel.type==='ocean'&&sel.key===k?' on':'')} onClick={()=>api.current.pickOcean&&api.current.pickOcean(k)}><span className="dot" style={{background:OCEAN[k].color}} /><span>{OCEAN[k].ko}</span><small>{OCEAN[k].en.split(' ')[0]}</small></button>))}</div>
      </div><div className="note">남극(Antarctica)은 6대륙에서 제외</div></div>
      <div className="grid-panel">
        <h4>Grid</h4>
        <label className="tg"><input type="checkbox" checked={grat} onChange={e=>setGrat(e.target.checked)} /><span>위경도 격자</span></label>
        <label className="tg"><input type="checkbox" checked={eq} onChange={e=>setEq(e.target.checked)} /><span>적도</span></label>
        <label className="tg"><input type="checkbox" checked={prime} onChange={e=>setPrime(e.target.checked)} /><span>본초자오선</span></label>
        <div className="step"><span>간격</span><input type="number" min="5" max="90" step="5" value={step} onChange={e=>setStep(e.target.value)} /><span>°</span></div>
        <label className="tg tg-sep"><input type="checkbox" checked={country} onChange={e=>setCountry(e.target.checked)} /><span>국가 선택 <small>(실험)</small></span></label>
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
        <button className="ctrl home" aria-label="처음으로" onClick={()=>api.current.goView&&api.current.goView(view)}>⟳</button>
      </div>
      <div className="hint">{view==='flat'?'드래그하면 지도가 좌우로 끝없이 이어집니다 · 대륙을 클릭해 보세요':view==='lens'?'드래그로 렌즈 회전 · 대륙을 클릭해 보세요':'드래그로 회전 · 휠로 확대 · 대륙을 클릭해 보세요'}</div>
      <div className="watermark">{MODE_WM[view]}</div>
      <footer className="ps-footer">Designed by <span className="ps-signature">parcyun studio</span> · <a href="https://www.instagram.com/parcyun" className="ps-ig" target="_blank" rel="noopener">@parcyun</a> · <span style={{color:'var(--ps-primary)'}}>#3 개발자 뷰</span></footer>
      <style>{`
        .gl-app{--ps-primary:#FFB11A;--bg:#04060B;--surface-1:#101319;--surface-2:#191D26;--border:#2A2F3A;--text:#fff;--text-2:#8C93A1;--font-kr:'Pretendard Variable','Pretendard','Montserrat',system-ui,sans-serif;--font-en:'Montserrat',sans-serif;--font-sig:'Covered By Your Grace',cursive;--ease:cubic-bezier(0.16,1,0.3,1);position:fixed;inset:0;background:var(--bg);color:var(--text);font-family:var(--font-kr);user-select:none;overflow:hidden}
        .gl-canvas{position:absolute;inset:0}.gl-labels{position:absolute;inset:0;pointer-events:none}#stage{position:absolute;inset:0;cursor:grab}
        .gl-lbl{position:absolute;transform:translate(-50%,-50%);letter-spacing:.02em;text-shadow:0 0 3px #000,0 0 3px #000,0 1px 4px #000;white-space:nowrap;text-align:center}
        .gl-lbl.cont{font-weight:600;color:#fff}
        .gl-lbl.ocn .kr{color:#9DB0D6;font-weight:300;font-size:14px;letter-spacing:.18em}
        .gl-lbl.ocn .en{font-family:var(--font-en);font-weight:300;color:#56627E;font-size:8.5px;letter-spacing:.32em;text-transform:uppercase;margin-top:2px}
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
        .hint{position:absolute;bottom:54px;left:50%;transform:translateX(-50%);z-index:25;font-size:11px;color:var(--text-2);font-weight:300;text-align:center;background:rgba(4,6,11,.5);padding:6px 14px;border-radius:9999px}
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
