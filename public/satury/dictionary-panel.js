const panel=document.querySelector('#stdict-panel');
const list=document.querySelector('#stdict-list');
const sheet=document.querySelector('#stdict-detail');
const body=document.querySelector('#stdict-detail-body');
const closeButton=document.querySelector('#stdict-close');
let searchNumber=0,detailNumber=0,searchRequest,detailRequest,returnFocus,closingAnimation;
const detailHistory=[];let currentDetail;const backButton=document.createElement('button');backButton.type='button';backButton.className='stdict-back';backButton.textContent='↶';backButton.setAttribute('aria-label','이전 단어로 돌아가기');backButton.hidden=true;sheet.append(backButton);
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let resizeFrame;
function fitPanel(){
 if(resizeFrame)return;
 resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;if(!panel.hidden)panel.style.setProperty('--stdict-offset',Math.max(16,panel.getBoundingClientRect().top)+'px');});
}
window.addEventListener('scroll',fitPanel,{passive:true});window.addEventListener('resize',fitPanel);
window.visualViewport?.addEventListener('resize',fitPanel);
const mobileLayout=matchMedia('(max-width:850px)');
const toggle=document.querySelector('#stdict-toggle');
panel.dataset.collapsed='true';
toggle.addEventListener('click',()=>{
 const collapsed=panel.dataset.collapsed!=='true';
 panel.dataset.collapsed=String(collapsed);
 toggle.setAttribute('aria-expanded',String(!collapsed));
 if(collapsed)closeDetail(false,false);
 fitPanel();
});
function positionPanel(){
 const focused=panel.contains(document.activeElement)?document.activeElement:null;
 if(mobileLayout.matches)document.querySelector('.satury-main-column form').after(panel);
 else document.querySelector('main').append(panel);
 if(focused)focused.focus({preventScroll:true});
 fitPanel();
}
mobileLayout.addEventListener('change',positionPanel);
positionPanel();
function alignMobileDetail(){
 if(sheet.hidden||!matchMedia('(max-width:850px)').matches)return;
 // Reserve the final height before scrolling; otherwise a short panel at the
 // document end cannot reach the top of a mobile viewport.
 panel.style.setProperty('--stdict-offset','16px');
 panel.getBoundingClientRect();
 panel.scrollIntoView({block:'start',behavior:'instant'});
 fitPanel();
}
window.addEventListener('satury-results-ready',()=>{alignMobileDetail();fitPanel();});
function add(parent,tag,text,className){const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;parent.append(e);return e;}
function loading(parent,text){parent.replaceChildren();add(parent,'p',text,'stdict-message stdict-loading');parent.setAttribute('aria-busy','true');}
function closeDetail(restore=true,animate=true){
 detailNumber++;detailRequest?.abort();closingAnimation?.cancel();
 const done=()=>{sheet.hidden=true;list.inert=false;if(restore&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});};
 if(!sheet.hidden&&animate&&!reduced.matches){closingAnimation=sheet.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(100%)',opacity:0}],{duration:160,easing:'ease-in'});closingAnimation.onfinish=done;}
 else done();
}
closeButton.addEventListener('click',()=>closeDetail());
panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&!sheet.hidden){event.preventDefault();event.stopPropagation();closeDetail();}});
const apiBase=location.hostname==='127.0.0.1'?'':'https://satury-dictionary-api-1093702239224.asia-northeast3.run.app';
async function read(url,signal){const res=await fetch(apiBase+url,{signal});const data=await res.json();if(!res.ok)throw Error(data.message||'사전을 불러오지 못했어요. 잠시 후 다시 검색해 주세요.');return data;}
function officialLink(parent,code){const a=add(parent,'a','국립국어원 원문 보기 ↗');a.href='https://stdict.korean.go.kr/search/searchView.do?word_no='+encodeURIComponent(code)+'&searchKeywordTo=3';a.target='_blank';a.rel='noopener';}
async function openDetail(item,button,navigate=false){
 if(navigate&&currentDetail)detailHistory.push({item:currentDetail,html:body.innerHTML,scroll:body.scrollTop});else if(!navigate)detailHistory.length=0;
 currentDetail=item;backButton.hidden=!detailHistory.length;
 if(navigate&&!reduced.matches)await body.animate([{transform:"translateX(0)",opacity:1},{transform:"translateX(-40px)",opacity:0}],{duration:160,easing:"ease-in"}).finished;
 closeDetail(false,false);returnFocus=button;const number=++detailNumber;
 detailRequest=new AbortController();sheet.hidden=false;list.inert=true;
 alignMobileDetail();
 loading(body,'단어 정보를 불러오고 있어요…');closeButton.focus({preventScroll:true});
 try{
  const data=await read('/api/stdict/detail?v=2&code='+encodeURIComponent(item.code),detailRequest.signal);
  if(number!==detailNumber)return;
  body.replaceChildren();body.scrollTop=0;
  add(body,'h3',data.word);
  if(data.pronunciation.length)add(body,'p','발음 · '+data.pronunciation.join(', '),'stdict-pos');
  if(data.origins?.length){for(const origin of data.origins)add(body,'p',(origin.language||'원어')+' · '+origin.text,'stdict-origin');}
  else if(data.origin)add(body,'p','원어 · '+data.origin,'stdict-origin');
  for(const group of data.groups){
   if(group.pos)add(body,'h4',group.pos);
   const ol=add(body,'ol','');
   for(const sense of group.senses){const li=add(ol,'li','');renderDefinition(li,sense);for(const example of sense.examples)add(li,'p',example,'stdict-example');}
  }
  officialLink(body,item.code);
 }catch(error){if(number!==detailNumber)return;body.replaceChildren();add(body,'h3',item.word);add(body,'p',error.message,'stdict-message');officialLink(body,item.code);}
 finally{if(number===detailNumber){body.removeAttribute('aria-busy');if(navigate&&!reduced.matches)body.animate([{transform:"translateX(40px)",opacity:0},{transform:"none",opacity:1}],{duration:220,easing:"ease-out"});}}
}
window.addEventListener('satury-search',async event=>{
 const q=event.detail.query,number=++searchNumber;
 searchRequest?.abort();searchRequest=new AbortController();closeDetail(false,false);panel.hidden=false;fitPanel();
 loading(list,'표준어의 뜻을 찾고 있어요…');
 try{
  const data=await read('/api/stdict/search?v=2&q='+encodeURIComponent(q),searchRequest.signal);
  if(number!==searchNumber)return;
  list.replaceChildren();list.scrollTop=0;
  add(list,'p',`‘${q}’ · ${data.total}개 표제어`,'stdict-message');
  if(!data.items.length)add(list,'p','표준국어대사전에서 일치하는 표제어를 찾지 못했어요. 지역어 검색 결과는 왼쪽에서 확인할 수 있어요.','stdict-message');
  for(const item of data.items){
   const button=add(list,'button','','stdict-entry');button.type='button';button.setAttribute('aria-haspopup','dialog');
   const name=add(button,'span',item.word,'stdict-entry-word');if(Number(item.number))add(name,'sup',item.number);
   if(item.origin)add(button,'span',item.origin,'stdict-origin');
   add(button,'span',item.pos,'stdict-pos');add(button,'span',item.definition,'stdict-definition');
   button.addEventListener('click',()=>openDetail(item,button));
  }
  if(data.total>data.items.length)add(list,'p',`상위 ${data.items.length}개를 표시했어요. 전체 결과는 국립국어원 원문에서 확인할 수 있어요.`,'stdict-message');
 }catch(error){if(number!==searchNumber)return;list.replaceChildren();add(list,'p',error.message,'stdict-message');}
 finally{if(number===searchNumber)list.removeAttribute('aria-busy');}
});

