'use client';

import { useState } from 'react';

// ── 타입 ─────────────────────────────────────────────────────────
interface RoomTypeInfo {
  key: string;
  name: string;
  total: number;
  basePrice: number;
}

interface PlatformRoom {
  booked: number;
  price: number;
}

interface PlatformData {
  id: string;
  name: string;
  color: string;
  accentBg: string;
  commission: number;
  connected: boolean;
  lastSync: string;
  rooms: Record<string, PlatformRoom>;
}

// ── 객실 타입 마스터 (JC호텔 45실) ───────────────────────────────
const ROOM_TYPES: RoomTypeInfo[] = [
  { key: 'standard',         name: '스탠다드',            total: 3,  basePrice:  80000 },
  { key: 'superior',         name: '슈피리어',            total: 15, basePrice: 100000 },
  { key: 'superior_twin',    name: '슈피리어 트윈',       total: 6,  basePrice: 110000 },
  { key: 'deluxe_2pc',       name: '디럭스 복층',         total: 4,  basePrice: 130000 },
  { key: 'deluxe_twin',      name: '디럭스 트윈',         total: 8,  basePrice: 130000 },
  { key: 'executive_twin',   name: '이그제큐티브 트윈',   total: 1,  basePrice: 160000 },
  { key: 'deluxe_spa',       name: '디럭스 스파',         total: 3,  basePrice: 150000 },
  { key: 'suite',            name: '스위트',              total: 1,  basePrice: 250000 },
  { key: 'deluxe_family',    name: '디럭스 패밀리',       total: 3,  basePrice: 180000 },
  { key: 'executive_family', name: '이그제큐티브 패밀리', total: 1,  basePrice: 220000 },
];

const TOTAL_ROOMS = ROOM_TYPES.reduce((s, r) => s + r.total, 0); // 45

// ── Mock 플랫폼 데이터 ────────────────────────────────────────────
const PLATFORMS: PlatformData[] = [
  {
    id: 'yanolja', name: '야놀자',
    color: '#c2185b', accentBg: '#fce4ec',
    commission: 15, connected: true, lastSync: '2026-06-15 09:32',
    rooms: {
      standard:         { booked: 2,  price:  80000 },
      superior:         { booked: 8,  price: 100000 },
      superior_twin:    { booked: 3,  price: 110000 },
      deluxe_2pc:       { booked: 1,  price: 130000 },
      deluxe_twin:      { booked: 3,  price: 130000 },
      executive_twin:   { booked: 1,  price: 160000 },
      deluxe_spa:       { booked: 1,  price: 150000 },
      suite:            { booked: 0,  price: 250000 },
      deluxe_family:    { booked: 1,  price: 180000 },
      executive_family: { booked: 0,  price: 220000 },
    },
  },
  {
    id: 'yeogi', name: '여기어때',
    color: '#e64a19', accentBg: '#fbe9e7',
    commission: 12, connected: true, lastSync: '2026-06-15 09:28',
    rooms: {
      standard:         { booked: 1,  price:  80000 },
      superior:         { booked: 5,  price: 100000 },
      superior_twin:    { booked: 2,  price: 110000 },
      deluxe_2pc:       { booked: 0,  price: 130000 },
      deluxe_twin:      { booked: 2,  price: 130000 },
      executive_twin:   { booked: 0,  price: 160000 },
      deluxe_spa:       { booked: 0,  price: 150000 },
      suite:            { booked: 0,  price: 250000 },
      deluxe_family:    { booked: 0,  price: 180000 },
      executive_family: { booked: 0,  price: 220000 },
    },
  },
  {
    id: 'booking', name: '부킹닷컴',
    color: '#003580', accentBg: '#e8eaf6',
    commission: 18, connected: true, lastSync: '2026-06-15 09:15',
    rooms: {
      standard:         { booked: 3,  price:  88000 },
      superior:         { booked: 12, price: 110000 },
      superior_twin:    { booked: 5,  price: 121000 },
      deluxe_2pc:       { booked: 3,  price: 143000 },
      deluxe_twin:      { booked: 6,  price: 143000 },
      executive_twin:   { booked: 1,  price: 176000 },
      deluxe_spa:       { booked: 2,  price: 165000 },
      suite:            { booked: 1,  price: 275000 },
      deluxe_family:    { booked: 2,  price: 198000 },
      executive_family: { booked: 1,  price: 242000 },
    },
  },
  {
    id: 'airbnb', name: '에어비앤비',
    color: '#ff5a5f', accentBg: '#fff0f0',
    commission: 14, connected: false, lastSync: '2026-06-14 18:00',
    rooms: {
      standard:         { booked: 2,  price:  85000 },
      superior:         { booked: 9,  price: 105000 },
      superior_twin:    { booked: 4,  price: 115000 },
      deluxe_2pc:       { booked: 2,  price: 138000 },
      deluxe_twin:      { booked: 4,  price: 138000 },
      executive_twin:   { booked: 1,  price: 170000 },
      deluxe_spa:       { booked: 2,  price: 158000 },
      suite:            { booked: 0,  price: 265000 },
      deluxe_family:    { booked: 2,  price: 190000 },
      executive_family: { booked: 1,  price: 230000 },
    },
  },
];

