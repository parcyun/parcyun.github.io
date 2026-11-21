(() => {
  const key='ps-dexterity-theme-v1';
  function restore(){
    let theme='dark';
    try{if(localStorage.getItem(key)==='light')theme='light';}catch{}
    document.documentElement.dataset.theme=theme;
    render();
  }
  function render(){
    const label=document.documentElement.dataset.theme==='light'?'다크 모드로 전환':'라이트 모드로 전환';
    document.querySelectorAll('[data-dexterity-theme]').forEach(button=>{button.setAttribute('aria-label',label);button.title=label;});
  }
  restore();
  if(window.psDexterityTheme)return;
  window.psDexterityTheme=true;
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('[data-dexterity-theme]'))return;
    const theme=document.documentElement.dataset.theme==='light'?'dark':'light';
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem(key,theme);}catch{}
    render();
  });
  document.addEventListener('DOMContentLoaded',render);
  document.addEventListener('astro:page-load',()=>{if(document.querySelector('[data-dexterity-theme]'))restore();});
})();
