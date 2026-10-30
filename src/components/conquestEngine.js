// Equal-area cylindrical hex grid. A cell is ~100,000 / 128 km².
export const RULES = { target: 1000, battleMs: 3 * 86400_000, voteMs: 2 * 86400_000, voyageStepMs: 12 * 3600_000, approval: .7 };
export const CLASS_RULES={...RULES,battleMs:5*60_000,voteMs:60_000,voyageStepMs:10_000};
export const GLOBAL_ROOMS=[{key:'new-world',name:'뉴 월드',kind:'global'},{key:'continental',name:'컨티넨탈',kind:'global'}];
export const EARTH_RADIUS = 6371.0088;
const nominalSide = Math.sqrt((100_000 / 128) / (EARTH_RADIUS ** 2 * 3 * Math.sqrt(3) / 2)) / Math.cos(37*Math.PI/180);
export const COLS = Math.round(2 * Math.PI / (Math.sqrt(3) * nominalSide));
export const SIDE = 2 * Math.PI / (Math.sqrt(3) * COLS);
export const MAP_Y = Math.log(Math.tan(Math.PI/4 + 84*Math.PI/360));
export const ROWS = Math.ceil(2 * MAP_Y / (1.5 * SIDE)) + 1;
export const cellId = (c,r) => `${((c % COLS) + COLS) % COLS}:${r}`;
export function cellAt(lon, lat) {
  const x = (((lon + 180) % 360 + 360) % 360) * Math.PI / 180;
  const y = Math.log(Math.tan(Math.PI/4 + Math.max(-84,Math.min(84,lat))*Math.PI/360)) + MAP_Y;
  const approx = Math.round(y / (1.5 * SIDE));
  let best, distance = Infinity;
  for (let r = Math.max(0,approx-1); r <= Math.min(ROWS-1,approx+1); r++) {
    const c = Math.round(x / (Math.sqrt(3)*SIDE) - (r & 1)*.5);
    const d = (x-(c+(r&1)*.5)*Math.sqrt(3)*SIDE)**2 + (y-r*1.5*SIDE)**2;
    if (d < distance) { distance=d;best=cellId(c,r); }
  }
  return best;
}
export function center(id) {
  const [c,r] = id.split(':').map(Number);
  return [(c+(r&1)*.5)*Math.sqrt(3)*SIDE*180/Math.PI-180, (2*Math.atan(Math.exp(r*1.5*SIDE-MAP_Y))-Math.PI/2)*180/Math.PI];
}
export function neighbors(id) {
  const [c,r]=id.split(':').map(Number),o=r&1;
  return [[c-1,r],[c+1,r],[c-1+o,r-1],[c+o,r-1],[c-1+o,r+1],[c+o,r+1]].filter(([,y])=>y>=0&&y<ROWS).map(([x,y])=>cellId(x,y));
}
export function initialWorld(room=GLOBAL_ROOMS[0]) {
  const nations={amber:{id:'amber',name:'새벽 연방',flag:'☀',color:'#FFB11A',members:[]},forest:{id:'forest',name:'숲의 공화국',flag:'♧',color:'#51B894',members:[]},rose:{id:'rose',name:'노을 연합',flag:'✦',color:'#DB7B76',members:[]}};
  const owners={};
  for(const [id,ll] of [['amber',[127.8,36]],['forest',[12,48]],['rose',[-100,39]]]){
    const root=cellAt(...ll);owners[root]=id;for(const n of neighbors(root))owners[n]=id;
  }
  return {version:2,room,rules:room.kind==='class'?CLASS_RULES:RULES,nations,owners,players:{},battles:[],proposals:[],campaigns:[],voyages:[],waters:{},seaOwners:{}};
}
export const ownerOf=(w,id)=>w.owners[id]||w.seaOwners?.[id]||(w.waters?.[id]?.length===1?w.waters[id][0]:null)||null;
export function rebuildWaters(w,isLand){
  w.waters={};w.seaOwners??={};w.voyages??=[];
  for(const [id,nation] of Object.entries(w.owners))for(const n of neighbors(id))if(!isLand(n)){
    const claims=w.waters[n]||=[];if(!claims.includes(nation))claims.push(nation);
  }
  for(const id of Object.keys(w.seaOwners))if(!w.waters[id]?.includes(w.seaOwners[id]))delete w.seaOwners[id];
  for(const n of Object.values(w.nations))if(n.capital&&w.owners[n.capital]!==n.id)n.capital=null;
  return w;
}
export function attackOrigin(w,id,nation){
  return adjacentOwned(w,id,nation)||w.voyages?.find(v=>v.nation===nation&&v.status==='arrived'&&neighbors(v.to).includes(id))?.to;
}
export function hexDistance(a,b){
  const cube=id=>{const [c,r]=id.split(':').map(Number);return[c-(r-(r&1))/2,r];};const [aq,ar]=cube(a),[bq,br]=cube(b);
  return Math.min(...[-COLS,0,COLS].map(wrap=>{const q=aq-bq+wrap,r=ar-br;return (Math.abs(q)+Math.abs(r)+Math.abs(q+r))/2;}));
}
// A* across water; route length, adjacency and terrain are rechecked by the server.
export function seaRoute(w,nation,target,isLand,limit=60000){
  const ends=isLand(target)?neighbors(target).filter(n=>!isLand(n)):[target];
  if(!ends.length)throw Error('해안 블록 또는 바다를 선택하세요.');
  const starts=[...new Set(Object.keys(w.owners).filter(id=>w.owners[id]===nation).flatMap(neighbors).filter(id=>!isLand(id)))];
  for(const v of w.voyages||[])if(v.nation===nation&&v.status==='arrived')starts.push(v.to);
  if(!starts.length)throw Error('항해를 시작할 해안 영토가 없어요.');
  const endSet=new Set(ends),heap=[],cost=new Map(),previous=new Map();
  const heuristic=id=>Math.min(...ends.map(e=>hexDistance(id,e)));
  function push(item){heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=item.f)break;heap[i]=heap[p];i=p;}heap[i]=item;}
  function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;}
  const navigable=id=>!isLand(id)&&(!ownerOf(w,id)||ownerOf(w,id)===nation||endSet.has(id));
  for(const id of starts)if(navigable(id)){cost.set(id,0);push({id,g:0,f:heuristic(id)});}
  let visited=0;
  while(heap.length&&visited++<limit){const {id,g}=pop();if(g!==cost.get(id))continue;if(endSet.has(id)){const route=[id];while(previous.has(route[0]))route.unshift(previous.get(route[0]));return route;}
    for(const n of neighbors(id)){const next=g+1;if((cost.get(n)??Infinity)<=next||!navigable(n))continue;cost.set(n,next);previous.set(n,id);push({id:n,g:next,f:next+heuristic(n)});}
  }
  throw Error('이 해역으로 가는 항로를 찾지 못했어요. 가까운 중간 해역을 선택하세요.');
}
export const adjacentOwned=(w,id,nation)=>neighbors(id).find(n=>ownerOf(w,n)===nation);
export function nearestNationDistance(w,cell){return Object.keys(w.owners).reduce((distance,id)=>Math.min(distance,hexDistance(id,cell)),Infinity);}
export function battleTarget(w,nation){return (w.rules||RULES).target*(w.room?.kind==='class'?Math.max(1,Math.ceil((w.nations[nation]?.members.length||1)/2)):1);}
export function foundingTarget(w,cell){const distance=nearestNationDistance(w,cell);return Math.round(200+1800/(1+distance/3));}
export function rebellionTarget(w,nation){return 500+Object.values(w.owners).filter(n=>n===nation).length*100;}
export function settle(w,now=Date.now()) {
  w.campaigns??=[];
  for(const c of w.campaigns){
    if(c.status!=='active')continue;
    if(c.defense>=c.target||now>=c.endsAt)c.status='defended';
    else if(c.score>=c.target){
      if(w.players[c.player]||ownerOf(w,c.cell)!==c.defender){c.status='cancelled';continue;}
      const id=`nation-${c.id}`;w.nations[id]={id,name:c.name,flag:'⚑',color:c.color,members:[c.player]};w.owners[c.cell]=id;w.players[c.player]={nation:id};c.status='founded';
    }
  }
  for(const v of w.voyages||[])if(v.status==='sailing'&&now>=v.arrivesAt)v.status='arrived';
  for(const b of w.battles){
    if(b.status!=='active')continue;
    if(b.defense>=b.target)b.status='defended';
    else if(b.attack>=b.target){b.status='captured';if(b.sea){w.seaOwners??={};w.seaOwners[b.cell]=b.attacker;}else w.owners[b.cell]=b.attacker;}
    else if(now>=b.endsAt)b.status='defended';
  }
  for(const p of w.proposals){
    if(p.status!=='active'||now<p.endsAt)continue;
    if(p.kind==='capital'&&(w.owners[p.change.capital]!==p.nation||Object.values(w.owners).filter(n=>n===p.nation).length<7)){p.status='cancelled';continue;}
    p.status=p.electorate.length>0&&Object.values(p.votes).filter(Boolean).length/p.electorate.length>=(p.threshold??RULES.approval)?'approved':'rejected';
    if(p.status==='approved')Object.assign(w.nations[p.nation],p.change);
  }
  return w;
}
function requireNation(w,player){const p=w.players[player];if(!p||!w.nations[p.nation])throw Error('먼저 국가를 선택하세요.');return p.nation;}
export function applyAction(w,player,action,now=Date.now(),isLand=()=>true) {
  settle(w,now);rebuildWaters(w,isLand);
  if(action.type==='join'){
    if(w.players[player])throw Error('이미 국가에 참여하고 있어요.');
    if(!w.nations[action.nation])throw Error('국가를 찾을 수 없어요.');
    for(const c of w.campaigns||[])if(c.player===player&&c.status==='active')c.status='cancelled';
    w.players[player]={nation:action.nation};w.nations[action.nation].members.push(player);return rebuildWaters(w,isLand);
  }
  if(['found','rebel'].includes(action.type)){
    if(w.players[player])throw Error('국가를 이탈한 뒤 건국하거나 반란을 시작하세요.');
    if(!action.cell||!isLand(action.cell))throw Error('육지 블록을 선택하세요.');
    const defender=ownerOf(w,action.cell);
    if(action.type==='found'&&defender)throw Error('주인 없는 육지 블록을 선택하세요.');
    if(action.type==='rebel'&&!defender)throw Error('반란은 국가 내부 블록에서 시작하세요.');
    if(w.battles.some(b=>b.status==='active'&&b.cell===action.cell)||w.campaigns.some(c=>c.status==='active'&&(c.player===player||c.cell===action.cell)))throw Error('이미 진행 중인 건국·반란이 있어요.');
    const name=String(action.name||'').trim();if(!name||name.length>24)throw Error('국가 이름은 1~24자로 입력하세요.');
    const target=action.type==='rebel'?rebellionTarget(w,defender):foundingTarget(w,action.cell);
    w.campaigns.push({id:action.id||crypto.randomUUID(),player,cell:action.cell,defender,name,color:['#5F8DC2','#B8B56F','#D99962','#C286A8','#8CB9C9','#92916B','#C9735A','#77A6A2','#A58AB8','#CFAC6A','#7B9D69','#AC8790'].find(color=>!Object.values(w.nations).some(n=>n.color===color))||'#5F8DC2',kind:action.type,score:0,defense:0,target,endsAt:now+(w.rules||RULES).battleMs,status:'active',participants:[player],contributions:{}});return w;
  }
  const campaign=w.campaigns.find(c=>c.id===action.id&&c.status==='active');
  if(campaign&&action.type==='participate'){
    if(campaign.player!==player&&w.players[player]?.nation!==campaign.defender)throw Error('이 반란에 참여할 수 없어요.');
    if(!campaign.participants.includes(player))campaign.participants.push(player);return w;
  }
  if(campaign&&action.type==='contribute'){
    if(!Number.isFinite(action.points)||action.points<=0||action.points>10000||!campaign.participants.includes(player))throw Error('올바른 기여가 아니에요.');
    if(campaign.player===player&&!w.players[player])campaign.score+=Math.floor(action.points);
    else if(campaign.defender&&w.players[player]?.nation===campaign.defender)campaign.defense+=Math.floor(action.points);
    else throw Error('이 반란에 참여할 수 없어요.');
    campaign.contributions[player]=(campaign.contributions[player]||0)+Math.floor(action.points);return rebuildWaters(settle(w,now),isLand);
  }
  const nation=requireNation(w,player);
  if(action.type==='leave'){
    w.nations[nation].members=w.nations[nation].members.filter(id=>id!==player);delete w.players[player];for(const b of w.battles)if(b.status==='active')b.participants=b.participants.filter(id=>id!==player);return w;
  }else if(action.type==='plan'){
    const from=attackOrigin(w,action.cell,nation),sea=!isLand(action.cell),claims=w.waters[action.cell]||[];
    if(sea&&(!claims.includes(nation)||claims.length<2))throw Error('겹친 영해에서만 해상 공격 계획을 세울 수 있어요. 먼바다는 항해하세요.');
    if(!from||ownerOf(w,action.cell)===nation)throw Error('우리 영토와 맞닿은 다른 블록만 공격할 수 있어요.');
    if(w.battles.some(b=>b.cell===action.cell&&b.status==='active')||w.campaigns.some(c=>c.cell===action.cell&&c.status==='active'))throw Error('이미 진행 중인 전투예요.');
    w.battles.push({id:action.id,cell:action.cell,from,sea,attacker:nation,defender:ownerOf(w,action.cell)||claims.find(n=>n!==nation),attack:0,defense:0,target:battleTarget(w,nation),endsAt:now+(w.rules||RULES).battleMs,status:'active',participants:[player],contributions:{}});
  }else if(action.type==='voyage'){
    if((w.voyages||[]).some(v=>v.nation===nation&&v.status==='sailing'))throw Error('진행 중인 항해가 도착한 후 출항하세요.');
    const route=seaRoute(w,nation,action.cell,isLand);
    if(route.length<2)throw Error('이미 도달한 해역입니다. 인접 블록에 공격 계획을 세우세요.');
    w.voyages.push({id:action.id,nation,from:route[0],to:route.at(-1),target:action.cell,route,startedAt:now,arrivesAt:now+(route.length-1)*(w.rules||RULES).voyageStepMs,status:'sailing'});
  }else if(action.type==='participate'){
    const b=w.battles.find(b=>b.id===action.id&&b.status==='active');
    if(!b||![b.attacker,b.defender].includes(nation))throw Error('참여할 수 없는 전투예요.');
    if(!b.participants.includes(player))b.participants.push(player);
  }else if(action.type==='contribute'){
    const b=w.battles.find(b=>b.id===action.id&&b.status==='active');
    if(!b||!b.participants.includes(player)||![b.attacker,b.defender].includes(nation))throw Error('전투 참여 후 점수를 기여할 수 있어요.');
    if(!Number.isFinite(action.points)||action.points<=0||action.points>10000)throw Error('올바른 점수가 아니에요.');
    b[nation===b.attacker?'attack':'defense']+=Math.floor(action.points);b.contributions[player]=(b.contributions[player]||0)+Math.floor(action.points);
  }else if(action.type==='proposeCapital'){
    if(Object.values(w.owners).filter(n=>n===nation).length<7)throw Error('육지 영토를 7블록 이상 획득해야 수도를 선포할 수 있어요.');
    if(w.owners[action.cell]!==nation)throw Error('우리 국가의 육지 블록을 선택하세요.');
    if(w.nations[nation].capital===action.cell)throw Error('이미 수도로 선포한 블록이에요.');
    if(w.proposals.some(p=>p.nation===nation&&p.status==='active'))throw Error('진행 중인 제안이 끝난 뒤 수도 투표를 시작하세요.');
    w.proposals.push({id:action.id,nation,kind:'capital',threshold:.8,change:{capital:action.cell},electorate:[...w.nations[nation].members],votes:{[player]:true},endsAt:now+(w.rules||RULES).voteMs,status:'active'});
  }else if(action.type==='propose'){
    if(w.proposals.some(p=>p.nation===nation&&p.status==='active'))throw Error('진행 중인 제안이 끝난 뒤 새로 제안하세요.');
    const {name,flag,color}=action.change;
    if(!name?.trim()||name.trim().length>24||!flag?.trim()||[...flag].length>8||!/^#[\da-f]{6}$/i.test(color))throw Error('국가 이름·국기 기호·색상을 확인하세요.');
    w.proposals.push({id:action.id,nation,kind:'identity',threshold:.7,change:{name:name.trim(),flag:flag.trim(),color},electorate:[...w.nations[nation].members],votes:{[player]:true},endsAt:now+(w.rules||RULES).voteMs,status:'active'});
  }else if(action.type==='vote'){
    const p=w.proposals.find(p=>p.id===action.id&&p.status==='active');
    if(!p||p.nation!==nation||!p.electorate.includes(player))throw Error('투표 대상이 아니거나 투표가 끝났어요.');
    if(player in p.votes)throw Error('이미 투표했어요.');p.votes[player]=!!action.yes;
  }else throw Error('알 수 없는 요청이에요.');
  return rebuildWaters(settle(w,now),isLand);
}
