// 지구본 lab GLSL 셰이더 모음 — GlobeLab.jsx에서 분리(파일 경량화). 순수 문자열, THREE 의존 없음.
export const GLSL=`const float PI=3.141592653589793; const float MS=0.6366197723675814; const float STE=1.0;
float wrapLon(float x){ return x-2.0*PI*floor(x/(2.0*PI)); } // [0,2π) 안전 래핑(seam 상대좌표·straddle 판정 공용)
vec3 project(vec2 uv, vec3 sphere, float morph, float lens, float rotY, float rotX, float lon0, float lat0, float lonC, float offX){
  float lon=(uv.x-0.5)*2.0*PI; float lat=(uv.y-0.5)*PI; float latC=clamp(lat,-1.4661,1.4661);
  float lonRel=wrapLon(lon-lonC+PI)-PI;                                    // (-π,π], seam=lonC+π(시선 대척점) — 메르카토 이음새가 뷰 중심을 따라다님
  vec3 pl=vec3((lonC+lonRel)*MS+offX, log(tan(PI/4.0+latC/2.0))*MS, 0.0);
  // 렌즈 = stereographic(방위·등각 도법, 원본 HTML과 동일): 중앙 실제비율·형태보존, 가장자리로 갈수록 확대. lon0,lat0=시선중심(rad)
  float slon=lon-lon0, sl0=sin(lat0), cl0=cos(lat0);
  float cosc=sl0*sin(lat)+cl0*cos(lat)*cos(slon);
  // 대척점 근접 시 ks가 무제한 발산 → 방향(방위각)은 정확히 보존한 채 거리만 항상 화면 밖인 값(30)으로 클램프.
  float ks=min(STE*2.0/(1.0+max(cosc,-0.985)),30.0);
  vec3 st=vec3(ks*cos(lat)*sin(slon), ks*(cl0*sin(lat)-sl0*cos(lat)*cos(slon)), 0.0);
  // 구 회전: Y(경도) 후 X(위도 틸트)
  float cy=cos(rotY), sy=sin(rotY); vec3 s1=vec3(sphere.x*cy+sphere.z*sy, sphere.y, -sphere.x*sy+sphere.z*cy);
  float cx=cos(rotX), sx=sin(rotX); vec3 sph=vec3(s1.x, s1.y*cx-s1.z*sx, s1.y*sx+s1.z*cx);
  return sph*(1.0-morph-lens)+pl*morph+st*lens;
}`;
export const STRADDLE=`bool straddle3(vec3 tl,float lonC){ float w0=wrapLon(tl.x-lonC+PI),w1=wrapLon(tl.y-lonC+PI),w2=wrapLon(tl.z-lonC+PI);
  return max(w0,max(w1,w2))-min(w0,min(w1,w2))>PI; }`;
export const LENSCLIP=`bool lensTriBad(vec3 tlon,vec3 tlat,float lon0,float lat0){
  float c0=sin(lat0)*sin(tlat.x)+cos(lat0)*cos(tlat.x)*cos(tlon.x-lon0);
  float c1=sin(lat0)*sin(tlat.y)+cos(lat0)*cos(tlat.y)*cos(tlon.y-lon0);
  float c2=sin(lat0)*sin(tlat.z)+cos(lat0)*cos(tlat.z)*cos(tlon.z-lon0);
  return min(c0,min(c1,c2))<-0.995; }`;
