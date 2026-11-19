export const POPULATION_CARTOGRAM_URL='/lab-data/geoweb-population-cartogram.json?v=2';
export function populationPoint(point,amount=1){return [point[0]+((point[2]??point[0])-point[0])*amount,point[1]+((point[3]??point[1])-point[1])*amount];}
export function populationFeature(feature,amount=1){const ring=r=>r.map(p=>populationPoint(p,amount)),geometry=feature.geometry;return {...feature,geometry:{...geometry,coordinates:geometry.type==='Polygon'?geometry.coordinates.map(ring):geometry.coordinates.map(poly=>poly.map(ring))}};}
export function densifyPopulation(points,maxStep=2){const out=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/maxStep));for(let j=1;j<=n;j++)out.push(a.map((value,k)=>value+(b[k]-value)*j/n));}return out;}
export const populationVertexKey=(x,y)=>`${Math.fround(x)},${Math.fround(y)}`;
// Hit the same animated lon/lat outline that is rendered, independent of ring winding.
// Spherical geoContains can invert highly distorted rings and select a remote country.
export function populationContains(feature,[x,y],amount=1){
  const inside=ring=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [ax,ay]=populationPoint(ring[i],amount),[bx,by]=populationPoint(ring[j],amount);
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)hit=!hit;
  }return hit;};
  const polys=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  return polys.some(poly=>{const lons=poly[0].map(p=>p[0]);if(Math.max(...lons)-Math.min(...lons)>180)return false;return inside(poly[0])&&!poly.slice(1).some(inside);});
}
