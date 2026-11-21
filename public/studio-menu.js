/* Shared studio menu, independent of game accounts and Firebase. */
import './modal-motion.js?v=20261030-2';

export function createStudioMenu({ aboutHref, baseUrl = new URL('.', import.meta.url).href, mascot = new URL('images/dexter-base-character-01.png', import.meta.url).href } = {}) {
  if (window.__psStudioMenu) return window.__psStudioMenu;
  const css = document.createElement('style');
  css.textContent = `
    .ps-studio-dialog{box-sizing:border-box;width:min(430px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;margin:auto;padding:24px;border:1px solid #ffb11a50;border-radius:24px;background:#101319;color:#fff;font:14px/1.6 Pretendard,sans-serif;box-shadow:0 24px 90px #0009}
    .ps-studio-dialog::backdrop{background:#0009;backdrop-filter:blur(6px)}
    .ps-studio-dialog header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
    .ps-studio-dialog header img{width:44px;height:44px;object-fit:cover;border-radius:50%;background:#fff;flex:none}
    .ps-studio-dialog h2{margin:0;min-width:0}
    .ps-studio-dialog .ps-studio-wordmark{display:inline-block;font:400 30px/1.3 'Covered By Your Grace',cursive;color:#ffb11a;text-decoration:none;transition:color .2s ease,transform .2s ease}
    .ps-studio-dialog .ps-studio-wordmark:hover{color:#ffd27a;transform:translateY(-2px)}
    .ps-studio-dialog button,.ps-studio-dialog a{box-sizing:border-box}
    .ps-studio-dialog .ps-close{width:32px;height:32px;flex:none;border:0;border-radius:10px;background:#ffffff12;color:#fff;font:20px/1 sans-serif;cursor:pointer}
    .ps-studio-actions{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .ps-studio-actions:has(button[hidden]){grid-template-columns:1fr}
    .ps-studio-dialog .ps-menu-action{display:flex;align-items:center;justify-content:center;text-align:center;min-height:48px;width:100%;padding:12px 0;border:0;border-bottom:1px solid #ffffff16;background:transparent;color:#fff;text-decoration:none;font:inherit;cursor:pointer}
    .ps-studio-dialog .ps-menu-action:hover{color:#ffb11a}
    .ps-studio-dialog .ps-menu-action[hidden]{display:none}
    .ps-studio-support{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:28px}
    .ps-studio-coffee,.ps-studio-share{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;background:transparent;cursor:pointer;white-space:nowrap}
    .ps-studio-coffee{color:#ffb11a;padding:0;font:300 12px Montserrat,Pretendard,sans-serif;min-height:44px}
    .ps-studio-share{background:#ffb11a;color:#000;padding:10px 15px!important;border-radius:24px!important;height:44px;min-height:44px;flex-shrink:0;appearance:none;-webkit-appearance:none;font:700 12px/1.2 Pretendard,sans-serif;transition:transform .2s ease,background .2s ease}
    .ps-studio-share svg{display:block;width:18px;height:18px;flex:0 0 18px}
    .ps-studio-share:hover{background:#e89500!important;transform:translateY(-2px)}
    .ps-studio-dialog .ps-studio-library{display:flex;justify-content:center;align-items:center;min-height:44px;margin:24px auto 0;width:fit-content;padding:8px 20px;border:1px solid #ffffff30;border-radius:24px;font:inherit;text-decoration:none;color:#c6cbd3}
    .ps-studio-dialog .ps-studio-library:hover{border-color:#ffb11a;color:#ffb11a}
    .ps-studio-dialog :focus-visible{outline:2px solid #ffb11a;outline-offset:3px}
    .ps-studio-wordmark:focus:not(:focus-visible){outline:none}
    .ps-studio-home{border:0!important;border-radius:50%!important;background:transparent!important;box-shadow:none!important;padding:0!important;overflow:hidden}
    .ps-studio-avatar{width:100%;height:100%;border-radius:50%;object-fit:cover;background:#fff}
    @media(max-width:480px){.ps-studio-support{flex-direction:column;align-items:stretch}.ps-studio-share{order:-1;width:100%}.ps-studio-coffee{min-height:40px}}
    @media(max-width:360px){.ps-studio-dialog{padding:20px}.ps-studio-dialog .ps-studio-wordmark{font-size:26px}.ps-studio-actions{gap:8px}}
    @media(prefers-reduced-motion:reduce){.ps-studio-dialog .ps-studio-wordmark,.ps-studio-share{transition:none}.ps-studio-dialog .ps-studio-wordmark:hover,.ps-studio-share:hover{transform:none}}
  `;
  document.head.append(css);
  let studio = document.createElement('dialog');
  studio.className = 'ps-account-dialog ps-studio-dialog';
  studio.setAttribute('aria-label', 'parcyun studio');
  const header = document.createElement('header');
  const image = document.createElement('img'); image.src = mascot; image.alt = '';
  const title = document.createElement('h2');
  const wordmark = document.createElement('a'); wordmark.className = 'ps-studio-wordmark'; wordmark.href = baseUrl; wordmark.textContent = 'parcyun studio'; wordmark.setAttribute('aria-label', 'parcyun studio 홈으로 이동');
  title.append(wordmark);
  const close = document.createElement('button'); close.type = 'button'; close.className = 'ps-close'; close.textContent = '×'; close.setAttribute('aria-label', '닫기'); close.onclick = () => studio.close();
  header.append(image, title, close); studio.append(header);
  const actions = document.createElement('div'); actions.className = 'ps-studio-actions'; studio.append(actions);
  function action(label, fn) { const button = document.createElement('button'); button.type = 'button'; button.className = 'ps-menu-action'; button.textContent = label; button.onclick = () => { studio.close(); fn(); }; actions.append(button); return button; }
  const feedback = action('기능 개선 요청', () => document.querySelector('#foot-report')?.click());
  const review = action('리뷰 남기기', () => { const link = document.querySelector('#ps-footer-root a[href*="/reviews/"]'); const url = link ? new URL(link.getAttribute('href'), baseUrl).href : new URL('reviews/?service=all&source=other', baseUrl).href; if(window.psStudioMusic)window.psStudioMusic.leave(url);else location.href=url; });
  const about = document.createElement('a'); about.className = 'ps-menu-action ps-studio-about'; about.href = aboutHref || new URL(location.pathname.startsWith('/spell-drill') ? 'spell-drill/about/' : 'world-map/about/', baseUrl).href; about.textContent = '서비스 소개 · 사용 방법'; studio.append(about);
  const support = document.createElement('div'); support.className = 'ps-studio-support'; studio.append(support);
  const library = document.createElement('a'); library.className = 'ps-studio-library'; library.href = new URL('atlas-gears/', baseUrl).href; library.textContent = '교육 활동 자료 더보기'; studio.append(library);
  document.body.append(studio);
  studio = window.psModalMotion ? window.psModalMotion.bindDialog(studio) : studio;
  function install() {
    feedback.hidden = !document.querySelector('#foot-report');
    review.hidden = !document.querySelector('#ps-footer-root a[href*="/reviews/"]');
    const coffee = document.querySelector('#ps-coffee'), share = document.querySelector('.ps-share-fab');
    if (!support.childElementCount && coffee && share) {
      for (const [original, className] of [[coffee, 'ps-studio-coffee'], [share, 'ps-studio-share']]) {
        const copy = original.cloneNode(true); copy.removeAttribute('id'); copy.removeAttribute('style'); copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id')); copy.className = className;
        copy.onclick = () => { studio.close(); original.click(); }; support.append(copy);
      }
    }
    const home = document.querySelector('[data-studio-menu],#ps-back-btn,.home-fab,.ps-back');
    if (home && !home.dataset.studioMenuBound) {
      home.dataset.studioMenuBound = 'true'; home.removeAttribute('onclick'); home.classList.add('ps-studio-home'); home.setAttribute('role', 'button'); home.setAttribute('aria-label', 'parcyun studio 메뉴'); home.setAttribute('aria-haspopup', 'dialog'); home.title = 'parcyun studio 메뉴';
      home.replaceChildren(image.cloneNode()); home.firstChild.className = 'ps-studio-avatar';
      home.addEventListener('click', event => { event.preventDefault(); studio.showModal(); });
      home.addEventListener('keydown', event => { if (event.key === ' ' && home.tagName !== 'BUTTON') { event.preventDefault(); studio.showModal(); } });
    }
  }
  const observer=new MutationObserver(install);
  function mount(){observer.disconnect();support.replaceChildren();observer.observe(document.body,{childList:true,subtree:true});install();}
  document.addEventListener('astro:page-load',mount);mount();
  window.__psStudioMenu = studio;
  return studio;
}
