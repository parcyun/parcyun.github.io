(() => {
  if (window.psPageLifecycle) return;
  const entries = new Map();
  function run(entry) {
    if (entry.body === document.body) return;
    entry.cleanup?.(); entry.body = document.body;
    entry.cleanup = entry.init();
  }
  window.psPageLifecycle = {
    eligible(url) {
      const target = new URL(url,location.href);
      if(target.origin!==location.origin)return false;
      const path = target.pathname.replace(/index\.html$/,'');
      return ['/', '/dexterity/', '/academica/'].includes(path) ||
        (path.startsWith('/dexterity/') && !path.startsWith('/dexterity/guidebook/') && !path.endsWith('.xml'));
    },
    register(name,init) { if (entries.has(name)) return; const entry={init};entries.set(name,entry);run(entry); },
  };
  document.addEventListener('astro:page-load',() => entries.forEach(run));
  document.addEventListener('astro:before-preparation',event => {
    if (!window.psPageLifecycle.eligible(event.to)) return;
    const loader=event.loader;
    event.loader=async()=>{
      await loader();
      // Only small inline page initializers rerun. Shared scripts own their lifecycle.
      event.newDocument.querySelectorAll('script:not([src]):not([type="application/ld+json"])').forEach(script=>{
        if (!script.type || script.type==='text/javascript') script.setAttribute('data-astro-rerun','');
      });
    };
  });
  document.addEventListener('astro:before-swap',event => {
    entries.forEach(entry=>{entry.cleanup?.();entry.cleanup=null;});
    // Keep singleton account dialogs and their runtime styles with their controllers.
    const nodes=[...document.querySelectorAll('dialog.ps-account-dialog,dialog.ps-studio-dialog'),
      ...[...document.head.querySelectorAll('style')].filter(style=>style.hasAttribute('data-service-content-guard') || /\.ps-(?:account|studio-dialog|modal|leaderboard|ranking|sheet)/.test(style.textContent))];
    nodes.forEach((node,index)=>{
      if (node.open) node.close();
      const id=node.getAttribute('data-astro-transition-persist') || `studio-runtime-${index}`;
      node.setAttribute('data-astro-transition-persist',id);
      const placeholder=event.newDocument.createElement(node.tagName);
      placeholder.setAttribute('data-astro-transition-persist',id);
      (node.parentElement===document.head?event.newDocument.head:event.newDocument.body).append(placeholder);
    });
  });
})();
