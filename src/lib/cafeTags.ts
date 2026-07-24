export interface CafeTag {
  key: string;
  icon: string;
  shortLabel: string; // 관리자 화면(칩)용 짧은 이름
  label: string;      // 고객 화면(추천 문구)용 긴 문구
}

// "지금 이 순간, 어울리는 한 잔"에서 고르는 무드 카테고리. 늘리고 싶으면 여기에 추가하면
// 관리자 태그 편집 UI와 고객 추천 화면에 자동으로 반영됩니다.
export const CAFE_TAGS: CafeTag[] = [
  { key: 'rainy_day',      icon: '🌧️', shortLabel: '비 오는 날',   label: '비 오는 날엔' },
  { key: 'focus_time',     icon: '⚡', shortLabel: '집중이 필요할 때', label: '집중이 필요하다면' },
  { key: 'sweet_craving',  icon: '🍰', shortLabel: '달콤함이 필요할 때', label: '달달한 게 당긴다면' },
  { key: 'slow_afternoon', icon: '🌿', shortLabel: '여유로운 오후', label: '느긋한 오후엔' },
];
