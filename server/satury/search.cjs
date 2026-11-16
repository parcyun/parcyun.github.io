const regions = '강원 경기 경남 경북 경상 전남 전라 전북 제주 충남 충북 충청 평남 평북 평안 함경 함남 함북 황해 중국길림성 중국요령성 중국흑룡강성 중앙아시아'.split(' ');

async function inRegion(word, region, key) {
  const words = new Set();
  for (let start = 1; start <= 1000; start += 100) {
    const params = new URLSearchParams({
      key, q: word, req_type: 'json', advanced: 'y',
      type3: 'dialect', target: '9', method: 'include', region: String(region),
      start: String(start), num: '100'
    });
    const response = await fetch('https://opendict.korean.go.kr/api/search?' + params, { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw Error('upstream');
    const data = await response.json();
    if (!data.channel || !Number.isFinite(Number(data.channel.total))) throw Error('api');
    for (const item of data.channel.item || []) {
      const senses = [].concat(item.sense || []);
      if (senses.some(s => s.definition.replace(/<[^>]*>/g,'').replace(/[‘’'”]/g,'').trim().startsWith(word + '의 방언'))) words.add(item.word);
    }
    if (start + 99 >= Number(data.channel.total)) break;
  }
  return [...words].sort((a,b)=>a.localeCompare(b,'ko'));
}
module.exports = async function(req,res) {
  const word = req.query.q;
  if (req.method !== 'GET' || typeof word !== 'string' || !/^[가-힣ㄱ-ㅎㅏ-ㅣ ]{1,40}$/u.test(word)) return res.status(400).json({message:'한글 표준어를 입력해 주세요.'});
  const key = process.env.URIMALSAEM_API_KEY;
  if (!key) return res.status(503).json({message:'우리말샘 인증키 등록 전입니다.'});
  try {
    const groups = {};
    for (let i=0;i<regions.length;i+=5) {
      const batch=regions.slice(i,i+5);
      const rows=await Promise.all(batch.map((_,j)=>inRegion(word,i+j+1,key)));
      batch.forEach((region,j)=>{if(rows[j].length) groups[region]=rows[j]});
    }
    res.setHeader('Cache-Control','public, s-maxage=86400');
    res.json({groups,url:'https://opendict.korean.go.kr/'});
  } catch {
    res.status(502).json({message:'우리말샘 응답을 확인할 수 없습니다.'});
  }
};
