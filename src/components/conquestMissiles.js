export const randomEarthPoint=(random=Math.random)=>[random()*360-180,Math.asin(random()*2-1)*180/Math.PI];
export function missileRoute(isLandAt,random=Math.random){
 const a=randomEarthPoint(random),land=random()<.75;
 // Rejection sampling preserves the requested land/sea destination category.
 for(let i=0;i<4096;i++){const b=randomEarthPoint(random);if(isLandAt(b)===land)return {a,b,land};}
 return null;
}
export function trailColor(head,tail,fraction){return head.split(',').map((n,i)=>Math.round(Number(n)*(1-fraction)+Number(tail.split(',')[i])*fraction)).join(',');}
