/* parcyun studio · public text/design overrides + administrator inline editor.
   Static HTML is always the fallback. Only administrators can write through RPCs. */
(function () {
  if (window.__psContent) return;
  window.__psContent = true;

  var SB_URL = 'https://myeouecgpjxcddemexcg.supabase.co';
  var SB_KEY = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';
  var PW_KEY = 'ps_admin_pw';
  var SEL = 'h1,h2,h3,h4,h5,h6,p,li,figcaption,blockquote,dd,dt,summary,span,a,button,label,legend,td,th';
  var INLINE = { A: 1, STRONG: 1, EM: 1, B: 1, I: 1, BR: 1, SPAN: 1, SMALL: 1, MARK: 1, U: 1, CODE: 1 };
  var DESIGN_PROPERTIES = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'padding', 'margin', 'borderRadius', 'borderColor', 'borderWidth', 'opacity'];

  /* ps-design-ready-start */
  function createDesignReadiness() {
    var resolve, reject;
    var promise = new Promise(function (done, fail) { resolve = done; reject = fail; });
    promise.catch(function () {});
    return {
      promise: promise,
      markReady: function () { resolve(); },
      markFailed: function (error) { reject(error); }
    };
  }
  /* ps-design-ready-end */
  var designReadiness = createDesignReadiness();

  function path() { return location.pathname.replace(/\/index\.html$/, '/'); }
  function headers() { return { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }; }
  function rpc(name, args) {
    return fetch(SB_URL + '/rest/v1/rpc/' + name, { method: 'POST', headers: headers(), body: JSON.stringify(args || {}) })
      .then(function (r) { return r.text().then(function (text) { if (!r.ok) throw new Error(text || '저장 실패'); return text ? JSON.parse(text) : null; }); });
  }
  function sanitize(html) {
    var t = document.createElement('template'); t.innerHTML = html;
    t.content.querySelectorAll('script,style,iframe,object,embed').forEach(function (el) { el.remove(); });
    t.content.querySelectorAll('*').forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (/^on/i.test(a.name) || (a.name === 'href' && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
      });
    });
    return t.innerHTML;
  }
  function editableElements() {
    var nodes = document.body.querySelectorAll(SEL), out = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest('astro-island,[data-noedit],[data-career-managed],.ps-footer,nav,script,style') || el.closest('#ps-edit-bar,#ps-toast')) continue;
      if (!el.textContent || !el.textContent.trim()) continue;
      var ok = true;
      for (var c = 0; c < el.children.length; c++) { if (!INLINE[el.children[c].tagName]) { ok = false; break; } }
      if (ok) out.push(el);
    }
    return out;
  }
  function legacyKeyOf(el, index) { return path() + '::' + el.tagName + '::' + index; }
  function legacyDesignId(el, index) { return el.tagName.toLowerCase() + '-' + index; }
  function slug(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9가-힣_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  /* ps-identity-start */
  function stableFingerprint(value) {
    var hash = 2166136261;
    for (var i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(36);
  }
  function semanticIdentity(input) {
    if (input.explicit) return String(input.explicit).trim().toLowerCase().replace(/[^a-z0-9가-힣_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    if (!input.durableParent || !input.immutableSemantic) return '';
    return input.tag + '-' + stableFingerprint(JSON.stringify({
      durableParent: input.durableParent,
      tag: input.tag,
      immutableSemantic: input.immutableSemantic
    }));
  }
  function assignStableIdentities(inputs) {
    var candidates = inputs.map(semanticIdentity), counts = {};
    candidates.forEach(function (candidate) { if (candidate) counts[candidate] = (counts[candidate] || 0) + 1; });
    return inputs.map(function (input, index) {
      var candidate = candidates[index];
      return candidate && counts[candidate] === 1
        ? { id: candidate, legacy: false }
        : { id: input.legacyId, legacy: true };
    });
  }
  /* ps-identity-end */
  function sectionIdentity(el) {
    var section = el.parentElement && el.parentElement.closest('[data-ps-section-id],[id]');
    return section ? section.getAttribute('data-ps-section-id') || section.id : '';
  }
  function elementIdentityInput(el, attribute, legacyId) {
    var explicit = el.getAttribute(attribute);
    var own = el.id || el.getAttribute('name') || el.getAttribute('aria-label') || el.getAttribute('role');
    return {
      explicit: explicit || (el.id ? el.tagName.toLowerCase() + '-' + slug(el.id) : ''),
      durableParent: sectionIdentity(el) || path(),
      tag: el.tagName.toLowerCase(),
      immutableSemantic: own ? slug(own) : '',
      legacyId: legacyId
    };
  }
  function safeStyle(style) {
    var out = {};
    if (!style || typeof style !== 'object') return out;
    DESIGN_PROPERTIES.forEach(function (name) {
      if (typeof style[name] === 'string' && style[name].length <= 80) out[name] = style[name];
    });
    return out;
  }
  function applyStyle(el, style) {
    var clean = safeStyle(style);
    Object.keys(clean).forEach(function (name) { el.style[name] = clean[name]; });
  }
  var loadedDesign = {};
  function pickComputedStyle(style) {
    var out = {};
    if (!style) return out;
    DESIGN_PROPERTIES.forEach(function (name) { if (style[name]) out[name] = style[name]; });
    return out;
  }
  function descriptor(el) {
    var stableContentKey = el.getAttribute('data-ps-edit');
    var oldContentKey = el.getAttribute('data-ps-legacy-edit');
    var stableDesignKey = path() + '::' + el.getAttribute('data-ps-design');
    var oldDesignKey = path() + '::' + el.getAttribute('data-ps-legacy-design');
    return {
      key: stableContentKey,
      legacyKey: oldContentKey,
      designKey: stableDesignKey,
      legacyDesignKey: oldDesignKey,
      legacy: !el.hasAttribute('data-ps-stable-id'),
      label: el.tagName.toLowerCase() + ' · ' + (el.textContent || '').trim().slice(0, 52),
      html: el.innerHTML,
      computedStyle: pickComputedStyle(getComputedStyle(el)),
      savedStyle: loadedDesign[stableDesignKey] || loadedDesign[oldDesignKey] || {}
    };
  }

  var list = editableElements();
  list.forEach(function (el, i) {
    var oldContentKey = legacyKeyOf(el, i);
    var oldDesignId = legacyDesignId(el, i);
    el.setAttribute('data-ps-legacy-edit', oldContentKey);
    el.setAttribute('data-ps-legacy-design', oldDesignId);
  });
  var editIdentities = assignStableIdentities(list.map(function (el) {
    return elementIdentityInput(el, 'data-ps-edit-id', el.getAttribute('data-ps-legacy-edit'));
  }));
  var designIdentities = assignStableIdentities(list.map(function (el) {
    return elementIdentityInput(el, 'data-ps-design-id', el.getAttribute('data-ps-legacy-design'));
  }));
  list.forEach(function (el, i) {
    var editIdentity = editIdentities[i], designIdentity = designIdentities[i];
    el.setAttribute('data-ps-edit', editIdentity.legacy ? editIdentity.id : path() + '::' + editIdentity.id);
    el.setAttribute('data-ps-design', designIdentity.id);
    if (!editIdentity.legacy && !designIdentity.legacy) el.setAttribute('data-ps-stable-id', 'true');
  });

  // public content overrides
  fetch(SB_URL + '/rest/v1/site_content?select=key,value', { headers: headers() })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      var map = {}; (rows || []).forEach(function (row) { map[row.key] = row.value; });
      list.forEach(function (el) {
        var value = map[el.getAttribute('data-ps-edit')];
        if (value == null) value = map[el.getAttribute('data-ps-legacy-edit')];
        if (value != null) el.innerHTML = sanitize(value);
      });
    }).catch(function () {});

  // public, constrained design overrides
  rpc('list_site_design', { p_path: path() }).then(function (rows) {
    loadedDesign = {}; (rows || []).forEach(function (row) { loadedDesign[row.key] = row.value; });
    list.forEach(function (el) {
      var stable = path() + '::' + el.getAttribute('data-ps-design');
      var legacy = path() + '::' + el.getAttribute('data-ps-legacy-design');
      applyStyle(el, loadedDesign[stable] || loadedDesign[legacy]);
    });
    designReadiness.markReady();
  }).catch(function (error) { designReadiness.markFailed(error); });

  function findByTextKey(key) { return list.filter(function (el) { return el.getAttribute('data-ps-edit') === key || el.getAttribute('data-ps-legacy-edit') === key; })[0]; }
  function findByDesignKey(key) { return list.filter(function (el) { return path() + '::' + el.getAttribute('data-ps-design') === key || path() + '::' + el.getAttribute('data-ps-legacy-design') === key; })[0]; }
  function saveText(key, html) {
    var el = findByTextKey(key); if (!el) return Promise.reject(new Error('편집 대상을 찾지 못했습니다.'));
    var value = sanitize(html); el.innerHTML = value;
    return rpc('admin_save_content', { p_pw: sessionStorage.getItem(PW_KEY), p_key: key, p_value: value });
  }
  function saveDesign(key, value) {
    var el = findByDesignKey(key); if (!el) return Promise.reject(new Error('디자인 대상을 찾지 못했습니다.'));
    var clean = safeStyle(value); applyStyle(el, clean);
    return rpc('admin_save_site_design', { p_pw: sessionStorage.getItem(PW_KEY), p_key: key, p_value: clean });
  }

  window.psContentStudio = {
    getElements: function () { return designReadiness.promise.then(function () { return list.map(descriptor); }); },
    previewText: function (key, html) { var el = findByTextKey(key); if (el) el.innerHTML = sanitize(html); },
    previewStyle: function (key, value) { var el = findByDesignKey(key); if (el) applyStyle(el, value); },
    saveText: saveText,
    saveDesign: saveDesign
  };
  if (window.parent !== window) window.parent.postMessage({ type: 'ps-content-studio-ready' }, location.origin);

  var inspect = false;
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || !event.data) return;
    if (event.data.type === 'ps-content-studio-inspect') inspect = !!event.data.enabled;
  });
  document.addEventListener('click', function (event) {
    if (!inspect) return;
    var el = event.target.closest('[data-ps-edit]');
    if (!el) return;
    event.preventDefault(); event.stopPropagation();
    window.parent.postMessage({ type: 'ps-content-studio-selected', element: descriptor(el) }, location.origin);
  }, true);

  // Direct page editor, only after a password has been stored by /admin.
  if (!sessionStorage.getItem(PW_KEY) || window.top !== window) return;
  var css = document.createElement('style');
  css.textContent =
    '.ps-edit-on [data-ps-edit]{outline:1.5px dashed rgba(255,177,26,.55);outline-offset:3px;cursor:text;border-radius:3px;transition:outline-color .15s}' +
    '.ps-edit-on [data-ps-edit]:hover{outline-color:#FFB11A}' +
    '.ps-edit-on [data-ps-edit][contenteditable="true"]:focus{outline:2px solid #FFB11A;background:rgba(255,177,26,.08)}' +
    '#ps-edit-bar{position:fixed;left:14px;bottom:14px;z-index:99999;display:flex;gap:8px;align-items:center;font-family:system-ui,sans-serif}' +
    '#ps-edit-bar button{font:600 12.5px/1 system-ui;border:0;border-radius:100px;padding:9px 14px;cursor:pointer;background:#FFB11A;color:#000;box-shadow:0 4px 16px rgba(0,0,0,.4)}' +
    '#ps-edit-bar .ps-off{background:#222;color:#fff}' +
    '#ps-toast{position:fixed;left:14px;bottom:60px;z-index:99999;background:#111;color:#fff;font:500 12.5px system-ui;padding:8px 13px;border-radius:8px;opacity:0;transform:translateY(6px);transition:.2s;pointer-events:none}' +
    '#ps-toast.on{opacity:1;transform:none}';
  document.head.appendChild(css);
  var toast = document.createElement('div'); toast.id = 'ps-toast'; document.body.appendChild(toast);
  var timeout;
  function say(message) { toast.textContent = message; toast.classList.add('on'); clearTimeout(timeout); timeout = setTimeout(function () { toast.classList.remove('on'); }, 1800); }
  var on = false;
  function setMode(value) {
    on = value; document.body.classList.toggle('ps-edit-on', on);
    list.forEach(function (el) {
      if (on) { el.setAttribute('contenteditable', 'true'); el.setAttribute('data-ps-orig', sanitize(el.innerHTML.trim())); el.addEventListener('blur', onBlur); }
      else { el.removeAttribute('contenteditable'); el.removeEventListener('blur', onBlur); }
    });
    button.textContent = on ? '편집 끄기' : '✏️ 편집 켜기'; button.className = on ? 'ps-off' : '';
  }
  function onBlur(event) {
    var el = event.currentTarget, value = sanitize(el.innerHTML.trim());
    if (value === el.getAttribute('data-ps-orig')) return;
    el.setAttribute('data-ps-orig', value);
    saveText(el.getAttribute('data-ps-edit'), value).then(function () { say('저장됨'); }).catch(function () { say('저장 실패'); });
  }
  var bar = document.createElement('div'); bar.id = 'ps-edit-bar';
  var button = document.createElement('button'); button.textContent = '✏️ 편집 켜기';
  button.addEventListener('click', function () { setMode(!on); say(on ? '편집 모드 · 문구 클릭해 수정, 밖 클릭 시 저장' : '편집 종료'); });
  bar.appendChild(button); document.body.appendChild(bar);
})();
