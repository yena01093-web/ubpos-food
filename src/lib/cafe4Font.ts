export const CAFE4_SLUG = 'cafe4';

// 카페4(북유럽/휘게) 전용 부드러운 손글씨 느낌 산세리프 폰트(Gowun Dodum)를 head에 주입 — 다른 매장에는 영향 없음
export function injectCafe4Font() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('cafe4-font')) return;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  const link = document.createElement('link');
  link.id = 'cafe4-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap';
  document.head.appendChild(preconnect1);
  document.head.appendChild(preconnect2);
  document.head.appendChild(link);
}