function linkedWord(parent,word,code){const link=add(parent,'a',word+' ↗','stdict-word-link');link.href='https://stdict.korean.go.kr/search/searchView.do?word_no='+encodeURIComponent(code);link.dataset.word=word;link.dataset.code=code;return link;}
function renderDefinition(parent,sense){
 const links=(sense.links||[]).filter(l=>/^\d+$/.test(l.code));let text=sense.definition||'';
 const lexical=/<sense_no>(\d+)<\/sense_no>([^<]*?)(?:_|(?=[.,。]|$))/g;let matched,last=0,found=false;while((matched=lexical.exec(text))){found=true;parent.append(document.createTextNode(text.slice(last,matched.index)));linkedWord(parent,matched[2].trim(),matched[1]);last=lexical.lastIndex;}if(found){parent.append(document.createTextNode(text.slice(last)));return;}
 const template=document.createElement('template');template.innerHTML=text;
 if(template.content.querySelector('a')){for(const node of template.content.childNodes){if(node.nodeType===3)parent.append(document.createTextNode(node.textContent));else if(node.nodeName==='A'){const url=new URL(node.getAttribute('href')||'', 'https://stdict.korean.go.kr');const code=url.searchParams.get('word_no')||url.searchParams.get('target_code');if(/^\d+$/.test(code||''))linkedWord(parent,node.textContent,code);else parent.append(document.createTextNode(node.textContent));}else parent.append(document.createTextNode(node.textContent));}return;}
 for(const link of links){const word=link.word.replace(/[-^]/g,'').replace(/\d+$/,'');const index=text.indexOf(word);if(index<0)continue;parent.append(document.createTextNode(text.slice(0,index)));linkedWord(parent,word,link.code);text=text.slice(index+word.length);}
 parent.append(document.createTextNode(text));for(const link of links)if(!parent.querySelector('[data-code="'+link.code+'"]')){const line=add(parent,'p','');linkedWord(line,link.word,link.code);}
}
body.addEventListener('click',event=>{const link=event.target.closest('.stdict-word-link');if(!link)return;event.preventDefault();openDetail({word:link.dataset.word,code:link.dataset.code},returnFocus,true);});
backButton.onclick=()=>{const previous=detailHistory.pop();if(!previous)return;detailNumber++;detailRequest?.abort();currentDetail=previous.item;body.innerHTML=previous.html;body.scrollTop=previous.scroll;body.removeAttribute('aria-busy');backButton.hidden=!detailHistory.length;if(!reduced.matches)body.animate([{transform:'translateX(-40px)',opacity:0},{transform:'none',opacity:1}],{duration:220});};
