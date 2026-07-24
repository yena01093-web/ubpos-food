export const CAFE2_SLUG = 'cafe2';

// 카페2(시티팝/레트로) 전용 굵은 레트로 사인 느낌 폰트(Black Han Sans)를 head에 주입 — 다른 매장에는 영향 없음
export function injectCafe2Font() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('cafe2-font')) return;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  const link = document.createElement('link');
  link.id = 'cafe2-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap';
  document.head.appendChild(preconnect1);
  document.head.appendChild(preconnect2);
  document.head.appendChild(link);
}
