/* Client ID is public and restricted to the registered website origins.
   Never add the NCP Client Secret to this file. */
(function () {
  const host = document.getElementById('dexterity-map');
  const status = document.getElementById('dexterity-map-status');
  if (!host || host.dataset.started) return;
  let finished = false, timer;
  function fail() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    host.dataset.state = 'error';
    host.setAttribute('aria-busy', 'false');
    status.textContent = '지도를 불러오지 못했어요. 아래 네이버 지도 링크에서 위치를 확인해 주세요.';
  }
  function start() {
    if (host.dataset.started) return;
    host.dataset.started = 'true';
    host.setAttribute('aria-busy', 'true');
    timer = setTimeout(fail, 20000);
    window.psDexterityMapReady = function () {
      const maps = window.naver?.maps;
      if (finished || !maps?.Service) return fail();
      maps.Service.geocode({ query: '경상북도 경주시 태종로 734' }, function (code, response) {
        if (finished) return;
        const address = response?.v2?.addresses?.[0];
        if (code !== maps.Service.Status.OK || !address || !Number.isFinite(Number(address.x)) || !Number.isFinite(Number(address.y))) return fail();
        try {
          const center = new maps.LatLng(Number(address.y), Number(address.x));
          const map = new maps.Map(host, {
            center, zoom: 16, scrollWheel: false,
            draggable: !matchMedia('(pointer:coarse)').matches,
            zoomControl: true, zoomControlOptions: { position: maps.Position.TOP_RIGHT }
          });
          const marker = new maps.Marker({ map, position: center, title: '향미사 · 경주시 태종로 734' });
          const info = new maps.InfoWindow({ content: '<div style="padding:12px 16px;color:#111;font:14px sans-serif"><strong>향미사</strong><br>경주시 태종로 734</div>' });
          info.open(map, marker);
          maps.Event.addListener(marker, 'click', () => info.getMap() ? info.close() : info.open(map, marker));
          const resize = new ResizeObserver(() => map.setSize(new maps.Size(host.clientWidth, host.clientHeight)));
          resize.observe(host);
          window.addEventListener('pagehide', () => resize.disconnect(), { once: true });
          finished = true;
          clearTimeout(timer);
          host.dataset.state = 'ready';
          host.setAttribute('aria-busy', 'false');
          status.textContent = '향미사 · 경주시 태종로 734';
        } catch { fail(); }
      });
    };
    const script = document.createElement('script');
    script.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=y0te2jtp1v&submodules=geocoder&callback=psDexterityMapReady';
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  }
  // Do not consume a map/geocoding request before the article's location is read.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); }
    }, { rootMargin: '240px' });
    observer.observe(host);
  } else start();
})();
