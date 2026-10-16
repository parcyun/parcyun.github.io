// Adapted from the Masterclass Stargaze shader: layered twinkling stars and a drifting galaxy.
// GeoWeb uses its own near-black and amber palette.
export const STARDUST_FRAGMENT = `
precision highp float;
uniform vec2 uScreen;
uniform float uTime;
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 hash22(vec2 p){float n=hash21(p);return vec2(n,hash21(p+n+19.19));}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);}
float starLayer(vec2 uv,float scale,float layer,float speed){
  vec2 grid=uv*scale,id=floor(grid),cell=fract(grid)-.5;
  vec2 offset=(hash22(id+layer*17.31)-.5)*.72;
  float seed=pow(hash21(id+layer*43.7),5.5);
  float radius=mix(.014,.082,seed);
  float pulse=.5+.5*sin(uTime*mix(.72,2.85,hash21(id+layer*8.4))*speed+hash21(id+layer*91.3)*6.28318);
  float core=1.-smoothstep(radius*(.42+pulse*.72),radius*(1.25+pulse),length(cell-offset));
  float halo=exp(-length(cell-offset)*mix(48.,17.,seed))*seed*pulse;
  return (core*(.34+pulse*1.65+pow(seed,2.2)*pow(pulse,3.)*2.8)+halo*.52)*smoothstep(.14,.46,pulse);
}
void main(){
  vec2 uv=gl_FragCoord.xy/uScreen;
  vec2 p=vec2((uv.x-.5)*uScreen.x/uScreen.y,uv.y-.5);
  float drift=uTime*.038;
  float cloudA=noise(p*1.18+vec2(drift,-drift*.48));
  float cloudB=noise(p*1.92+vec2(-drift*.76,drift*.48)+7.4);
  float nebula=smoothstep(.20,.79,cloudA*.58+cloudB*.42);
  float band=exp(-pow((p.y+p.x*.17+.03+sin(p.x*2.+uTime*.05)*.025)*3.1,2.));
  vec2 su=p+vec2(drift*.20,-drift*.08);
  float stars=starLayer(su,22.,1.,1.)*.38+starLayer(su+3.7,34.,2.,.84)*.46+starLayer(su-8.1,49.,3.,1.14)*.32;
  vec3 color=vec3(.004,.006,.014)+vec3(.13,.075,.018)*nebula*.4+vec3(.18,.085,.012)*band*nebula*.18;
  color+=mix(vec3(1.,.75,.4),vec3(1.),smoothstep(.24,1.,stars))*stars*mix(.6,1.1,nebula)*mix(.72,1.2,band)*.95;
  color*=.55+smoothstep(1.05,.18,length(p*vec2(.82,1.)))*.72;
  gl_FragColor=vec4(color,1.);
}`;