export const meshVert=GLSL+STRADDLE+LENSCLIP+`attribute vec3 aTriLon; attribute vec3 aTriLat; uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC; varying vec2 vUv;
void main(){ vUv=uv; if(morph>0.001&&straddle3(aTriLon,uLonC)){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  if(lens>0.001&&lensTriBad(aTriLon,aTriLat,uLon0,uLat0)){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  vec3 p=project(uv,position,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,0.0); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);} `;
export const cloneVert=GLSL+STRADDLE+LENSCLIP+`attribute vec3 aTriLon; attribute vec3 aTriLat; uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX; varying vec2 vUv;
void main(){ vUv=uv; if(morph>0.001&&straddle3(aTriLon,uLonC)){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  if(lens>0.001&&lensTriBad(aTriLon,aTriLat,uLon0,uLat0)){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  vec3 p=project(uv,position,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);} `;
export const OCEANGRAD=`vec3 oceanGrad(vec2 fc, vec2 res){ vec2 sc=fc/res; float d=clamp(length((sc-vec2(0.5,0.58))/1.5),0.0,1.0);
  vec3 g0=vec3(10.0,19.0,34.0)/255.0,g1=vec3(6.0,11.0,22.0)/255.0,g2=vec3(4.0,6.0,11.0)/255.0;
  return d<0.55?mix(g0,g1,d/0.55):mix(g1,g2,(d-0.55)/0.45);} `;
export const meshFrag=OCEANGRAD+`uniform sampler2D dayTex,nightTex,overlayTex,satTex; uniform float sunLon,sunLat,nightBoost,dayNightOn,lens,uLon0,uLat0,uSat; uniform vec2 uScreen; varying vec2 vUv;
void main(){ float lon=(vUv.x-0.5)*360.0, lat=(vUv.y-0.5)*180.0;
  if(lens>0.5){ float cc=sin(uLat0)*sin(radians(lat))+cos(uLat0)*cos(radians(lat))*cos(radians(lon)-uLon0); if(cc<-0.985) discard; } // stereographic: 대척점 근방만 미렌더
  float rl=radians(lat),ro=radians(lon),sa=radians(sunLat),so=radians(sunLon);
  float cz=sin(rl)*sin(sa)+cos(rl)*cos(sa)*cos(ro-so); float t=mix(1.0,smoothstep(-0.10,0.12,cz),dayNightOn);
  vec4 dc=texture2D(dayTex,vUv),nc=texture2D(nightTex,vUv);
  vec3 land=mix(nc.rgb*nightBoost, dc.rgb, t);
  vec3 ocean=oceanGrad(gl_FragCoord.xy,uScreen)*mix(0.32,1.0,t);          // 바다=원본 그라디언트(밤엔 어둡게)
  vec3 base=mix(ocean, land, dc.a);                                       // dc.a: 육지 1 / 바다 0
  if(uSat>0.5){ vec3 sc=texture2D(satTex,vUv).rgb; base=mix(base, mix(sc*0.32, sc, t), uSat); } // 위성: 표면 전체를 실사 위성사진으로(밤엔 어둡게), uSat로 크로스페이드
  vec4 ov=texture2D(overlayTex,vUv);
  gl_FragColor=vec4(mix(base,ov.rgb,ov.a),1.0);} `;
export const cloneFrag=OCEANGRAD+`uniform sampler2D dayTex,nightTex,overlayTex,satTex; uniform float sunLon,sunLat,nightBoost,dayNightOn,uCloneAmt,uSat; uniform vec2 uScreen; varying vec2 vUv;
void main(){ float rl=radians((vUv.y-0.5)*180.0),ro=radians((vUv.x-0.5)*360.0),sa=radians(sunLat),so=radians(sunLon);
  float cz=sin(rl)*sin(sa)+cos(rl)*cos(sa)*cos(ro-so); float t=mix(1.0,smoothstep(-0.10,0.12,cz),dayNightOn);
  vec4 dc=texture2D(dayTex,vUv),nc=texture2D(nightTex,vUv);
  vec3 land=mix(nc.rgb*nightBoost, dc.rgb, t); vec3 ocean=oceanGrad(gl_FragCoord.xy,uScreen)*mix(0.32,1.0,t);
  vec3 base=mix(ocean, land, dc.a);
  if(uSat>0.5){ vec3 sc=texture2D(satTex,vUv).rgb; base=mix(base, mix(sc*0.32, sc, t), uSat); }
  vec4 ov=texture2D(overlayTex,vUv);
  gl_FragColor=vec4(mix(base,ov.rgb,ov.a), clamp(uCloneAmt,0.0,1.0));} `;
