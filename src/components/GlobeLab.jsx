import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoEquirectangular, geoPath, geoContains } from 'd3-geo';

// #3 최적화 개발자 뷰 — WebGL(three.js) 지구본. 현재 SVG/d3 맵의 교육 기능 전부 이식.
// 6대륙/5대양 색분류+라벨 · 클릭 선택(국가·대양) · 지구본↔평면 뷰 · 낮밤 GPU 셰이더 토글 · 계절 · 자전.

const AMBER = '#FFB11A';
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const CONTINENT_KO = { asia:'아시아', africa:'아프리카', europe:'유럽', na:'북아메리카', sa:'남아메리카', oceania:'오세아니아', ant:'남극' };
const CONTINENT_COLOR = { asia:'#F2A93B', africa:'#E5793B', europe:'#5FB6C9', na:'#D5657F', sa:'#7FBE6A', oceania:'#B48CD8', ant:'#A9B2C0' };
const CONTINENT_ANCHOR = { asia:[92,46], africa:[20,3], europe:[16,55], na:[-100,44], sa:[-60,-12], oceania:[134,-26], ant:[0,-84] };

const OCEAN_KO = { pacific:'태평양', atlantic:'대서양', indian:'인도양', southern:'남극해', arctic:'북극해' };
const OCEAN_COLOR_CLASSIFY = { pacific:'#1f6aa0', atlantic:'#2b86ac', indian:'#2f9090', southern:'#3a5aa8', arctic:'#2ba0c4' };
const OCEAN_ANCHOR = { pacific:[-150,0], atlantic:[-30,5], indian:[78,-22], southern:[30,-66], arctic:[0,84] };

const RES = 2048; // 텍스처 가로

function projFor(ctx) {
  return geoEquirectangular().scale(RES / (2 * Math.PI)).translate([RES / 2, RES / 4]);
}

