import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoEquirectangular, geoPath, geoContains } from 'd3-geo';

// #3 최적화 개발자 뷰 — WebGL(three.js). HTML 세계지도와 UI 완전 동일 + GPU 렌더/낮밤.
// 추가 실험 요소: 벡터/위성 텍스처 토글(그리드 패널 내). 그 외 UI·색·레이아웃은 HTML판과 동일.

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const CONT = {
  asia:   { ko:'아시아', en:'Asia',        color:'#F2683C', anchor:[92,46],   fact:'세계에서 가장 큰 대륙. 전 세계 인구의 약 60%가 산다.' },
  europe: { ko:'유럽',   en:'Europe',      color:'#5AA9E6', anchor:[16,55],   fact:'작지만 많은 나라가 모여 있는 대륙.' },
  africa: { ko:'아프리카', en:'Africa',     color:'#F4C145', anchor:[20,3],    fact:'사하라 사막과 나일강이 있는 두 번째로 큰 대륙.' },
  oceania:{ ko:'오세아니아', en:'Oceania',  color:'#3FC79A', anchor:[134,-26], fact:'오스트레일리아와 태평양의 섬들로 이루어진다.' },
  na:     { ko:'북아메리카', en:'N. America', color:'#C879E0', anchor:[-100,44], fact:'캐나다·미국·멕시코가 있는 북쪽 대륙.' },
  sa:     { ko:'남아메리카', en:'S. America', color:'#86D957', anchor:[-60,-12], fact:'아마존 열대우림과 안데스산맥이 있다.' },
  ant:    { ko:'남극',   en:'Antarctica',  color:'#3A3F49', anchor:[0,-84],   fact:'얼음으로 덮인 가장 추운 대륙.' },
};
const OCEAN = {
  pacific: { ko:'태평양', en:'Pacific',  color:'#3E76A8', anchor:[-150,0],  fact:'가장 크고 깊은 바다.' },
  atlantic:{ ko:'대서양', en:'Atlantic', color:'#4A86AE', anchor:[-30,5],   fact:'아메리카와 유럽·아프리카 사이의 바다.' },
  indian:  { ko:'인도양', en:'Indian',   color:'#4E9AA0', anchor:[78,-22],  fact:'아시아 남쪽의 세 번째로 큰 바다.' },
  southern:{ ko:'남극해', en:'Southern', color:'#5A78B8', anchor:[30,-66],  fact:'남극 대륙을 둘러싼 바다.' },
  arctic:  { ko:'북극해', en:'Arctic',   color:'#4EA0C0', anchor:[0,84],    fact:'가장 작고 얼어붙은 바다.' },
};
const RES = 2048;
const projFor = (ctx) => geoEquirectangular().scale(RES / (2 * Math.PI)).translate([RES / 2, RES / 4]);
const solarDeclDeg = (m) => 23.44 * Math.sin((2 * Math.PI * ((m - 0.5) * 30.44 - 80)) / 365);

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = (n>>16)&255, g = (n>>8)&255, b = n&255;
  const f = amt < 0 ? 1 + amt : 1, add = amt > 0 ? 255*amt : 0;
  return `rgb(${Math.round(r*f+add)},${Math.round(g*f+add)},${Math.round(b*f+add)})`;
}
function buildBase({ world, oceans, night, tex, phoReady }) {
  const W = RES, H = RES/2, cv = document.createElement('canvas'); cv.width=W; cv.height=H;
  const ctx = cv.getContext('2d'); const path = geoPath(projFor(ctx), ctx);
  ctx.fillStyle = night ? '#020308' : '#04060B'; ctx.fillRect(0,0,W,H);           // 바다=배경색(HTML과 동일)
  const byC = {}; for (const f of world.features) (byC[f.properties.c] ||= []).push(f);
  for (const [c, feats] of Object.entries(byC)) {
    ctx.beginPath(); for (const f of feats) path(f);
    const col = (CONT[c] || {}).color || '#888';
    ctx.fillStyle = night ? shade(col, -0.6) : col; ctx.fill();
    ctx.lineWidth = 0.5; ctx.strokeStyle = night ? 'rgba(255,255,255,0.06)' : '#04060B'; ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function buildOverlay({ sel, world, oceans }) {
  const W = RES, H = RES/2, cv = document.createElement('canvas'); cv.width=W; cv.height=H;
  const ctx = cv.getContext('2d'); const path = geoPath(projFor(ctx), ctx);
  if (sel) {
    if (sel.type === 'ocean' && oceans[sel.key]) {
      ctx.beginPath(); path({ type:'Feature', geometry: oceans[sel.key] });
      ctx.fillStyle = 'rgba(120,180,230,0.34)'; ctx.fill();
      ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(157,176,214,0.9)'; ctx.stroke();
    } else if (sel.type === 'continent') {
      ctx.beginPath(); for (const f of world.features) if (f.properties.c === sel.key) path(f);
      ctx.fillStyle = 'rgba(255,177,26,0.22)'; ctx.fill();
      ctx.lineWidth = 2.2; ctx.strokeStyle = '#FFB11A'; ctx.stroke();
    } else if (sel.type === 'country') {
      const f = world.features.find(x => x.properties.n === sel.name);
      if (f) { ctx.beginPath(); path(f); ctx.fillStyle='rgba(255,177,26,0.30)'; ctx.fill(); ctx.lineWidth=3; ctx.strokeStyle='#FFB11A'; ctx.stroke(); }
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function lonLatToVec3(lon, lat, r) {
  const u=(lon+180)/360, v=(90-lat)/180, th=u*2*Math.PI, ph=v*Math.PI;
  return new THREE.Vector3(-Math.cos(th)*Math.sin(ph), Math.cos(ph), Math.sin(th)*Math.sin(ph)).multiplyScalar(r);
}
function vec3ToLonLat(v) {
  const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(v.y,-1,1)));
  let a = Math.atan2(v.z, -v.x)/(2*Math.PI); if (a<0) a+=1;
  return [a*360-180, lat];
}
function lineFromLonLats(pts, r, color, opacity, plane) {
  const g = new THREE.BufferGeometry();
  const arr = pts.map(([lo,la]) => plane ? new THREE.Vector3(lo/90, la/90, 0.003) : lonLatToVec3(lo,la,r));
  g.setFromPoints(arr);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent:true, opacity }));
}
function buildGrid(step, plane) {
  const grat = new THREE.Group();
  for (let lon=-180; lon<=180; lon+=step) { const p=[]; for (let la=-90; la<=90; la+=3) p.push([lon,la]); grat.add(lineFromLonLats(p,1.002,0xffffff,0.32,plane)); }
  for (let lat=-90+step; lat<90; lat+=step) { const p=[]; for (let lo=-180; lo<=180; lo+=3) p.push([lo,lat]); grat.add(lineFromLonLats(p,1.002,0xffffff,0.32,plane)); }
  const eqP=[]; for (let lo=-180; lo<=180; lo+=3) eqP.push([lo,0]); const equator = lineFromLonLats(eqP,1.003,0xFF7B7B,0.62,plane);
  const pmP=[]; for (let la=-90; la<=90; la+=3) pmP.push([0,la]); const prime = lineFromLonLats(pmP,1.003,0xFFB270,0.6,plane);
  return { grat, equator, prime };
}