// ── 할인 추천 계산 ────────────────────────────────────────────────
function calcDiscount(remaining: number, total: number) {
  const pct = (remaining / total) * 100;
  if (pct >= 70) return { rate: 20, label: '-20%', color: '#dc2626', bg: '#fef2f2' };
  if (pct >= 50) return { rate: 10, label: '-10%', color: '#d97706', bg: '#fffbeb' };
  return { rate: 0, label: '-', color: '#16a34a', bg: '#f0fdf4' };
}

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function ChannelPanel() {
  const [activeId, setActiveId] = useState('yanolja');
  const [applied,  setApplied]  = useState<Record<string, Record<string, boolean>>>({});
  const [toast,    setToast]    = useState('');

  const platform = PLATFORMS.find(p => p.id === activeId)!;

  const totalBooked    = ROOM_TYPES.reduce((s, r) => s + (platform.rooms[r.key]?.booked ?? 0), 0);
  const totalRemaining = TOTAL_ROOMS - totalBooked;
  const vacancyPct     = Math.round((totalRemaining / TOTAL_ROOMS) * 100);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const applyOne = (roomKey: string) => {
    setApplied(prev => ({
      ...prev,
      [activeId]: { ...(prev[activeId] ?? {}), [roomKey]: true },
    }));
    const name = ROOM_TYPES.find(r => r.key === roomKey)?.name ?? '';
    const rem  = (ROOM_TYPES.find(r => r.key === roomKey)?.total ?? 0) - (platform.rooms[roomKey]?.booked ?? 0);
    const tot  = ROOM_TYPES.find(r => r.key === roomKey)?.total ?? 1;
    showToast(`${name} ${calcDiscount(rem, tot).label} 할인 적용 완료 (데모)`);
  };

  const applyAll = () => {
    const batch: Record<string, boolean> = {};
    ROOM_TYPES.forEach(rt => {
      const rem  = rt.total - (platform.rooms[rt.key]?.booked ?? 0);
      if (calcDiscount(rem, rt.total).rate > 0) batch[rt.key] = true;
    });
    setApplied(prev => ({ ...prev, [activeId]: { ...(prev[activeId] ?? {}), ...batch } }));
    showToast('추천 할인이 모두 적용되었습니다 (데모)');
  };

  const vacColor = vacancyPct >= 70 ? '#dc2626' : vacancyPct >= 50 ? '#d97706' : '#16a34a';

  return (
    <div style={s.root}>
      {/* ── 페이지 헤더 ─────────────────────────────────────────── */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>채널 관리</h2>
          <p style={s.pageSubtitle}>JC호텔 · 45개 객실 · 오늘 예약 현황 (Mock 데이터)</p>
        </div>
        <div style={s.headerRight}>
          <span style={s.demoBadge}>DEMO</span>
          <button style={s.refreshBtn} onClick={() => showToast('채널 데이터 동기화 완료 (데모)')}>
            🔄 새로고침
          </button>
        </div>
      </div>

      {/* ── 플랫폼 카드 탭 ──────────────────────────────────────── */}
      <div style={s.platformGrid}>
        {PLATFORMS.map(p => {
          const booked  = ROOM_TYPES.reduce((s, r) => s + (p.rooms[r.key]?.booked ?? 0), 0);
          const vacPct  = Math.round(((TOTAL_ROOMS - booked) / TOTAL_ROOMS) * 100);
          const isActive = p.id === activeId;
          return (
            <button
              key={p.id}
              style={{
                ...s.platformCard,
                border: `2px solid ${isActive ? p.color : '#e2e8f0'}`,
                background: isActive ? p.accentBg : '#fff',
              }}
              onClick={() => setActiveId(p.id)}
            >
              <div style={s.pcTop}>
                <span style={{ ...s.pcName, color: isActive ? p.color : '#1e293b' }}>{p.name}</span>
                <span style={{ ...s.connBadge, background: p.connected ? '#dcfce7' : '#f1f5f9', color: p.connected ? '#15803d' : '#94a3b8' }}>
                  {p.connected ? '● 연결' : '○ 미연결'}
                </span>
              </div>
              <div style={s.pcStats}>
                <div style={s.pcStatItem}>
                  <span style={{ ...s.pcStatVal, color: p.color }}>{booked}</span>
                  <span style={s.pcStatLabel}>예약</span>
                </div>
                <div style={s.pcDivider} />
                <div style={s.pcStatItem}>
                  <span style={{ ...s.pcStatVal, color: vacPct >= 70 ? '#dc2626' : vacPct >= 50 ? '#d97706' : '#16a34a' }}>
                    {vacPct}%
                  </span>
                  <span style={s.pcStatLabel}>잔여율</span>
                </div>
                <div style={s.pcDivider} />
                <div style={s.pcStatItem}>
                  <span style={s.pcStatVal}>{p.commission}%</span>
                  <span style={s.pcStatLabel}>수수료</span>
                </div>
              </div>
              <div style={s.pcSync}>마지막 동기화 {p.lastSync}</div>
            </button>
          );
        })}
      </div>

      {/* ── 선택 플랫폼 상세 ────────────────────────────────────── */}
      <div style={s.detailCard}>
        {/* 요약 바 */}
        <div style={s.summaryBar}>
          <div style={s.summaryGroup}>
            <div style={s.summaryItem}>
              <span style={s.summaryLabel}>오늘 예약</span>
              <span style={{ ...s.summaryVal, color: platform.color }}>{totalBooked}실</span>
            </div>
            <div style={s.summaryItem}>
              <span style={s.summaryLabel}>잔여 객실</span>
              <span style={s.summaryVal}>{totalRemaining}실</span>
            </div>
            <div style={s.summaryItem}>
              <span style={s.summaryLabel}>잔여율</span>
              <span style={{ ...s.summaryVal, color: vacColor }}>{vacancyPct}%</span>
            </div>
            <div style={s.summaryItem}>
              <span style={s.summaryLabel}>플랫폼 수수료</span>
              <span style={s.summaryVal}>{platform.commission}%</span>
            </div>
          </div>

          {/* 잔여율 게이지 */}
          <div style={s.gaugeWrap}>
            <div style={{ ...s.gaugeBar, background: '#e2e8f0' }}>
              <div style={{ ...s.gaugeFill, width: `${vacancyPct}%`, background: vacColor }} />
            </div>
            <span style={{ ...s.gaugeLabel, color: vacColor }}>잔여 {vacancyPct}%</span>
          </div>

          <button
            style={{ ...s.applyAllBtn, background: platform.color }}
            onClick={applyAll}
          >
            ⚡ 추천 할인 일괄 적용
          </button>
        </div>

        {/* 객실 테이블 */}
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={{ ...s.th, minWidth: 130 }}>객실 타입</th>
                <th style={{ ...s.th, ...s.thC }}>총</th>
                <th style={{ ...s.th, ...s.thC }}>예약 / 잔여</th>
                <th style={{ ...s.th, ...s.thC }}>잔여율</th>
                <th style={{ ...s.th, ...s.thR }}>기준 요금</th>
                <th style={{ ...s.th, ...s.thR }}>플랫폼 판매가</th>
                <th style={{ ...s.th, ...s.thR }}>실수령액</th>
                <th style={{ ...s.th, ...s.thC }}>추천 할인</th>
                <th style={{ ...s.th, ...s.thC }}>적용</th>
              </tr>
            </thead>
            <tbody>
              {ROOM_TYPES.map((rt, i) => {
                const room      = platform.rooms[rt.key] ?? { booked: 0, price: rt.basePrice };
                const remaining = rt.total - room.booked;
                const disc      = calcDiscount(remaining, rt.total);
                const vacRt     = Math.round((remaining / rt.total) * 100);
                const isApplied = !!(applied[activeId]?.[rt.key]);
                const sellPrice = isApplied
                  ? Math.round(room.price * (1 - disc.rate / 100) / 100) * 100
                  : room.price;
                const netPrice  = Math.round(sellPrice * (1 - platform.commission / 100) / 100) * 100;

                return (
                  <tr key={rt.key} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={s.td}>
                      <span style={s.roomName}>{rt.name}</span>
                    </td>
                    <td style={{ ...s.td, ...s.thC, color: '#64748b' }}>{rt.total}</td>
                    <td style={{ ...s.td, ...s.thC }}>
                      <span style={{ color: '#2563eb', fontWeight: 700 }}>{room.booked}</span>
                      <span style={{ color: '#cbd5e1' }}> / </span>
                      <span style={{ color: remaining === 0 ? '#dc2626' : '#374151', fontWeight: 600 }}>
                        {remaining}
                      </span>
                    </td>
                    <td style={{ ...s.td, ...s.thC }}>
                      <span style={{ ...s.badge, background: disc.bg, color: disc.color }}>
                        {vacRt}%
                      </span>
                    </td>
                    <td style={{ ...s.td, ...s.thR, color: '#94a3b8' }}>
                      {fmt(rt.basePrice)}
                    </td>
                    <td style={{ ...s.td, ...s.thR }}>
                      <span style={{ fontWeight: 700, color: isApplied ? '#dc2626' : '#111827' }}>
                        {fmt(sellPrice)}
                      </span>
                      {isApplied && (
                        <span style={s.discApplied}>-{disc.rate}%</span>
                      )}
                    </td>
                    <td style={{ ...s.td, ...s.thR, color: '#059669', fontWeight: 600 }}>
                      {fmt(netPrice)}
                    </td>
                    <td style={{ ...s.td, ...s.thC }}>
                      {disc.rate > 0 ? (
                        <span style={{ ...s.badge, background: disc.bg, color: disc.color, fontWeight: 700 }}>
                          {disc.label}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: 13 }}>-</span>
                      )}
                    </td>
                    <td style={{ ...s.td, ...s.thC }}>
                      {disc.rate > 0 && !isApplied ? (
                        <button
                          style={{ ...s.applyBtn, borderColor: disc.color, color: disc.color }}
                          onClick={() => applyOne(rt.key)}
                        >
                          적용
                        </button>
                      ) : isApplied ? (
                        <span style={s.appliedTxt}>✓ 적용됨</span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: 13 }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 범례 */}
        <div style={s.legend}>
          <span style={s.legendItem}>
            <span style={{ ...s.dot, background: '#dc2626' }} /> 잔여 70%↑ → -20% 권장
          </span>
          <span style={s.legendItem}>
            <span style={{ ...s.dot, background: '#d97706' }} /> 잔여 50%↑ → -10% 권장
          </span>
          <span style={s.legendItem}>
            <span style={{ ...s.dot, background: '#16a34a' }} /> 잔여 50%↓ → 정상 판매
          </span>
          <span style={{ ...s.legendItem, color: '#94a3b8', marginLeft: 'auto' }}>
            실수령액 = 판매가 × (1 − 수수료율)
          </span>
        </div>
      </div>

      {/* ── 토스트 ──────────────────────────────────────────────── */}
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root:         { display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" },

  pageHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle:    { fontSize: 20, fontWeight: 800, color: '#1e3a5f', margin: 0 },
  pageSubtitle: { fontSize: 13, color: '#94a3b8', margin: '4px 0 0' },
  headerRight:  { display: 'flex', alignItems: 'center', gap: 10 },
  demoBadge:    { fontSize: 11, fontWeight: 700, background: '#fef9c3', color: '#854d0e', borderRadius: 6, padding: '4px 10px', border: '1px solid #fde68a' },
  refreshBtn:   { fontSize: 13, fontWeight: 600, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#374151' },

  platformGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  platformCard: { borderRadius: 14, padding: '16px', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, transition: 'box-shadow .15s' },
  pcTop:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pcName:       { fontSize: 16, fontWeight: 800 },
  connBadge:    { fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' },
  pcStats:      { display: 'flex', alignItems: 'center', gap: 0 },
  pcStatItem:   { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  pcStatVal:    { fontSize: 22, fontWeight: 800, color: '#1e293b' },
  pcStatLabel:  { fontSize: 11, color: '#94a3b8', fontWeight: 600 },
  pcDivider:    { width: 1, height: 36, background: '#e2e8f0', margin: '0 4px' },
  pcSync:       { fontSize: 11, color: '#94a3b8' },

  detailCard:   { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' },

  summaryBar:   { display: 'flex', alignItems: 'center', gap: 20, padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' },
  summaryGroup: { display: 'flex', gap: 24 },
  summaryItem:  { display: 'flex', flexDirection: 'column', gap: 2 },
  summaryLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryVal:   { fontSize: 22, fontWeight: 800, color: '#1e293b' },

  gaugeWrap:    { flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 4 },
  gaugeBar:     { height: 8, borderRadius: 99, overflow: 'hidden' },
  gaugeFill:    { height: '100%', borderRadius: 99, transition: 'width .4s' },
  gaugeLabel:   { fontSize: 12, fontWeight: 700 },

  applyAllBtn:  { flexShrink: 0, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },

  tableWrap:    { overflowX: 'auto' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead:        { background: '#f1f5f9' },
  th:           { padding: '12px 14px', fontWeight: 700, color: '#475569', fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap' },
  thC:          { textAlign: 'center' as const },
  thR:          { textAlign: 'right' as const },
  td:           { padding: '11px 14px', borderTop: '1px solid #f1f5f9', verticalAlign: 'middle' },
  roomName:     { fontWeight: 700, color: '#1e293b', fontSize: 13 },

  badge:        { display: 'inline-block', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  discApplied:  { display: 'inline-block', marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', borderRadius: 4, padding: '1px 6px' },

  applyBtn:     { fontSize: 12, fontWeight: 700, background: '#fff', border: '1.5px solid', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' },
  appliedTxt:   { fontSize: 12, color: '#16a34a', fontWeight: 700 },

  legend:       { display: 'flex', gap: 20, padding: '14px 24px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', background: '#fafafa' },
  legendItem:   { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' },
  dot:          { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },

  toast:        { position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', borderRadius: 12, padding: '14px 24px', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' },
};
