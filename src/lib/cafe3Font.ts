export const CAFE3_SLUG = 'cafe3';

// 카페3(미니멀 모던) 전용 절제된 산세리프 폰트(Gothic A1)를 head에 주입 — 다른 매장에는 영향 없음
export function injectCafe3Font() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('cafe3-font')) return;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  const link = document.createElement('link');
  link.id = 'cafe3-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Gothic+A1:wght@300;400;500;700&display=swap';
  document.head.appendChild(preconnect1);
  document.head.appendChild(preconnect2);
  document.head.appendChild(link);
}