export const lineVert=GLSL+`attribute vec2 aGeo; attribute vec2 aGeoB; uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX; varying float vCosc,vFrontZ,vSphereW;
void main(){ // seam 걸친 세그먼트 붕괴(국경 LineSegments용 — 짝 끝점 aGeoB와 비교; 라인스트립은 aGeoB=aGeo라 절대 미발동)
  if(morph>0.001){ float wa=wrapLon(radians(aGeo.x)-uLonC+PI),wb=wrapLon(radians(aGeoB.x)-uLonC+PI); if(abs(wa-wb)>PI){gl_Position=vec4(2.0,2.0,2.0,1.0);return;} }
  vec2 uv=vec2((aGeo.x+180.0)/360.0,(aGeo.y+90.0)/180.0); vec3 nn=normalize(vec3(-cos(uv.x*2.0*PI)*sin((1.0-uv.y)*PI),cos((1.0-uv.y)*PI),sin(uv.x*2.0*PI)*sin((1.0-uv.y)*PI)));
  float glon=(uv.x-0.5)*2.0*PI, glat=(uv.y-0.5)*PI; vCosc=sin(uLat0)*sin(glat)+cos(uLat0)*cos(glat)*cos(glon-uLon0); // 렌즈 대척점 클립용
  vec3 p=project(uv,nn*1.003,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX);
  vFrontZ=dot(normalize(p),normalize(cameraPosition-p)); vSphereW=1.0-morph-lens;
  p.z+=0.006; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);} `;
export const lineFrag=`uniform vec3 uColor; uniform float uOp,lens; varying float vCosc,vFrontZ,vSphereW;
void main(){ if(vSphereW>0.5&&vFrontZ<-0.02) discard; if(lens>0.5&&vCosc<-0.72) discard; gl_FragColor=vec4(uColor,uOp);} `;
export const fatLineVert=GLSL+`attribute vec2 aGeoA,aGeoB; attribute float aEnd,aSide;
uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX,uPx; uniform vec2 uRes; varying float vCosc,vFrontZ,vSphereW;
vec3 uSph(vec2 g){vec2 uv=vec2((g.x+180.0)/360.0,(g.y+90.0)/180.0);return normalize(vec3(-cos(uv.x*2.0*PI)*sin((1.0-uv.y)*PI),cos((1.0-uv.y)*PI),sin(uv.x*2.0*PI)*sin((1.0-uv.y)*PI)));}
vec3 posOf(vec2 g){vec2 uv=vec2((g.x+180.0)/360.0,(g.y+90.0)/180.0);return project(uv,uSph(g)*1.003,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX);}
float frontZOf(vec2 g){vec3 p=posOf(g);return dot(normalize(p),normalize(cameraPosition-p));}
vec4 clipOf(vec2 g){vec3 p=posOf(g);p.z+=0.009;return projectionMatrix*modelViewMatrix*vec4(p,1.0);}
void main(){ // seam 걸친 세그먼트 붕괴(양 끝점 모두 정점에 있음 → 결정적)
  if(morph>0.001){ float wa=wrapLon(radians(aGeoA.x)-uLonC+PI),wb=wrapLon(radians(aGeoB.x)-uLonC+PI); if(abs(wa-wb)>PI){gl_Position=vec4(2.0,2.0,2.0,1.0);return;} }
  if(1.0-morph-lens>0.5){ bool visA=frontZOf(aGeoA)>-0.02, visB=frontZOf(aGeoB)>-0.02; if(visA!=visB){gl_Position=vec4(2.0,2.0,2.0,1.0);return;} }
  vec4 cA=clipOf(aGeoA),cB=clipOf(aGeoB); vec4 cT=(aEnd<0.5)?cA:cB;
  vec2 sA=cA.xy/cA.w,sB=cB.xy/cB.w; vec2 diff=(sB-sA)*uRes; float dl=length(diff);
  vec2 dir=dl>1e-4?diff/dl:vec2(1.0,0.0); vec2 perp=vec2(-dir.y,dir.x);
  cT.xy+=perp*(2.0*uPx)/uRes*aSide*cT.w;
  vec2 g=(aEnd<0.5)?aGeoA:aGeoB; float glon=g.x*PI/180.0,glat=g.y*PI/180.0;
  vCosc=sin(uLat0)*sin(glat)+cos(uLat0)*cos(glat)*cos(glon-uLon0);
  vFrontZ=frontZOf(g); vSphereW=1.0-morph-lens;
  gl_Position=cT;}`;
