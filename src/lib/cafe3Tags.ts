export interface Cafe3Tag {
  key: string;
  icon: string;
  shortLabel: string; // 관리자 화면(칩)용 짧은 이름
  label: string;      // 고객 화면(추천 문구)용 긴 문구
}

// "오늘의 취향을 찾다"에서 고르는 원두/취향 카테고리. 아이콘은 화려한 이모지 대신
// 로스팅 정도를 뜻하는 단색 원 기호로 통일해 절제된 톤을 유지합니다.
// 늘리고 싶으면 여기에 추가하면 관리자 태그 편집 UI와 고객 추천 화면에 자동으로 반영됩니다.
export const CAFE3_TAGS: Cafe3Tag[] = [
  { key: 'light_roast',  icon: '○', shortLabel: '산미 있는',     label: '산뜻한 산미를 원한다면' },
  { key: 'dark_roast',   icon: '●', shortLabel: '묵직한 바디감', label: '진한 바디감을 원한다면' },
  { key: 'no_caffeine',  icon: '◐', shortLabel: '디카페인',      label: '카페인이 부담스럽다면' },
  { key: 'cold_brew',    icon: '❄', shortLabel: '시원하게',      label: '시원한 한 잔을 원한다면' },
];
