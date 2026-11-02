(() => {
  if(!('serviceWorker' in navigator)||location.hostname!=='parcyun.github.io')return;
  const warm=()=>navigator.serviceWorker.controller?.postMessage({type:'ps-cache-used',urls:performance.getEntriesByType('resource').map(entry=>entry.name).filter(url=>url.startsWith(location.origin+'/'))});
  navigator.serviceWorker.addEventListener('controllerchange',warm);
  addEventListener('load',warm,{once:true});
  navigator.serviceWorker.register('/static-cache-sw.js',{scope:'/',updateViaCache:'none'}).then(()=>{if(document.readyState==='complete')warm();}).catch(()=>{});
})();
