export interface Cafe2Tag {
  key: string;
  icon: string;
  shortLabel: string; // 관리자 화면(칩)용 짧은 이름
  label: string;      // 고객 화면(추천 문구)용 긴 문구
}

// "지금 이 밤에 어울리는 한 잔"에서 고르는 무드 카테고리. 늘리고 싶으면 여기에 추가하면
// 관리자 태그 편집 UI와 고객 추천 화면에 자동으로 반영됩니다.
export const CAFE2_TAGS: Cafe2Tag[] = [
  { key: 'late_night_drive', icon: '🌃', shortLabel: '심야 드라이브',   label: '심야 드라이브엔' },
  { key: 'nostalgia',        icon: '📼', shortLabel: '노스탤지어',     label: '옛 생각이 날 때' },
  { key: 'sweet_retro',      icon: '🍧', shortLabel: '레트로 디저트',   label: '달콤한 게 당긴다면' },
  { key: 'chill_vinyl',      icon: '🎧', shortLabel: '느긋하게 감상',   label: '음악에 취하고 싶다면' },
];
