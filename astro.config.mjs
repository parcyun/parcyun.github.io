import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// GitHub Pages 유저 사이트(parcyun.github.io) — 루트에서 서빙.
// build.format:'directory' → /arcade/ 같은 디렉토리 URL 유지 (QR·북마크 보존 필수).
// Phase 0: 실제 콘텐츠는 전부 public/ 미러에서 그대로 서빙되고, src/pages는 비어 있음.
//          페이지를 하나씩 Astro 컴포넌트로 승격할 때 src/pages로 옮긴다.
export default defineConfig({
  site: 'https://parcyun.github.io',
  base: '/',
  integrations: [react()],
  build: { format: 'directory' },
});