const sphereVert = `varying vec3 vWN; varying vec2 vUv; void main(){ vUv=uv; vWN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;
const sphereFrag = `uniform sampler2D dayTex,nightTex; uniform vec3 sunDir; uniform float nightBoost,dayNightOn; varying vec3 vWN; varying vec2 vUv;
void main(){ float d=dot(normalize(vWN),normalize(sunDir)); float t=mix(1.0,smoothstep(-0.10,0.12,d),dayNightOn);
  vec3 day=texture2D(dayTex,vUv).rgb, night=texture2D(nightTex,vUv).rgb*nightBoost; gl_FragColor=vec4(mix(night,day,t),1.0);} `;
const planeVert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;
const planeFrag = `uniform sampler2D dayTex,nightTex; uniform float sunLon,sunLat,nightBoost,dayNightOn; varying vec2 vUv;
void main(){ float lon=(vUv.x-0.5)*360.0, lat=(vUv.y-0.5)*180.0; float rl=radians(lat),ro=radians(lon),sa=radians(sunLat),so=radians(sunLon);
  float cz=sin(rl)*sin(sa)+cos(rl)*cos(sa)*cos(ro-so); float t=mix(1.0,smoothstep(-0.10,0.12,cz),dayNightOn);
  vec3 day=texture2D(dayTex,vUv).rgb, night=texture2D(nightTex,vUv).rgb*nightBoost; gl_FragColor=vec4(mix(night,day,t),1.0);} `;
const atmoVert = `varying vec3 vN; void main(){ vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;
const atmoFrag = `varying vec3 vN; uniform vec3 glow; void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(cameraPosition))),2.5); gl_FragColor=vec4(glow,f*0.85);} `;

const MODE_WM = { flat:'Equirectangular', lens:'Focus Lens', globe:'Orthographic Globe' };

export default function GlobeLab() {
  const mountRef = useRef(null), labelRef = useRef(null), api = useRef({});
  const S = useRef({ view:'globe', tex:'vector', country:false, dayNight:false, dnPlay:true, month:6, grat:true, eq:true, prime:false, step:20, sunLon:0 });
  const [view,setView]=useState('globe'), [texMode,setTexMode]=useState('vector');
  const [country,setCountry]=useState(false), [dayNight,setDayNight]=useState(false), [dnPlay,setDnPlay]=useState(true), [month,setMonth]=useState(6);
  const [grat,setGrat]=useState(true), [eq,setEq]=useState(true), [prime,setPrime]=useState(false), [step,setStep]=useState(20);
  const [sel,setSel]=useState(null), [status,setStatus]=useState('로딩 중…');

  useEffect(()=>{ Object.assign(S.current,{view,tex:texMode,country,dayNight,dnPlay,month,grat,eq,prime,step:+step||20}); },[view,texMode,country,dayNight,dnPlay,month,grat,eq,prime,step]);
  useEffect(()=>{ api.current.applyTex && api.current.applyTex(); },[texMode]);
  useEffect(()=>{ api.current.applyView && api.current.applyView(); },[view]);
  useEffect(()=>{ api.current.applyGrid && api.current.applyGrid(); },[grat,eq,prime,step]);
  useEffect(()=>{ api.current.applySel && api.current.applySel(sel); },[sel]);
  useEffect(()=>{ api.current.applyDN && api.current.applyDN(); },[dayNight]);

  useEffect(() => {
    const mount = mountRef.current; let raf, renderer, controls, disposed=false;
    (async () => {
      const w=mount.clientWidth, h=mount.clientHeight;
      const scene=new THREE.Scene();
      const camera=new THREE.PerspectiveCamera(38, w/h, 0.1, 200); camera.position.set(0,0.4,4.4);
      renderer=new THREE.WebGLRenderer({ antialias:true, alpha:true }); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(w,h);
      mount.appendChild(renderer.domElement);
      controls=new OrbitControls(camera, renderer.domElement); controls.enableDamping=true; controls.dampingFactor=0.08; controls.minDistance=1.5; controls.maxDistance=9; controls.enablePan=false;

      const sg=new THREE.BufferGeometry(), N=1200, sp=new Float32Array(N*3);
      for(let i=0;i<N;i++){const r=55+Math.random()*40,t=Math.acos(2*Math.random()-1),p=2*Math.PI*Math.random();sp[i*3]=r*Math.sin(t)*Math.cos(p);sp[i*3+1]=r*Math.cos(t);sp[i*3+2]=r*Math.sin(t)*Math.sin(p);}
      sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
      scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0x5a5f6e,size:0.13,sizeAttenuation:true})));

      setStatus('지형 데이터 로딩…');
      const [world,oceans]=await Promise.all([fetch('/lab-data/world.json').then(r=>r.json()),fetch('/lab-data/oceans.json').then(r=>r.json())]);
      if(disposed)return;
      const vDay=buildBase({world,oceans,night:false}), vNight=buildBase({world,oceans,night:true});

      setStatus('위성 텍스처 로딩…');
      const loader=new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
      const lt=(u)=>new Promise(res=>loader.load(u,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;res(t);},undefined,()=>res(null)));
      const [phoDay,phoNight]=await Promise.all([lt('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'),lt('https://threejs.org/examples/textures/planets/earth_lights_2048.png')]);
      if(disposed)return;

      const u={dayTex:{value:vDay},nightTex:{value:vNight},sunDir:{value:new THREE.Vector3(1,0,0)},nightBoost:{value:1},dayNightOn:{value:0}};
      const globe=new THREE.Mesh(new THREE.SphereGeometry(1,96,96),new THREE.ShaderMaterial({vertexShader:sphereVert,fragmentShader:sphereFrag,uniforms:u}));
      globe.rotation.y=-Math.PI/2; scene.add(globe);
      const atmo=new THREE.Mesh(new THREE.SphereGeometry(1.02,64,64),new THREE.ShaderMaterial({vertexShader:atmoVert,fragmentShader:atmoFrag,uniforms:{glow:{value:new THREE.Color(0x2b6cff)}},blending:THREE.AdditiveBlending,side:THREE.BackSide,transparent:true,depthWrite:false}));
      scene.add(atmo);
      let overlayTex=buildOverlay({sel:null,world,oceans});
      const gOverlay=new THREE.Mesh(new THREE.SphereGeometry(1.004,96,96),new THREE.MeshBasicMaterial({map:overlayTex,transparent:true,depthWrite:false})); globe.add(gOverlay);

      const pu={dayTex:{value:vDay},nightTex:{value:vNight},sunLon:{value:0},sunLat:{value:0},nightBoost:{value:1},dayNightOn:{value:0}};
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(4,2,1,1),new THREE.ShaderMaterial({vertexShader:planeVert,fragmentShader:planeFrag,uniforms:pu}));
      const pOverlay=new THREE.Mesh(new THREE.PlaneGeometry(4,2,1,1),new THREE.MeshBasicMaterial({map:overlayTex,transparent:true,depthWrite:false})); pOverlay.position.z=0.002; plane.add(pOverlay); plane.visible=false; scene.add(plane);

      // 격자/적도/본초자오선 (지구본용 · 평면용)
      let gGrid=buildGrid(S.current.step,false), pGrid=buildGrid(S.current.step,true);
      globe.add(gGrid.grat,gGrid.equator,gGrid.prime); plane.add(pGrid.grat,pGrid.equator,pGrid.prime);
      const applyGrid=()=>{ const st=S.current;
        if(gGrid._step!==st.step){ [gGrid,pGrid].forEach(g=>{g.grat.parent&&g.grat.parent.remove(g.grat,g.equator,g.prime);});
          gGrid=buildGrid(st.step,false); pGrid=buildGrid(st.step,true); gGrid._step=pGrid._step=st.step;
          globe.add(gGrid.grat,gGrid.equator,gGrid.prime); plane.add(pGrid.grat,pGrid.equator,pGrid.prime); }
        for(const g of [gGrid,pGrid]){ g.grat.visible=st.grat; g.equator.visible=st.eq; g.prime.visible=st.prime; } };
      gGrid._step=pGrid._step=S.current.step;

      const applyTex=()=>{ const st=S.current, pho=st.tex==='photoreal'&&phoDay;
        const day=pho?phoDay:vDay, night=pho?(phoNight||phoDay):vNight;
        u.dayTex.value=day; u.nightTex.value=night; u.nightBoost.value=pho?2.2:1;
        pu.dayTex.value=day; pu.nightTex.value=night; pu.nightBoost.value=pho?2.2:1;
        atmo.material.uniforms.glow.value.set(pho?0x2b6cff:0x2b6cff); };
      const applyView=()=>{ const v=S.current.view, g=v!=='flat';
        globe.visible=g; atmo.visible=v==='globe'; plane.visible=!g;
        controls.enableRotate=g; controls.enablePan=!g;
        if(v==='globe'){ camera.fov=38; camera.position.set(0,0.4,4.4); controls.target.set(0,0,0); controls.minDistance=1.5; controls.maxDistance=9; }
        else if(v==='lens'){ camera.fov=64; camera.position.set(0,0,2.5); controls.target.set(0,0,0); controls.minDistance=1.8; controls.maxDistance=6; }
        else { camera.fov=38; camera.position.set(0,0,3.4); controls.target.set(0,0,0); controls.minDistance=1.4; controls.maxDistance=8; }
        camera.updateProjectionMatrix(); controls.update(); };
      const applyDN=()=>{ u.dayNightOn.value=S.current.dayNight?1:0; pu.dayNightOn.value=u.dayNightOn.value; };
      const applySel=(s)=>{ overlayTex.dispose(); overlayTex=buildOverlay({sel:s,world,oceans}); gOverlay.material.map=overlayTex; pOverlay.material.map=overlayTex; gOverlay.material.needsUpdate=true; pOverlay.material.needsUpdate=true; };
      const dolly=(f)=>{ const off=camera.position.clone().sub(controls.target); off.setLength(THREE.MathUtils.clamp(off.length()*f,controls.minDistance,controls.maxDistance)); camera.position.copy(controls.target).add(off); controls.update(); };
      api.current={applyTex,applyView,applyGrid,applyDN,applySel,dolly,home:()=>applyView(),
        pickContinent:(key)=>setSelExt({type:'continent',key}),pickOcean:(key)=>setSelExt({type:'ocean',key})};
      applyTex(); applyView(); applyGrid(); applyDN();

      const setSelExt=(s)=>{ pendingSel=s; }; let pendingSel=undefined;
      api.current._drain=()=>{ if(pendingSel!==undefined){ const s=pendingSel; pendingSel=undefined; return s; } return undefined; };

      // 라벨
      const labels={};
      const mk=(dict,cls)=>{ for(const k of Object.keys(dict)){ const el=document.createElement('div'); el.className='gl-lbl '+cls; el.innerHTML= cls==='ocn'?`<div class="kr">${dict[k].ko}</div>`:dict[k].ko; labelRef.current.appendChild(el); labels[cls+k]={el,anchor:dict[k].anchor}; } };
      mk(CONT,'cont'); mk(OCEAN,'ocn');

      const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); let downXY=null; const dom=renderer.domElement;
      dom.addEventListener('pointerdown',e=>{downXY=[e.clientX,e.clientY];});
      dom.addEventListener('pointerup',e=>{ if(!downXY)return; const moved=Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1]); downXY=null; if(moved>6)return;
        const rect=dom.getBoundingClientRect(); ptr.x=((e.clientX-rect.left)/rect.width)*2-1; ptr.y=-((e.clientY-rect.top)/rect.height)*2+1; ray.setFromCamera(ptr,camera);
        const g=S.current.view!=='flat'; const hit=ray.intersectObject(g?globe:plane,false)[0]; if(!hit)return;
        let lon,lat; if(g){ const loc=globe.worldToLocal(hit.point.clone()); [lon,lat]=vec3ToLonLat(loc.normalize()); } else { lon=(hit.uv.x-0.5)*360; lat=(hit.uv.y-0.5)*180; }
        const c=world.features.find(f=>geoContains(f,[lon,lat]));
        if(c){ setSel(S.current.country?{type:'country',name:c.properties.n,key:c.properties.c}:{type:'continent',key:c.properties.c}); return; }
        let ok=null; for(const k of Object.keys(OCEAN)) if(oceans[k]&&geoContains({type:'Feature',geometry:oceans[k]},[lon,lat])){ok=k;break;} setSel(ok?{type:'ocean',key:ok}:null); });

      const onResize=()=>{const W=mount.clientWidth,H=mount.clientHeight;camera.aspect=W/H;camera.updateProjectionMatrix();renderer.setSize(W,H);};
      window.addEventListener('resize',onResize);
      const clock=new THREE.Clock(), v3=new THREE.Vector3();
      const loop=()=>{ raf=requestAnimationFrame(loop); const dt=clock.getDelta(); const st=S.current;
        const drained=api.current._drain&&api.current._drain(); if(drained!==undefined) setSel(drained);
        const decl=solarDeclDeg(st.month)*Math.PI/180; u.sunDir.value.set(Math.cos(decl),Math.sin(decl),0).normalize(); pu.sunLat.value=solarDeclDeg(st.month);
        if(st.dayNight&&st.dnPlay){ if(st.view==='flat') st.sunLon=((st.sunLon-dt*18+540)%360)-180; else globe.rotation.y+=dt*0.16; }
        pu.sunLon.value=st.sunLon;
        controls.update(); renderer.render(scene,camera);
        const g=st.view!=='flat';
        for(const key in labels){ const {el,anchor}=labels[key]; let world3,faceOk=true;
          if(g){ const local=lonLatToVec3(anchor[0],anchor[1],1.02); world3=local.clone(); globe.localToWorld(world3);
            const nrm=local.clone().applyQuaternion(globe.quaternion).normalize(); faceOk=nrm.dot(v3.copy(camera.position).sub(world3).normalize())>0.02; }
          else world3=plane.localToWorld(new THREE.Vector3(anchor[0]/90,anchor[1]/90,0.01));
          const p=world3.project(camera);
          if(!faceOk||p.z>1||Math.abs(p.x)>1.06||Math.abs(p.y)>1.06){el.style.display='none';continue;}
          el.style.display='block'; el.style.left=((p.x*0.5+0.5)*mount.clientWidth)+'px'; el.style.top=((-p.y*0.5+0.5)*mount.clientHeight)+'px'; }
      };
      loop(); setStatus('');
      GlobeLab._cleanup=()=>{window.removeEventListener('resize',onResize);cancelAnimationFrame(raf);controls.dispose();renderer.dispose();if(dom.parentNode)dom.parentNode.removeChild(dom);if(labelRef.current)labelRef.current.innerHTML='';};
    })();
    return ()=>{disposed=true; if(GlobeLab._cleanup)GlobeLab._cleanup();};
  }, []);

  const info = sel && (sel.type==='ocean' ? { sw:OCEAN[sel.key].color, en:OCEAN[sel.key].en, kr:OCEAN[sel.key].ko, fact:OCEAN[sel.key].fact }
    : sel.type==='continent' ? { sw:CONT[sel.key].color, en:CONT[sel.key].en, kr:CONT[sel.key].ko, fact:CONT[sel.key].fact }
    : { sw:(CONT[sel.key]||{}).color||'#888', en:(CONT[sel.key]||{}).en||'', kr:sel.name, fact:(CONT[sel.key]?`${CONT[sel.key].ko} 대륙의 나라`:'') });

  return (
    <div id="app" className="gl-app">
      <div className="topbar"><div className="title-wrap">
        <div className="kicker">World Map · Interactive</div>
        <div className="title">세계 지도<span className="en">6대륙 5대양</span></div>
      </div></div>

      <div id="stage"><div ref={mountRef} className="gl-canvas" /><div ref={labelRef} className="gl-labels" /></div>
      {status && <div className="gl-status">{status}</div>}

      <div className={'info'+(info?' show':'')}>
        {info && <>
          <div className="swatch" style={{background:info.sw}} />
          <div className="en">{info.en}</div>
          <div className="kr">{info.kr}</div>
          <div className="fact">{info.fact}</div>
        </>}
      </div>

      <div className="legend">
        <div className="legend-cols">
          <div className="legend-col"><h4>6대륙</h4>
            {['asia','africa','europe','na','sa','oceania','ant'].map(k=>(
              <button key={k} className={'chip'+(sel&&(sel.key===k)&&sel.type!=='ocean'?' on':'')} onClick={()=>api.current.pickContinent&&api.current.pickContinent(k)}>
                <span className="dot" style={{background:CONT[k].color}} /><span>{CONT[k].ko}</span><small>{CONT[k].en}</small></button>))}
          </div>
          <div className="legend-col"><h4>5대양</h4>
            {['pacific','atlantic','indian','southern','arctic'].map(k=>(
              <button key={k} className={'chip'+(sel&&sel.type==='ocean'&&sel.key===k?' on':'')} onClick={()=>api.current.pickOcean&&api.current.pickOcean(k)}>
                <span className="dot" style={{background:OCEAN[k].color}} /><span>{OCEAN[k].ko}</span><small>{OCEAN[k].en}</small></button>))}
          </div>
        </div>
        <div className="note">대륙·대양을 클릭하면 이름과 설명이 나와요.</div>
      </div>

      <div className="grid-panel">
        <h4>Grid</h4>
        <label className="tg"><input type="checkbox" checked={grat} onChange={e=>setGrat(e.target.checked)} /><span>위경도 격자</span></label>
        <label className="tg"><input type="checkbox" checked={eq} onChange={e=>setEq(e.target.checked)} /><span>적도</span></label>
        <label className="tg"><input type="checkbox" checked={prime} onChange={e=>setPrime(e.target.checked)} /><span>본초자오선</span></label>
        <div className="step"><span>간격</span><input type="number" min="5" max="90" step="5" value={step} onChange={e=>setStep(e.target.value)} /><span>°</span></div>
        <label className="tg" style={{marginTop:'8px',borderTop:'1px solid var(--border)',paddingTop:'9px'}}><input type="checkbox" checked={country} onChange={e=>setCountry(e.target.checked)} /><span>국가 선택 <small style={{color:'var(--text-2)'}}>(실험)</small></span></label>
        <label className="tg"><input type="checkbox" checked={dayNight} onChange={e=>setDayNight(e.target.checked)} /><span>낮과 밤</span></label>
        {dayNight && <div className="daynight-ctl">
          <button className="dn-btn" title="재생/일시정지" onClick={()=>setDnPlay(p=>!p)}>{dnPlay?'❚❚':'▶'}</button>
          <input type="range" min="1" max="12" step="1" value={month} onChange={e=>setMonth(+e.target.value)} />
          <span className="dn-lbl">{MONTHS[month-1]}</span>
        </div>}
        <label className="tg" style={{marginTop:'8px',borderTop:'1px solid var(--border)',paddingTop:'9px'}}><input type="checkbox" checked={texMode==='photoreal'} onChange={e=>setTexMode(e.target.checked?'photoreal':'vector')} /><span>위성 사진 <small style={{color:'var(--text-2)'}}>(dev)</small></span></label>
      </div>

      <div className="projseg">
        <button className={view==='flat'?'on':''} onClick={()=>setView('flat')}>평면</button>
        <button className={view==='lens'?'on':''} onClick={()=>setView('lens')}>Focus Lens</button>
        <button className={view==='globe'?'on':''} onClick={()=>setView('globe')}>지구본</button>
      </div>

      <div className="controls">
        <button className="ctrl" aria-label="확대" onClick={()=>api.current.dolly&&api.current.dolly(0.8)}>+</button>
        <button className="ctrl" aria-label="축소" onClick={()=>api.current.dolly&&api.current.dolly(1.25)}>−</button>
        <button className="ctrl home" aria-label="처음으로" onClick={()=>api.current.home&&api.current.home()}>⟳</button>
      </div>

      <div className="hint">드래그로 회전 · 휠로 확대 · 대륙이나 바다를 클릭해 보세요</div>
      <div className="watermark">{MODE_WM[view]}</div>

      <footer className="ps-footer">Designed by <span className="ps-signature">parcyun studio</span> · <a href="https://www.instagram.com/parcyun" className="ps-ig" target="_blank" rel="noopener">@parcyun</a> · <span style={{color:'var(--ps-primary)'}}>#3 개발자 뷰</span></footer>

      <style>{`
        .gl-app{--ps-primary:#FFB11A;--bg:#04060B;--surface-1:#101319;--surface-2:#191D26;--border:#2A2F3A;--text:#fff;--text-2:#8C93A1;
          --font-kr:'Pretendard Variable','Pretendard','Montserrat',system-ui,sans-serif;--font-en:'Montserrat',sans-serif;--font-sig:'Covered By Your Grace',cursive;--ease:cubic-bezier(0.16,1,0.3,1);
          position:fixed;inset:0;background:var(--bg);color:var(--text);font-family:var(--font-kr);user-select:none;overflow:hidden}
        .gl-canvas{position:absolute;inset:0}.gl-labels{position:absolute;inset:0;pointer-events:none}
        #stage{position:absolute;inset:0;cursor:grab}
        .gl-lbl{position:absolute;transform:translate(-50%,-50%);font-weight:600;fill:#fff;color:#fff;font-size:13px;letter-spacing:.02em;text-shadow:0 0 3px #000,0 0 3px #000,0 1px 4px #000;white-space:nowrap}
        .gl-lbl.ocn .kr{color:#9DB0D6;font-weight:300;font-size:13px;letter-spacing:.16em}
        .gl-status{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--ps-primary);font-size:14px;z-index:40}
        .topbar{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;padding:18px 22px;pointer-events:none}
        .title-wrap{pointer-events:auto}
        .kicker{font-family:var(--font-en);font-size:10px;letter-spacing:.28em;color:var(--ps-primary);font-weight:600;text-transform:uppercase}
        .title{font-size:19px;font-weight:600;letter-spacing:-.01em;margin-top:3px}.title .en{font-family:var(--font-en);color:var(--text-2);font-weight:300;font-size:13px;margin-left:8px}
        .legend{position:absolute;left:22px;bottom:54px;z-index:30;display:flex;flex-direction:column;gap:9px;background:rgba(16,19,25,.72);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:16px;padding:14px 16px;max-width:340px}
        .legend-cols{display:flex;gap:16px}.legend-col{display:flex;flex-direction:column;gap:6px;min-width:104px}
        .legend h4{font-family:var(--font-en);font-size:9px;letter-spacing:.22em;color:var(--text-2);font-weight:600;text-transform:uppercase;margin-bottom:3px}
        .chip{display:flex;align-items:center;gap:9px;cursor:pointer;border:none;background:none;padding:3px 4px;border-radius:8px;width:100%;text-align:left;transition:background .2s}
        .chip:hover{background:rgba(255,255,255,.06)}.chip.on{background:rgba(255,177,26,.12)}
        .dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}.chip>span:not(.dot){font-size:13px;color:var(--text);font-weight:300}.chip small{font-family:var(--font-en);font-size:9px;color:var(--text-2);margin-left:auto}
        .legend .note{font-size:10px;color:var(--text-2);line-height:1.45;margin-top:5px;border-top:1px solid var(--border);padding-top:7px}
        .grid-panel{position:absolute;left:22px;top:74px;z-index:30;display:flex;flex-direction:column;gap:7px;background:rgba(16,19,25,.72);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:16px;padding:13px 15px;min-width:160px}
        .grid-panel h4{font-family:var(--font-en);font-size:9px;letter-spacing:.22em;color:var(--text-2);font-weight:600;text-transform:uppercase;margin-bottom:2px}
        .grid-panel .tg{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text);font-weight:300;cursor:pointer}
        .grid-panel .tg input[type=checkbox]{appearance:none;width:30px;height:17px;border-radius:9999px;background:var(--surface-2);border:1px solid var(--border);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
        .grid-panel .tg input[type=checkbox]::after{content:"";position:absolute;top:1.5px;left:1.5px;width:12px;height:12px;border-radius:50%;background:#8C93A1;transition:all .2s}
        .grid-panel .tg input:checked{background:rgba(255,177,26,.28);border-color:var(--ps-primary)}.grid-panel .tg input:checked::after{left:14px;background:var(--ps-primary)}
        .grid-panel .step{display:flex;align-items:center;gap:6px;margin-top:3px;border-top:1px solid var(--border);padding-top:8px}
        .grid-panel .step span{font-size:12px;color:var(--text-2);font-weight:300}
        .grid-panel .step input[type=number]{width:50px;background:var(--surface-1);border:1px solid var(--border);border-radius:7px;color:var(--text);font-family:var(--font-en);font-size:12px;padding:4px 6px;text-align:center}
        .controls{position:absolute;right:22px;bottom:54px;z-index:30;display:flex;flex-direction:column;gap:8px}
        .ctrl{width:42px;height:42px;border-radius:12px;border:1px solid var(--border);background:rgba(16,19,25,.72);backdrop-filter:blur(14px);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s var(--ease);font-family:var(--font-en)}
        .ctrl:hover{border-color:var(--ps-primary);color:var(--ps-primary)}.ctrl:active{transform:scale(.93)}.ctrl.home{font-size:15px}
        .info{position:absolute;top:74px;right:22px;z-index:30;width:248px;background:rgba(16,19,25,.82);backdrop-filter:blur(16px);border:1px solid var(--border);border-radius:20px;padding:20px;opacity:0;transform:translateY(-8px);pointer-events:none;transition:all .3s var(--ease)}
        .info.show{opacity:1;transform:translateY(0)}
        .info .swatch{width:34px;height:34px;border-radius:9px;margin-bottom:12px}.info .en{font-family:var(--font-en);font-size:10px;letter-spacing:.22em;color:var(--text-2);font-weight:600;text-transform:uppercase}
        .info .kr{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:2px 0 10px}.info .fact{font-size:13px;line-height:1.6;color:#C5CAD4;font-weight:300}
        .hint{position:absolute;bottom:54px;left:50%;transform:translateX(-50%);z-index:25;font-size:11px;color:var(--text-2);font-weight:300;text-align:center;background:rgba(4,6,11,.5);padding:6px 14px;border-radius:9999px}
        .projseg{position:absolute;top:18px;left:50%;transform:translateX(-50%);z-index:30;display:flex;gap:2px;padding:3px;border-radius:12px;border:1px solid var(--border);background:rgba(16,19,25,.72);backdrop-filter:blur(14px)}
        .projseg button{border:0;background:transparent;color:var(--text-2);font-family:var(--font-kr);font-size:12px;font-weight:500;padding:6px 13px;border-radius:9px;cursor:pointer;transition:all .18s var(--ease);white-space:nowrap}
        .projseg button:hover{color:#fff}.projseg button.on{background:var(--ps-primary);color:#0A0C10;font-weight:600}
        .watermark{position:absolute;bottom:50px;left:50%;transform:translateX(-50%);z-index:5;font-family:var(--font-en);font-size:9px;letter-spacing:.4em;color:#323a4a;text-transform:uppercase;pointer-events:none}
        .ps-footer{position:fixed;bottom:14px;right:20px;font-family:var(--font-en);font-weight:300;font-size:8pt;color:var(--text-2);display:flex;align-items:center;gap:8px;z-index:9999}
        .ps-signature{font-family:var(--font-sig);font-size:11pt;color:var(--ps-primary)}
        .ps-ig{color:inherit;text-decoration:none}.ps-ig:hover{color:var(--ps-primary)}
        @media(max-width:640px){.info{width:200px;padding:16px}.info .kr{font-size:24px}.legend{max-width:200px;padding:11px 13px;bottom:48px;left:14px}.legend-col{min-width:88px}.controls{right:14px;bottom:48px}.topbar{padding:14px 16px}.title{font-size:16px}.title .en{display:none}.grid-panel{left:14px;top:64px;min-width:0;padding:10px 12px}}
      `}</style>
    </div>
  );
}
