import * as THREE from 'three';
import { geoContains } from 'd3-geo';
import { COLS, ROWS, SIDE, MAP_Y, center, cellAt } from './conquestEngine.js';
import * as store from './conquestStore.js';
const HEX_GLSL=`
uniform sampler2D conquestCells,conquestLandMask,conquestCue;
uniform float conquestGame;
uniform vec2 conquestSelected;
vec3 conquestColor(vec3 base,vec2 uv,float land){
  float side=${SIDE.toFixed(12)}; float stepX=1.7320508075688772*side;
  vec2 xy=vec2(uv.x*6.283185307179586,log(tan(.7853981633974483+clamp((uv.y-.5)*3.141592653589793,-1.466076571675,1.466076571675)*.5))+${MAP_Y.toFixed(12)});
  float r0=floor(xy.y/(1.5*side)+.5);vec2 cell=vec2(0.0);vec2 local=vec2(0.0);float best=100.0;
  for(int k=-1;k<=1;k++){float r=clamp(r0+float(k),0.0,${(ROWS-1).toFixed(1)});float c=floor(xy.x/stepX-mod(r,2.0)*.5+.5);vec2 d=xy-vec2((c+mod(r,2.0)*.5)*stepX,r*1.5*side);if(dot(d,d)<best){best=dot(d,d);cell=vec2(mod(c+${COLS.toFixed(1)},${COLS.toFixed(1)}),r);local=d;}}
  vec2 cellXY=vec2((cell.x+mod(cell.y,2.0)*.5)*stepX,cell.y*1.5*side-${MAP_Y.toFixed(12)});
  vec2 cellUV=vec2(cellXY.x/6.283185307179586,(2.0*atan(exp(cellXY.y))-1.5707963267948966)/3.141592653589793+.5);
  land=step(.5,texture2D(conquestLandMask,cellUV).a);
  vec4 owner=texture2D(conquestCells,(cell+.5)/vec2(${COLS.toFixed(1)},${ROWS.toFixed(1)}));
  vec2 p=abs(local);float edge=max(p.x,dot(p,vec2(.5,.86602540378)))-.86602540378*side;
  float aa=max(fwidth(edge),.000001);float line=1.0-smoothstep(side*.045,side*.045+aa*1.25,-edge);
  float detail=1.0-smoothstep(side*.2,side*.8,aa);
  vec3 col=mix(vec3(.09,.15,.19),vec3(.49,.53,.43),land);
  col=mix(col,owner.rgb,owner.a*mix(.60,.92,land));
  col=mix(col,vec3(.035,.06,.065),line*detail*.95);
  if(distance(cell,conquestSelected)<.1)col=mix(col,vec3(1.0,.78,.36),mix(.25,.95,line));
  vec4 cue=texture2D(conquestCue,cellUV);if(conquestGame>.5)col=mix(col,cue.rgb,cue.a*.85);
  return col;
}`;
export function attachConquest({scene,world,mount,camera,project,S,U,landTexture,overlayUniform}) {
  const pixels=new Uint8Array(COLS*ROWS*4);
  const texture=new THREE.DataTexture(pixels,COLS,ROWS,THREE.RGBAFormat);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;
  const gameUniform={value:0};
  const chosen={value:new THREE.Vector2(-9,-9)};
  scene.traverse(o=>{const m=o.material;if(o.isLine||o.isLineSegments){o.visible=false;return;}
    if(m?.fragmentShader?.includes('varying vec3 vCol;')){o.visible=false;return;}
    if(!m?.isShaderMaterial||!m.fragmentShader.includes('varying vec2 vUv;'))return;
    if(!m.fragmentShader.includes('overlayTex'))return;
    m.uniforms.conquestGame=gameUniform;m.uniforms.conquestCue=overlayUniform;m.uniforms.conquestLandMask={value:landTexture};m.uniforms.conquestCells={value:texture};m.uniforms.conquestSelected=chosen;
    const land=m.fragmentShader.includes('vec4 dc=')?'dc.a':'1.0';
    m.fragmentShader=HEX_GLSL+m.fragmentShader.replace(/}\s*$/,`gl_FragColor.rgb=conquestColor(gl_FragColor.rgb,vUv,${land});}`);m.needsUpdate=true;
  });
  const isLand=id=>{const ll=center(id);return world.features.some(f=>geoContains(f,ll));};store.setLandCheck(isLand);
  const start=cellAt(127,37);store.selectCell(start);
  const canvas=document.createElement('canvas');canvas.className='conquest-effects';canvas.setAttribute('aria-hidden','true');mount.appendChild(canvas);const ctx=canvas.getContext('2d');
  let signature='';
  const update=()=>{
    const w=store.snapshot();if(!w)return;
    const id=store.selected();chosen.value.set(...(id?id.split(':').map(Number):[-9,-9]));
    const next=JSON.stringify([w.owners,w.waters,w.seaOwners,Object.values(w.nations).map(n=>[n.id,n.color])]);if(next===signature)return;signature=next;pixels.fill(0);
    const waterOwners=Object.fromEntries(Object.entries(w.waters||{}).map(([id,claims])=>[id,w.seaOwners?.[id]||claims[0]]));
    for(const [id,nation] of Object.entries({...waterOwners,...w.owners})){const n=w.nations[nation];if(!n)continue;const [c,r]=id.split(':').map(Number),i=(r*COLS+c)*4;const color=new THREE.Color(n.color);pixels[i]=Math.round(color.r*255);pixels[i+1]=Math.round(color.g*255);pixels[i+2]=Math.round(color.b*255);pixels[i+3]=(w.waters?.[id]?.length>1&&!w.seaOwners?.[id])?120:255;}texture.needsUpdate=true;
  };
  const unsubscribe=store.subscribe(update);update();
  const screen=(lon,lat,elevation=0)=>{
    const p=project(lon,lat);if(S.current.view==='globe'){
      const normal=p.clone().normalize();if(normal.dot(camera.position.clone().sub(p))<=.015)return null;
      p.multiplyScalar(1+elevation);
    }
    const v=p.project(camera);if(v.z>1||Math.abs(v.x)>1.3||Math.abs(v.y)>1.3)return null;
    return [(v.x*.5+.5)*mount.clientWidth,(-v.y*.5+.5)*mount.clientHeight];
  };
  const colors=['255,185,75','116,204,234','239,128,132','175,209,133','218,182,242','255,222,166'];
  const missiles=Array.from({length:72},(_,i)=>({offset:i/72,duration:8+Math.random()*8,a:[Math.random()*360-180,Math.random()*120-60],b:[Math.random()*360-180,Math.random()*120-60],color:colors[i%colors.length],tail:colors[(i+2)%colors.length]}));
  function flight(m,t){
    const vec=([lon,lat])=>new THREE.Vector3(Math.cos(lat*Math.PI/180)*Math.cos(lon*Math.PI/180),Math.sin(lat*Math.PI/180),Math.cos(lat*Math.PI/180)*Math.sin(lon*Math.PI/180));
    const a=vec(m.a),b=vec(m.b),angle=Math.acos(THREE.MathUtils.clamp(a.dot(b),-.9999,.9999));
    const v=a.multiplyScalar(Math.sin((1-t)*angle)).add(b.multiplyScalar(Math.sin(t*angle))).normalize();
    return screen(Math.atan2(v.z,v.x)*180/Math.PI,Math.asin(v.y)*180/Math.PI,Math.sin(t*Math.PI)*.18);
  }
  return {
    tick(time,reduced){
      if(canvas.width!==mount.clientWidth||canvas.height!==mount.clientHeight){canvas.width=mount.clientWidth;canvas.height=mount.clientHeight;}
      gameUniform.value=S.current.game&&S.current.gameMode&&S.current.gameMode!=='flag'?1:0;
      ctx.clearRect(0,0,canvas.width,canvas.height);const w=store.snapshot();if(!w)return;
      if(!S.current.game){
        for(const n of Object.values(w.nations)){if(!n.capital)continue;const p=screen(...center(n.capital));if(p){ctx.font='20px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#111910';ctx.strokeText('★',...p);ctx.fillStyle=n.color;ctx.fillText('★',...p);}}
        for(const v of w.voyages||[]){if(v.nation!==w.players[store.playerId()]?.nation)continue;ctx.strokeStyle='rgba(203,221,233,.7)';ctx.lineWidth=2;ctx.setLineDash([5,7]);
          for(let i=1;i<v.route.length;i++){const a=screen(...center(v.route[i-1])),b=screen(...center(v.route[i]));if(!a||!b||Math.abs(a[0]-b[0])>canvas.width*.5)continue;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}ctx.setLineDash([]);
          const fraction=Math.min(1,Math.max(0,(store.serverNow()-v.startedAt)/(v.arrivesAt-v.startedAt))),id=v.route[Math.min(v.route.length-1,Math.floor(fraction*(v.route.length-1)))],p=screen(...center(id));if(p){ctx.fillStyle='#e1eef5';ctx.beginPath();ctx.arc(...p,5,0,Math.PI*2);ctx.fill();}
        }
        const nation=w.players[store.playerId()]?.nation;
        for(const b of w.battles){if(b.status!=='active'||![b.attacker,b.defender].includes(nation))continue;const a=screen(...center(b.from)),z=screen(...center(b.cell));if(!a||!z)continue;
          ctx.strokeStyle=w.nations[b.attacker].color;ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...z);ctx.stroke();const angle=Math.atan2(z[1]-a[1],z[0]-a[0]);ctx.beginPath();ctx.moveTo(...z);ctx.lineTo(z[0]-12*Math.cos(angle-.45),z[1]-12*Math.sin(angle-.45));ctx.lineTo(z[0]-12*Math.cos(angle+.45),z[1]-12*Math.sin(angle+.45));ctx.closePath();ctx.fill();
        }
      }
      if(!S.current.game||S.current.view!=='globe'||reduced||document.hidden)return;
      for(const m of missiles){const t=(time/1000/m.duration+m.offset)%1;if(t>.92){const p=flight(m,1);if(p){ctx.fillStyle=`rgba(${m.color},${(1-t)/.08})`;ctx.beginPath();ctx.arc(...p,2+(t-.92)*50,0,Math.PI*2);ctx.fill();}continue;}
        const progress=t/.92;
        for(let i=16;i>0;i--){const p=flight(m,Math.max(0,progress-i*.004)),q=flight(m,Math.max(0,progress-(i-1)*.004));if(!p||!q)continue;ctx.strokeStyle=`rgba(${m.tail},${(1-i/17)*.8})`;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();}
        const p=flight(m,progress),q=flight(m,Math.max(0,progress-.004));if(p&&q){const angle=Math.atan2(p[1]-q[1],p[0]-q[0]);ctx.strokeStyle=`rgb(${m.color})`;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p[0]-Math.cos(angle)*7,p[1]-Math.sin(angle)*7);ctx.lineTo(...p);ctx.stroke();ctx.lineCap='butt';}
      }
    },
    dispose(){unsubscribe();texture.dispose();canvas.remove();store.setLandCheck(()=>false);}
  };
}
