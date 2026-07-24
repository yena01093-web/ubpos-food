export interface BakeryTag {
  key: string;
  icon: string;
  shortLabel: string; // 관리자 화면(칩)용 짧은 이름
  label: string;      // 고객 화면(추천 문구)용 긴 문구
}

// "나에게 맞는 빵 찾기"에서 고르는 카테고리. 늘리고 싶으면 여기에 추가하면
// 관리자 태그 편집 UI와 고객 추천 화면에 자동으로 반영됩니다.
export const BAKERY_TAGS: BakeryTag[] = [
  { key: 'diabetes',    icon: '🩺', shortLabel: '당뇨',     label: '당뇨가 걱정된다면' },
  { key: 'diet',        icon: '🥗', shortLabel: '다이어트', label: '다이어트 중이라면' },
  { key: 'kids',        icon: '🧒', shortLabel: '아이간식', label: '아이 간식으로' },
  { key: 'gluten_free', icon: '🌾', shortLabel: '글루텐프리', label: '글루텐이 걱정된다면' },
];
