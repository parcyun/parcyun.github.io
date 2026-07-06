import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoEquirectangular, geoPath } from 'd3-geo';

// #3 최적화 개발자 뷰 — WebGL(three.js) 지구본.
// 현재 SVG/d3 버전에서 가장 무거운 '지구본+낮밤'을 GPU로 옮긴 쇼케이스.
// 벡터(온브랜드)/포토리얼(NASA) 텍스처 토글, 낮밤은 월드공간 노멀·태양방향 dot으로 셰이더에서 계산.

const AMBER = '#FFB11A';
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// 계절 적위(도): 현재 맵과 동일 공식
function solarDeclDeg(month) {
  return 23.44 * Math.sin((2 * Math.PI * ((month - 0.5) * 30.44 - 80)) / 365);
}

// GeoJSON → equirectangular 2:1 캔버스 텍스처
function buildVectorTexture({ world, oceans, night }) {
  const W = 2048, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);
  const path = geoPath(proj, ctx);

  // 배경(바다 기본)
  ctx.fillStyle = night ? '#02040a' : '#060a16';
  ctx.fillRect(0, 0, W, H);

  // 대양 톤(옅게) — 5대양 각각 살짝 다른 남색/청록
  const oceanTint = night
    ? { pacific:'#061021', atlantic:'#08121f', indian:'#0a1220', southern:'#0a1526', arctic:'#0a1424' }
    : { pacific:'#0c1a33', atlantic:'#0e1c30', indian:'#111c30', southern:'#122238', arctic:'#122036' };
  for (const [key, tint] of Object.entries(oceanTint)) {
    const geo = oceans[key];
    if (!geo) continue;
    ctx.beginPath();
    path({ type: 'Feature', geometry: geo });
    ctx.fillStyle = tint;
    ctx.fill();
  }

  // 육지 — 낮: 앰버, 밤: 어두운 앰버 + 은은한 테두리 글로우
  ctx.beginPath();
  for (const f of world.features) path(f);
  if (night) {
    ctx.fillStyle = '#241703';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(255,177,26,0.35)';
    ctx.stroke();
  } else {
    ctx.fillStyle = AMBER;
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(255,209,122,0.6)';
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const dayNightVert = /* glsl */`
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal); // 월드공간 노멀 → 메시가 자전해도 태양방향과 정합
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const dayNightFrag = /* glsl */`
  uniform sampler2D dayTex;
  uniform sampler2D nightTex;
  uniform vec3 sunDir;
  uniform float nightBoost;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main(){
    float d = dot(normalize(vWorldNormal), normalize(sunDir));
    float t = smoothstep(-0.10, 0.12, d);      // 부드러운 명암 경계선
    vec3 day = texture2D(dayTex, vUv).rgb;
    vec3 night = texture2D(nightTex, vUv).rgb * nightBoost;
    gl_FragColor = vec4(mix(night, day, t), 1.0);
  }
`;

// 대기광(프레넬) — 뒷면 additive
const atmoVert = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vEye;
  void main(){
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const atmoFrag = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vEye;
  uniform vec3 glow;
  void main(){
    float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(cameraPosition))), 2.5);
    gl_FragColor = vec4(glow, f * 0.9);
  }
`;

export default function GlobeLab() {
  const mountRef = useRef(null);
  const stateRef = useRef({ mode: 'vector', playing: true, month: 6, ready: false });
  const [mode, setMode] = useState('vector');
  const [playing, setPlaying] = useState(true);
  const [month, setMonth] = useState(6);
  const [status, setStatus] = useState('로딩 중…');

  useEffect(() => { stateRef.current.mode = mode; }, [mode]);
  useEffect(() => { stateRef.current.playing = playing; }, [playing]);
  useEffect(() => { stateRef.current.month = month; }, [month]);

  useEffect(() => {
    const mount = mountRef.current;
    let raf, renderer, controls, disposed = false;

    (async () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
      camera.position.set(0, 0.6, 4.4);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(w, h);
      mount.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 1.6;
      controls.maxDistance = 9;
      controls.enablePan = false;

      // 별 배경
      const starGeo = new THREE.BufferGeometry();
      const starN = 1400, sp = new Float32Array(starN * 3);
      for (let i = 0; i < starN; i++) {
        const r = 40 + Math.random() * 30;
        const th = Math.acos(2 * Math.random() - 1), ph = 2 * Math.PI * Math.random();
        sp[i*3] = r*Math.sin(th)*Math.cos(ph); sp[i*3+1] = r*Math.cos(th); sp[i*3+2] = r*Math.sin(th)*Math.sin(ph);
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x666a78, size: 0.12, sizeAttenuation: true })));

      // 데이터 로드 → 벡터 텍스처
      setStatus('지형 데이터 로딩…');
      const [world, oceans] = await Promise.all([
        fetch('/lab-data/world.json').then(r => r.json()),
        fetch('/lab-data/oceans.json').then(r => r.json()),
      ]);
      if (disposed) return;
      const vecDay = buildVectorTexture({ world, oceans, night: false });
      const vecNight = buildVectorTexture({ world, oceans, night: true });

      // 포토리얼 텍스처(CDN — 개발 뷰 한정; 라이브 시 번들 필요)
      setStatus('텍스처 로딩…');
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      const loadTex = (u) => new Promise((res) => loader.load(u, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
      const [phoDay, phoNight] = await Promise.all([
        loadTex('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'),
        loadTex('https://threejs.org/examples/textures/planets/earth_lights_2048.png'),
      ]);
      if (disposed) return;

      const uniforms = {
        dayTex: { value: vecDay },
        nightTex: { value: vecNight },
        sunDir: { value: new THREE.Vector3(1, 0, 0) },
        nightBoost: { value: 1.0 },
      };
      const globeMat = new THREE.ShaderMaterial({ vertexShader: dayNightVert, fragmentShader: dayNightFrag, uniforms });
      const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), globeMat);
      // equirectangular(경도0 중앙) → SphereGeometry seam(-X) 보정: 경도0을 정면(+Z)으로
      globe.rotation.y = -Math.PI / 2;
      scene.add(globe);

      // 대기광
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(1.02, 64, 64),
        new THREE.ShaderMaterial({ vertexShader: atmoVert, fragmentShader: atmoFrag,
          uniforms: { glow: { value: new THREE.Color(0x2b6cff) } },
          blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false })
      );
      scene.add(atmo);

      const applyMode = (m) => {
        if (m === 'photoreal' && phoDay) {
          uniforms.dayTex.value = phoDay;
          uniforms.nightTex.value = phoNight || phoDay;
          uniforms.nightBoost.value = 2.2;   // 도시불빛 강조
          atmo.material.uniforms.glow.value.set(0x2b6cff);
        } else {
          uniforms.dayTex.value = vecDay;
          uniforms.nightTex.value = vecNight;
          uniforms.nightBoost.value = 1.0;
          atmo.material.uniforms.glow.value.set(0xff8a1a);
        }
      };
      applyMode(stateRef.current.mode);
      let curMode = stateRef.current.mode;

      stateRef.current.ready = true;
      setStatus('');

      const onResize = () => {
        const W = mount.clientWidth, H = mount.clientHeight;
        camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
      };
      window.addEventListener('resize', onResize);

      const clock = new THREE.Clock();
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const dt = clock.getDelta();
        const st = stateRef.current;
        if (st.mode !== curMode) { curMode = st.mode; applyMode(curMode); }

        // 태양방향: 계절 적위로 +Y 기울임, 월드 고정. 메시(지구)가 자전하며 낮밤 통과.
        const decl = solarDeclDeg(st.month) * Math.PI / 180;
        uniforms.sunDir.value.set(Math.cos(decl), Math.sin(decl), 0).normalize();

        if (st.playing) globe.rotation.y += dt * 0.18;  // 자전 → 실제 낮밤 순환

        controls.update();
        renderer.render(scene, camera);
      };
      loop();

      GlobeLab._cleanup = () => {
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(raf);
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      };
    })();

    return () => { disposed = true; if (GlobeLab._cleanup) GlobeLab._cleanup(); };
  }, []);

  return (
    <div className="globelab">
      <div ref={mountRef} className="gl-canvas" />
      {status && <div className="gl-status">{status}</div>}

      <div className="gl-panel">
        <div className="gl-seg">
          <button className={mode==='vector'?'on':''} onClick={()=>setMode('vector')}>벡터 (온브랜드)</button>
          <button className={mode==='photoreal'?'on':''} onClick={()=>setMode('photoreal')}>포토리얼 (NASA)</button>
        </div>
        <div className="gl-row">
          <button className="gl-play" onClick={()=>setPlaying(p=>!p)}>{playing ? '❚❚ 자전 정지' : '▶ 자전'}</button>
          <div className="gl-month">
            <input type="range" min="1" max="12" value={month} onChange={e=>setMonth(+e.target.value)} />
            <span>{MONTHS[month-1]}</span>
          </div>
        </div>
        <p className="gl-hint">드래그로 회전 · 휠로 확대 · 낮/밤은 GPU 셰이더로 실시간 계산</p>
      </div>

      <div className="gl-footer">Designed by parcyun studio · @parcyun · <span>#3 최적화 개발자 뷰</span></div>

      <style>{`
        .globelab{position:fixed;inset:0;background:#000;color:#fff;font-family:'Pretendard',system-ui,sans-serif;overflow:hidden}
        .gl-canvas{position:absolute;inset:0}
        .gl-status{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:${AMBER};font-size:14px;letter-spacing:.04em}
        .gl-panel{position:absolute;left:50%;bottom:64px;transform:translateX(-50%);display:flex;flex-direction:column;gap:12px;align-items:center;padding:16px 20px;background:rgba(10,10,12,.62);border:1px solid rgba(255,177,26,.22);border-radius:16px;backdrop-filter:blur(10px);max-width:92vw}
        .gl-seg{display:flex;gap:6px}
        .gl-seg button{padding:8px 16px;border:1px solid rgba(255,177,26,.3);background:transparent;color:#cdd0d6;border-radius:999px;font-size:13px;cursor:pointer;transition:.15s}
        .gl-seg button.on{background:${AMBER};color:#000;border-color:${AMBER};font-weight:700}
        .gl-row{display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center}
        .gl-play{padding:8px 16px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;border-radius:999px;font-size:13px;cursor:pointer;min-width:104px}
        .gl-month{display:flex;align-items:center;gap:10px}
        .gl-month input{width:180px;accent-color:${AMBER}}
        .gl-month span{font-variant-numeric:tabular-nums;color:${AMBER};font-size:13px;min-width:34px}
        .gl-hint{margin:0;font-size:11.5px;color:#8a8e98;letter-spacing:.02em}
        .gl-footer{position:absolute;left:0;right:0;bottom:18px;text-align:center;font-size:11px;color:#6a6e78;font-family:'Montserrat',sans-serif;letter-spacing:.06em}
        .gl-footer span{color:${AMBER}}
        @media(max-width:640px){.gl-month input{width:120px}.gl-panel{bottom:56px;padding:12px 14px}}
      `}</style>
    </div>
  );
}