export const fatLineFrag=`uniform vec3 uColor; uniform float uOp,lens; varying float vCosc,vFrontZ,vSphereW;
void main(){ if(vSphereW>0.5&&vFrontZ<-0.02) discard; if(lens>0.5&&vCosc<-0.72) discard; gl_FragColor=vec4(uColor,uOp);}`;
export const fillVert=GLSL+STRADDLE+LENSCLIP+`attribute vec2 aGeo; attribute vec3 aColor; attribute vec3 aTriLon; attribute vec3 aTriLat; uniform float morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX;
varying vec2 vUv; varying vec3 vCol; varying float vCosc,vFrontZ,vSphereW;
void main(){ vUv=vec2((aGeo.x+180.0)/360.0,(aGeo.y+90.0)/180.0); vCol=aColor;
  if(morph>0.001&&straddle3(aTriLon,uLonC)){gl_Position=vec4(2.0,2.0,2.0,1.0);return;} // seam 걸친 삼각형 붕괴(빠진 곳은 아래 텍스처 메쉬가 동일색 폴백)
  if(lens>0.001&&lensTriBad(aTriLon,aTriLat,uLon0,uLat0)){gl_Position=vec4(2.0,2.0,2.0,1.0);return;} // 렌즈 대척점 근처 삼각형 사전 붕괴(#4)
  vec3 nn=normalize(vec3(-cos(vUv.x*2.0*PI)*sin((1.0-vUv.y)*PI),cos((1.0-vUv.y)*PI),sin(vUv.x*2.0*PI)*sin((1.0-vUv.y)*PI)));
  float glon=(vUv.x-0.5)*2.0*PI,glat=(vUv.y-0.5)*PI; vCosc=sin(uLat0)*sin(glat)+cos(uLat0)*cos(glat)*cos(glon-uLon0);
  vec3 p=project(vUv,nn,morph,lens,uRotY,uRotX,uLon0,uLat0,uLonC,uOffsetX);
  vFrontZ=dot(normalize(p),normalize(cameraPosition-p)); vSphereW=1.0-morph-lens; // 실제 카메라 위치 기준(lineVert와 동일 이유)
  p.z+=0.0025;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
export const fillFrag=`uniform sampler2D overlayTex; uniform float sunLon,sunLat,dayNightOn,lens; varying vec2 vUv; varying vec3 vCol; varying float vCosc,vFrontZ,vSphereW;
void main(){ if(vSphereW>0.5&&vFrontZ<-0.02) discard; if(lens>0.5&&vCosc<-0.985) discard;
  float lat=(vUv.y-0.5)*180.0,lon=(vUv.x-0.5)*360.0;
  float rl=radians(lat),ro=radians(lon),sa=radians(sunLat),so=radians(sunLon);
  float cz=sin(rl)*sin(sa)+cos(rl)*cos(sa)*cos(ro-so); float t=mix(1.0,smoothstep(-0.10,0.12,cz),dayNightOn);
  vec3 base=mix(vCol*0.4,vCol,t); vec4 ov=texture2D(overlayTex,vUv);
  gl_FragColor=vec4(mix(base,ov.rgb,ov.a),1.0);}`;
