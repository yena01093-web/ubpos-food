export const BAKERY_SLUG = 'bakery';

// 베이커리 전용 손글씨 느낌 폰트(Gaegu)를 head에 주입 — 다른 매장에는 영향 없음
export function injectBakeryFont() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('bakery-font')) return;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  const link = document.createElement('link');
  link.id = 'bakery-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=swap';
  document.head.appendChild(preconnect1);
  document.head.appendChild(preconnect2);
  document.head.appendChild(link);
}
