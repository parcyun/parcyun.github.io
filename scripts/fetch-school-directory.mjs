/** Public NEIS Sheet export; regional requests avoid the 10,000-row national cap. */
import fs from 'node:fs/promises';
const output=process.argv[2];if(!output)throw Error('Usage: node scripts/fetch-school-directory.mjs <output.json>');
const regions=['B10','C10','D10','E10','F10','G10','H10','I10','J10','K10','M10','N10','P10','Q10','R10','S10','T10'];
const rows=[];
for(const region of regions){const body=new URLSearchParams({rows:'10000',infId:'OPEN17020190531110010104913',infSeq:'1',downloadType:'',ATPT_OFCDC_SC_CODE:region,SCHUL_NM:'',SCHUL_KND_SC_NM:'',LCTN_SC_NM:'',FOND_SC_NM:'',orderby:''});const response=await fetch('https://open.neis.go.kr/portal/data/sheet/searchSheetData.do?page=1',{method:'POST',body,signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`NEIS ${region}: ${response.status}`);const data=await response.json();if(!Array.isArray(data.data)||data.data.length>=10000)throw Error(`Incomplete region ${region}`);rows.push(...data.data);console.log(region,data.data.length);}
const unique=[...new Map(rows.filter(r=>r.SD_SCHUL_CODE?.trim()).map(r=>[r.ATPT_OFCDC_SC_CODE+':'+r.SD_SCHUL_CODE.trim(),r])).values()];await fs.writeFile(output,JSON.stringify(unique));console.log('schools',unique.length);
