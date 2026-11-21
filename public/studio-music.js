(() => {
  const host=document.querySelector('[data-studio-music]');
  if(!host||host.dataset.ready)return;
  host.dataset.ready='true';
  const tracks=[
    {title:'I love this Christmas city',src:'/audio/studio/i-love-this-christmas-city-v1.mp3'},
    {title:'Slow Side of Sunday',src:'/audio/studio/slow-side-of-sunday-v1.mp3'},
  ];
  const audio=host.querySelector('[data-music-audio]'),button=host.querySelector('[data-music-toggle]'),title=host.querySelector('[data-music-title]');
  const key='ps-studio-music-v1';
  let index=0,resumeTime=0,wantsPlay=true,action=0,fadeSerial=0,finishFade,autoplayBlocked=false;
  try{
    const saved=JSON.parse(sessionStorage.getItem(key)||'null');
    if(saved&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<tracks.length){
      index=saved.index;resumeTime=Number.isFinite(saved.time)&&saved.time>0?saved.time:0;wantsPlay=saved.playing===true;
    }
  }catch{}
  function save(){try{sessionStorage.setItem(key,JSON.stringify({index,time:audio.currentTime||resumeTime,playing:wantsPlay}));}catch{}}
  function render(){
    const playing=wantsPlay&&!audio.paused&&!audio.ended;
    host.dataset.playing=String(playing);
    button.setAttribute('aria-pressed',String(playing));
    button.setAttribute('aria-label',playing?'음악 일시정지':'음악 재생');
    title.textContent=tracks[index].title;title.title=tracks[index].title;
  }
  function fadeTo(target,duration=300){
    const serial=++fadeSerial;
    finishFade?.(false);
    return new Promise(resolve=>{
      finishFade=resolve;const start=performance.now(),from=audio.volume;
      function step(now){
        if(serial!==fadeSerial)return;
        const progress=Math.min(1,(now-start)/duration);
        audio.volume=from+(target-from)*progress;
        if(progress<1)requestAnimationFrame(step);
        else{finishFade=null;resolve(true);}
      }
      requestAnimationFrame(step);
    });
  }
  function load(){audio.src=tracks[index].src;render();}
  async function play(){
    const request=++action;wantsPlay=true;autoplayBlocked=false;
    if(!audio.getAttribute('src'))load();
    if(audio.paused)audio.volume=0;
    try{
      await audio.play();
      if(request!==action)return;
      button.removeAttribute('title');render();save();await fadeTo(1,1500);
    }catch(error){
      if(request!==action)return;
      autoplayBlocked=error.name==='NotAllowedError';
      button.title=autoplayBlocked?'화면을 클릭·터치하거나 키를 누르면 음악이 시작돼요.':'음악 재생 버튼을 다시 눌러 주세요.';
      render();save();
    }
  }
  function pause(){
    const request=++action;wantsPlay=false;autoplayBlocked=false;save();render();
    fadeTo(0).then(done=>{if(done&&request===action){audio.pause();save();render();}});
  }
  async function leave(url){
    const request=++action;autoplayBlocked=false;save();
    const done=await fadeTo(0);
    if(done&&request===action){audio.pause();location.assign(url);}
  }
  window.psStudioMusic={leave};
  function retryOnInput(event){
    if(!autoplayBlocked||!wantsPlay||!event.isTrusted)return;
    if(button.contains(event.target))return;
    if(event.type==='keydown'&&(event.repeat||event.ctrlKey||event.metaKey||event.altKey||['Tab','Escape','Shift','Control','Alt','Meta'].includes(event.key)))return;
    play();
  }
  document.addEventListener('click',retryOnInput);
  document.addEventListener('keydown',retryOnInput);
  button.addEventListener('click',()=>{
    button.removeAttribute('title');
    if(!wantsPlay||audio.paused)play();else pause();
  });
  audio.addEventListener('loadedmetadata',()=>{
    if(resumeTime&&Number.isFinite(audio.duration))audio.currentTime=Math.min(resumeTime,Math.max(0,audio.duration-.1));
    resumeTime=0;
  });
  audio.addEventListener('play',render);audio.addEventListener('pause',render);
  audio.addEventListener('error',()=>{
    action++;wantsPlay=false;button.title='음원을 불러오지 못했습니다. 다시 재생해 주세요.';
    audio.removeAttribute('src');save();render();
  });
  audio.addEventListener('ended',()=>{index=(index+1)%tracks.length;resumeTime=0;load();play();});
  let savedAt=0;
  audio.addEventListener('timeupdate',()=>{if(Math.abs(audio.currentTime-savedAt)>=5){savedAt=audio.currentTime;save();}});
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
    const url=new URL(link.href,location.href);
    if(!['http:','https:'].includes(url.protocol)||window.psPageLifecycle.eligible(url))return;
    event.preventDefault();leave(url.href);
  },true);
  document.addEventListener('astro:before-preparation',event=>{
    if(!window.psPageLifecycle.eligible(event.to)){event.preventDefault();leave(event.to.href);}
  });
  window.addEventListener('pagehide',()=>{action++;fadeSerial++;finishFade?.(false);save();audio.pause();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&wantsPlay)play();});
  render();if(wantsPlay)play();
})();
