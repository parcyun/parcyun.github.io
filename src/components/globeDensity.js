export const DENSITY_TEXTURE_URL='/lab-data/geoweb-population-density-regions.png';
// Display classes for the WorldPop 2020 regional grid, in people/km².
export const DENSITY_CLASSES=[
 {max:1,label:'0–1 미만',en:'Under 1',color:'#fff5f0'},
 {max:10,label:'1–10 미만',en:'1–<10',color:'#fdd0c1'},
 {max:100,label:'10–100 미만',en:'10–<100',color:'#fca082'},
 {max:1000,label:'100–1,000 미만',en:'100–<1,000',color:'#ef5a43'},
 {max:Infinity,label:'1,000 이상',en:'1,000 or more',color:'#b7192b'},
];
export const DENSITY_MISSING_COLOR='#efefeb';
export function densityClass(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0?DENSITY_CLASSES.findIndex(item=>value<item.max):-1;}
