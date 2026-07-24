export interface Cafe4Tag {
  key: string;
  icon: string;
  shortLabel: string; // 관리자 화면(칩)용 짧은 이름
  label: string;      // 고객 화면(추천 문구)용 긴 문구
}

// "오늘의 안락함을 찾다"에서 고르는 휘게 무드 카테고리. 늘리고 싶으면 여기에 추가하면
// 관리자 태그 편집 UI와 고객 추천 화면에 자동으로 반영됩니다.
export const CAFE4_TAGS: Cafe4Tag[] = [
  { key: 'cozy_reading',    icon: '📖', shortLabel: '조용히 책 한 권', label: '조용히 책을 읽고 싶다면' },
  { key: 'warm_comfort',    icon: '🕯️', shortLabel: '포근한 위로',   label: '포근한 위로가 필요하다면' },
  { key: 'sunny_afternoon', icon: '🌿', shortLabel: '햇살 좋은 오후', label: '햇살 좋은 오후엔' },
  { key: 'with_someone',    icon: '🍵', shortLabel: '함께하는 시간', label: '누군가와 함께라면' },
];