// 베이스 텍스처: classify=false → 시네마틱 앰버 / true → 대륙·대양 색분류
function buildBase({ world, oceans, night, classify }) {
  const W = RES, H = RES / 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const path = geoPath(projFor(ctx), ctx);

  ctx.fillStyle = night ? '#02040a' : '#060a16';
  ctx.fillRect(0, 0, W, H);

  // 대양
  for (const key of Object.keys(OCEAN_KO)) {
    const geo = oceans[key]; if (!geo) continue;
    ctx.beginPath(); path({ type: 'Feature', geometry: geo });
    if (classify) {
      const c = OCEAN_COLOR_CLASSIFY[key];
      ctx.fillStyle = night ? shade(c, -0.62) : shade(c, -0.15);
    } else {
      ctx.fillStyle = night ? '#081226' : '#0d1b34';
    }
    ctx.fill();
  }

  // 육지
  if (classify) {
    // 대륙별 색
    const byC = {};
    for (const f of world.features) (byC[f.properties.c] ||= []).push(f);
    for (const [c, feats] of Object.entries(byC)) {
      ctx.beginPath(); for (const f of feats) path(f);
      const col = CONTINENT_COLOR[c] || '#999';
      ctx.fillStyle = night ? shade(col, -0.55) : col; ctx.fill();
      ctx.lineWidth = 0.6; ctx.strokeStyle = night ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.28)'; ctx.stroke();
    }
  } else {
    ctx.beginPath(); for (const f of world.features) path(f);
    if (night) { ctx.fillStyle = '#241703'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,177,26,0.35)'; ctx.stroke(); }
    else { ctx.fillStyle = AMBER; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,209,122,0.6)'; ctx.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// 선택 하이라이트 오버레이(투명) — 베이스와 무관하게 항상 표시
function buildOverlay({ selected, world, oceans }) {
  const W = RES, H = RES / 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const path = geoPath(projFor(ctx), ctx);
  if (selected) {
    let geom = null;
    if (selected.type === 'ocean') geom = oceans[selected.key] && { type: 'Feature', geometry: oceans[selected.key] };
    else geom = world.features.find(f => f.properties.n === selected.name);
    if (geom) {
      ctx.beginPath(); path(geom);
      ctx.fillStyle = 'rgba(255,177,26,0.34)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#FFD37A'; ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function shade(hex, amt) { // amt<0 어둡게, >0 밝게
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 1 + amt : 1; const add = amt > 0 ? 255 * amt : 0;
  r = Math.round(r * f + add); g = Math.round(g * f + add); b = Math.round(b * f + add);
  return `rgb(${r},${g},${b})`;
}

function solarDeclDeg(month) { return 23.44 * Math.sin((2 * Math.PI * ((month - 0.5) * 30.44 - 80)) / 365); }

function lonLatToVec3(lon, lat, r) {
  const u = (lon + 180) / 360, v = (90 - lat) / 180, th = u * 2 * Math.PI, ph = v * Math.PI;
  return new THREE.Vector3(-Math.cos(th) * Math.sin(ph), Math.cos(ph), Math.sin(th) * Math.sin(ph)).multiplyScalar(r);
}
function vec3ToLonLat(v) {
  const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(v.y, -1, 1)));
  let a = Math.atan2(v.z, -v.x) / (2 * Math.PI); if (a < 0) a += 1;
  return [a * 360 - 180, lat];
}

const sphereVert = `varying vec3 vWN; varying vec2 vUv;
void main(){ vUv=uv; vWN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const sphereFrag = `uniform sampler2D dayTex,nightTex; uniform vec3 sunDir; uniform float nightBoost,dayNightOn;
varying vec3 vWN; varying vec2 vUv;
void main(){ float d=dot(normalize(vWN),normalize(sunDir)); float lit=smoothstep(-0.10,0.12,d);
  float t=mix(1.0,lit,dayNightOn); vec3 day=texture2D(dayTex,vUv).rgb; vec3 night=texture2D(nightTex,vUv).rgb*nightBoost;
  gl_FragColor=vec4(mix(night,day,t),1.0); }`;

const planeVert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const planeFrag = `uniform sampler2D dayTex,nightTex; uniform float sunLon,sunLat,nightBoost,dayNightOn;
varying vec2 vUv;
void main(){ float lon=(vUv.x-0.5)*360.0; float lat=(vUv.y-0.5)*180.0;
  float rl=radians(lat),ro=radians(lon),sa=radians(sunLat),so=radians(sunLon);
  float cz=sin(rl)*sin(sa)+cos(rl)*cos(sa)*cos(ro-so);
  float t=mix(1.0,smoothstep(-0.10,0.12,cz),dayNightOn);
  vec3 day=texture2D(dayTex,vUv).rgb; vec3 night=texture2D(nightTex,vUv).rgb*nightBoost;
  gl_FragColor=vec4(mix(night,day,t),1.0); }`;

const atmoFrag = `varying vec3 vN; uniform vec3 glow;
void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(cameraPosition))),2.5); gl_FragColor=vec4(glow,f*0.9); }`;
const atmoVert = `varying vec3 vN; void main(){ vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

export default function GlobeLab() {
  const mountRef = useRef(null);
  const labelRef = useRef(null);
  const S = useRef({ view: 'globe', tex: 'vector', classify: false, selectTool: true, dayNight: true, playing: true, month: 6, sunLon: 0 });
  const api = useRef({});
  const [view, setView] = useState('globe');
  const [tex, setTex] = useState('vector');
  const [classify, setClassify] = useState(false);
  const [selectTool, setSelectTool] = useState(true);
  const [dayNight, setDayNight] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [month, setMonth] = useState(6);
  const [sel, setSel] = useState(null);
  const [status, setStatus] = useState('로딩 중…');

  useEffect(() => { Object.assign(S.current, { view, tex, classify, selectTool, dayNight, playing, month }); }, [view, tex, classify, selectTool, dayNight, playing, month]);
  useEffect(() => { if (api.current.applyTex) api.current.applyTex(); }, [tex, classify]);
  useEffect(() => { if (api.current.applyView) api.current.applyView(); }, [view]);
  useEffect(() => { if (api.current.applySelection) api.current.applySelection(sel); }, [sel]);

  useEffect(() => {
    const mount = mountRef.current; let raf, renderer, controls, disposed = false;
    (async () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 200);
      camera.position.set(0, 0.6, 4.4);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h);
      mount.appendChild(renderer.domElement);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 1.6; controls.maxDistance = 9; controls.enablePan = false;

      // 별 배경
      const sg = new THREE.BufferGeometry(); const N = 1400, sp = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const r = 50 + Math.random() * 40, t = Math.acos(2 * Math.random() - 1), p = 2 * Math.PI * Math.random(); sp[i*3]=r*Math.sin(t)*Math.cos(p); sp[i*3+1]=r*Math.cos(t); sp[i*3+2]=r*Math.sin(t)*Math.sin(p); }
      sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x666a78, size: 0.14, sizeAttenuation: true })));

      setStatus('지형 데이터 로딩…');
      const [world, oceans] = await Promise.all([fetch('/lab-data/world.json').then(r => r.json()), fetch('/lab-data/oceans.json').then(r => r.json())]);
      if (disposed) return;

      // 벡터 베이스 4종 (classify x night)
      const vec = { false: { false: buildBase({ world, oceans, night: false, classify: false }), true: buildBase({ world, oceans, night: true, classify: false }) },
                    true: { false: buildBase({ world, oceans, night: false, classify: true }), true: buildBase({ world, oceans, night: true, classify: true }) } };

      setStatus('텍스처 로딩…');
      const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
      const lt = (u) => new Promise(res => loader.load(u, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
      const [phoDay, phoNight] = await Promise.all([lt('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'), lt('https://threejs.org/examples/textures/planets/earth_lights_2048.png')]);
      if (disposed) return;

      // 지구본
      const u = { dayTex: { value: null }, nightTex: { value: null }, sunDir: { value: new THREE.Vector3(1, 0, 0) }, nightBoost: { value: 1 }, dayNightOn: { value: 1 } };
      const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), new THREE.ShaderMaterial({ vertexShader: sphereVert, fragmentShader: sphereFrag, uniforms: u }));
      globe.rotation.y = -Math.PI / 2; scene.add(globe);
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 64), new THREE.ShaderMaterial({ vertexShader: atmoVert, fragmentShader: atmoFrag, uniforms: { glow: { value: new THREE.Color(0xff8a1a) } }, blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false }));
      scene.add(atmo);
      let overlayTex = buildOverlay({ selected: null, world, oceans });
      const gOverlay = new THREE.Mesh(new THREE.SphereGeometry(1.004, 96, 96), new THREE.MeshBasicMaterial({ map: overlayTex, transparent: true, depthWrite: false }));
      globe.add(gOverlay);

      // 평면
      const pu = { dayTex: { value: null }, nightTex: { value: null }, sunLon: { value: 0 }, sunLat: { value: 0 }, nightBoost: { value: 1 }, dayNightOn: { value: 1 } };
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(4, 2, 1, 1), new THREE.ShaderMaterial({ vertexShader: planeVert, fragmentShader: planeFrag, uniforms: pu }));
      const pOverlay = new THREE.Mesh(new THREE.PlaneGeometry(4, 2, 1, 1), new THREE.MeshBasicMaterial({ map: overlayTex, transparent: true, depthWrite: false }));
      pOverlay.position.z = 0.001; plane.add(pOverlay); plane.visible = false; scene.add(plane);

      const applyTex = () => {
        const st = S.current, pho = st.tex === 'photoreal' && phoDay;
        const day = pho ? phoDay : vec[st.classify][false];
        const night = pho ? (phoNight || phoDay) : vec[st.classify][true];
        u.dayTex.value = day; u.nightTex.value = night; u.nightBoost.value = pho ? 2.2 : 1;
        pu.dayTex.value = day; pu.nightTex.value = night; pu.nightBoost.value = pho ? 2.2 : 1;
        atmo.material.uniforms.glow.value.set(pho ? 0x2b6cff : 0xff8a1a);
      };
      const applyView = () => {
        const g = S.current.view === 'globe';
        globe.visible = g; atmo.visible = g; plane.visible = !g;
        controls.enableRotate = g; controls.enablePan = !g;
        controls.minDistance = g ? 1.6 : 1.2; controls.maxDistance = g ? 9 : 8;
        if (g) { camera.position.set(0, 0.6, 4.4); controls.target.set(0, 0, 0); }
        else { camera.position.set(0, 0, 3.4); controls.target.set(0, 0, 0); }
        controls.update();
      };
      const applySelection = (selected) => { overlayTex.dispose(); overlayTex = buildOverlay({ selected, world, oceans }); gOverlay.material.map = overlayTex; pOverlay.material.map = overlayTex; gOverlay.material.needsUpdate = true; pOverlay.material.needsUpdate = true; };
      api.current = { applyTex, applyView, applySelection };
      applyTex(); applyView();
      u.dayNightOn.value = S.current.dayNight ? 1 : 0; pu.dayNightOn.value = u.dayNightOn.value;

      // 라벨 DOM
      const labels = {};
      const mkLabels = (dict, ko, cls) => { for (const k of Object.keys(dict)) { const el = document.createElement('div'); el.className = 'gl-label ' + cls; el.textContent = ko[k]; labelRef.current.appendChild(el); labels[cls + k] = { el, anchor: dict[k] }; } };
      mkLabels(CONTINENT_ANCHOR, CONTINENT_KO, 'cont'); mkLabels(OCEAN_ANCHOR, OCEAN_KO, 'ocn');

      // 선택(레이캐스트)
      const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let downXY = null;
      const dom = renderer.domElement;
      dom.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; });
      dom.addEventListener('pointerup', e => {
        if (!downXY) return; const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]); downXY = null;
        if (moved > 6 || !S.current.selectTool) return;
        const rect = dom.getBoundingClientRect();
        ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        ray.setFromCamera(ptr, camera);
        const g = S.current.view === 'globe';
        const hit = ray.intersectObject(g ? globe : plane, false)[0]; if (!hit) return;
        let lon, lat;
        if (g) { const loc = globe.worldToLocal(hit.point.clone()); [lon, lat] = vec3ToLonLat(loc.normalize()); }
        else { lon = (hit.uv.x - 0.5) * 360; lat = (hit.uv.y - 0.5) * 180; }
        const country = world.features.find(f => geoContains(f, [lon, lat]));
        if (country) { setSel({ type: 'country', name: country.properties.n, continent: country.properties.c }); return; }
        let okey = null; for (const k of Object.keys(OCEAN_KO)) if (oceans[k] && geoContains({ type: 'Feature', geometry: oceans[k] }, [lon, lat])) { okey = k; break; }
        setSel(okey ? { type: 'ocean', key: okey, name: OCEAN_KO[okey] } : null);
      });

      const onResize = () => { const W = mount.clientWidth, H = mount.clientHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); };
      window.addEventListener('resize', onResize);

      const clock = new THREE.Clock();
      const v3 = new THREE.Vector3();
      const loop = () => {
        raf = requestAnimationFrame(loop); const dt = clock.getDelta(); const st = S.current;
        const decl = solarDeclDeg(st.month) * Math.PI / 180;
        u.sunDir.value.set(Math.cos(decl), Math.sin(decl), 0).normalize();
        u.dayNightOn.value = st.dayNight ? 1 : 0; pu.dayNightOn.value = u.dayNightOn.value;
        pu.sunLat.value = solarDeclDeg(st.month);
        if (st.playing) {
          if (st.view === 'globe') globe.rotation.y += dt * 0.18;
          else { st.sunLon = ((st.sunLon - dt * 18 + 540) % 360) - 180; }
        }
        pu.sunLon.value = st.sunLon;
        controls.update(); renderer.render(scene, camera);

        // 라벨 투영 (색분류 ON일 때만)
        const showLabels = st.classify; const g = st.view === 'globe';
        for (const key in labels) {
          const { el, anchor } = labels[key]; const isOcn = key.startsWith('ocn');
          if (!showLabels) { el.style.display = 'none'; continue; }
          let world3, faceOk = true;
          if (g) { const local = lonLatToVec3(anchor[0], anchor[1], 1.02); world3 = local.clone(); globe.localToWorld(world3);
            const nrm = local.clone().applyQuaternion(globe.quaternion).normalize(); const toCam = v3.copy(camera.position).sub(world3).normalize(); faceOk = nrm.dot(toCam) > 0.02; }
          else { world3 = plane.localToWorld(new THREE.Vector3(anchor[0] / 90, anchor[1] / 90, 0.01)); }
          const p = world3.project(camera);
          if (!faceOk || p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) { el.style.display = 'none'; continue; }
          el.style.display = 'block';
          el.style.left = ((p.x * 0.5 + 0.5) * mount.clientWidth) + 'px';
          el.style.top = ((-p.y * 0.5 + 0.5) * mount.clientHeight) + 'px';
          el.style.color = isOcn ? '#9fd4e6' : '#fff';
        }
      };
      loop(); setStatus('');
      GlobeLab._cleanup = () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); controls.dispose(); renderer.dispose(); if (dom.parentNode) dom.parentNode.removeChild(dom); if (labelRef.current) labelRef.current.innerHTML = ''; };
    })();
    return () => { disposed = true; if (GlobeLab._cleanup) GlobeLab._cleanup(); };
  }, []);

  const selInfo = sel && (sel.type === 'country'
    ? `${sel.name} · ${CONTINENT_KO[sel.continent] || sel.continent}`
    : `${sel.name} (대양)`);

  return (
    <div className="globelab">
      <div ref={mountRef} className="gl-canvas" />
      <div ref={labelRef} className="gl-labels" />
      {status && <div className="gl-status">{status}</div>}

      {sel && <div className="gl-selchip"><b>{sel.type === 'country' ? sel.name : sel.name}</b><span>{sel.type === 'country' ? (CONTINENT_KO[sel.continent] || sel.continent) : '대양'}</span><button onClick={() => setSel(null)}>✕</button></div>}

      <div className="gl-panel">
        <div className="gl-seg">
          <button className={view === 'globe' ? 'on' : ''} onClick={() => setView('globe')}>🌐 지구본</button>
          <button className={view === 'flat' ? 'on' : ''} onClick={() => setView('flat')}>🗺 평면</button>
        </div>
        <div className="gl-seg">
          <button className={tex === 'vector' ? 'on' : ''} onClick={() => setTex('vector')}>벡터</button>
          <button className={tex === 'photoreal' ? 'on' : ''} onClick={() => setTex('photoreal')}>포토리얼</button>
        </div>
        <div className="gl-toggles">
          <label className={classify ? 'on' : ''}><input type="checkbox" checked={classify} onChange={e => setClassify(e.target.checked)} />6대륙·5대양</label>
          <label className={selectTool ? 'on' : ''}><input type="checkbox" checked={selectTool} onChange={e => setSelectTool(e.target.checked)} />선택</label>
          <label className={dayNight ? 'on' : ''}><input type="checkbox" checked={dayNight} onChange={e => setDayNight(e.target.checked)} />낮/밤</label>
        </div>
        <div className="gl-row">
          <button className="gl-play" onClick={() => setPlaying(p => !p)}>{playing ? '❚❚ 정지' : '▶ 재생'}</button>
          <div className="gl-month">
            <input type="range" min="1" max="12" value={month} onChange={e => setMonth(+e.target.value)} disabled={!dayNight} />
            <span>{MONTHS[month - 1]}</span>
          </div>
        </div>
      </div>

      <div className="gl-footer">Designed by parcyun studio · @parcyun · <span>#3 최적화 개발자 뷰</span></div>

      <style>{`
        .globelab{position:fixed;inset:0;background:#000;color:#fff;font-family:'Pretendard',system-ui,sans-serif;overflow:hidden;user-select:none}
        .gl-canvas{position:absolute;inset:0}
        .gl-labels{position:absolute;inset:0;pointer-events:none}
        .gl-label{position:absolute;transform:translate(-50%,-50%);font-size:12.5px;font-weight:700;letter-spacing:.02em;text-shadow:0 1px 4px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.9);white-space:nowrap}
        .gl-label.ocn{font-weight:600;font-size:11.5px;opacity:.92}
        .gl-status{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:${AMBER};font-size:14px;letter-spacing:.04em}
        .gl-selchip{position:absolute;top:22px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:9px 14px;background:rgba(10,10,12,.72);border:1px solid rgba(255,177,26,.4);border-radius:999px;backdrop-filter:blur(8px)}
        .gl-selchip b{color:${AMBER};font-size:14px}
        .gl-selchip span{color:#cdd0d6;font-size:12px}
        .gl-selchip button{background:none;border:none;color:#8a8e98;cursor:pointer;font-size:13px}
        .gl-panel{position:absolute;left:50%;bottom:60px;transform:translateX(-50%);display:flex;flex-direction:column;gap:9px;align-items:center;padding:14px 18px;background:rgba(10,10,12,.62);border:1px solid rgba(255,177,26,.22);border-radius:16px;backdrop-filter:blur(10px);max-width:94vw}
        .gl-seg{display:flex;gap:6px}
        .gl-seg button{padding:7px 15px;border:1px solid rgba(255,177,26,.3);background:transparent;color:#cdd0d6;border-radius:999px;font-size:12.5px;cursor:pointer;transition:.15s}
        .gl-seg button.on{background:${AMBER};color:#000;border-color:${AMBER};font-weight:700}
        .gl-toggles{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
        .gl-toggles label{display:flex;align-items:center;gap:5px;font-size:12px;color:#aab;padding:5px 10px;border:1px solid rgba(255,255,255,.14);border-radius:999px;cursor:pointer}
        .gl-toggles label.on{color:${AMBER};border-color:rgba(255,177,26,.5)}
        .gl-toggles input{accent-color:${AMBER};margin:0}
        .gl-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:center}
        .gl-play{padding:7px 15px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;border-radius:999px;font-size:12.5px;cursor:pointer;min-width:84px}
        .gl-month{display:flex;align-items:center;gap:9px}
        .gl-month input{width:160px;accent-color:${AMBER}}
        .gl-month input:disabled{opacity:.4}
        .gl-month span{font-variant-numeric:tabular-nums;color:${AMBER};font-size:12.5px;min-width:32px}
        .gl-footer{position:absolute;left:0;right:0;bottom:16px;text-align:center;font-size:11px;color:#6a6e78;font-family:'Montserrat',sans-serif;letter-spacing:.06em}
        .gl-footer span{color:${AMBER}}
        @media(max-width:640px){.gl-month input{width:110px}.gl-panel{bottom:52px;padding:11px 12px;gap:7px}}
      `}</style>
    </div>
  );
}
