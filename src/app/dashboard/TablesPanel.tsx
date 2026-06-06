'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/components/useSocket';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

interface TableRow {
  id: string; table_number: string; status: string; seat_count: number;
  active_order_id: string | null; active_order_number: string | null;
  active_total: number | null; active_since: string | null;
}

const STATUS_CONFIG = {
  empty:           { label: '빈 테이블',  color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
  occupied:        { label: '식사 중',    color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  waiting_payment: { label: '결제 대기',  color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
};

export default function TablesPanel({ storeId, token }: { storeId: string; token: string }) {
  const [tables,  setTables]  = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { joinStore, on } = useSocket(token);

  const load = useCallback(async () => {
    const res  = await fetch(`/api/dashboard/tables?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) setTables(data.data.tables);
    setLoading(false);
  }, [storeId, token]);

  useEffect(() => {
    load();
    joinStore(storeId);

    const off = on<{ tableId: string; status: string }>(
      'table:status_changed',
      ({ tableId, status }) => {
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
      }
    );
    return off;
  }, [storeId, load, joinStore, on]);

  if (loading) return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>불러오는 중...</div>;

  const occupied = tables.filter(t => t.status !== 'empty').length;

  return (
    <div style={s.root}>
      <div style={s.header}>
        <h2 style={s.title}>테이블 현황</h2>
        <div style={s.statPill}>
          {occupied} / {tables.length} 사용 중
        </div>
      </div>

      <div style={s.grid}>
        {tables.map(table => {
          const cfg = STATUS_CONFIG[table.status as keyof typeof STATUS_CONFIG]
            ?? STATUS_CONFIG.empty;
          const elapsed = table.active_since
            ? Math.floor((Date.now() - new Date(table.active_since).getTime()) / 60000)
            : null;

          return (
            <div
              key={table.id}
              style={{
                ...s.tableCard,
                background: cfg.bg,
                border: `2px solid ${cfg.border}`,
              }}
            >
              <div style={s.tableTop}>
                <span style={s.tableNum}>{table.table_number}</span>
                <span style={{ ...s.statusBadge, background: cfg.color }}>{cfg.label}</span>
              </div>

              <div style={s.seatRow}>
                {'🪑'.repeat(Math.min(table.seat_count, 6))}
                <span style={s.seatCount}>{table.seat_count}석</span>
              </div>

              {table.active_order_number && (
                <div style={s.orderInfo}>
                  <div style={s.orderInfoRow}>
                    <span style={s.orderInfoLabel}>주문번호</span>
                    <span style={{ ...s.orderInfoVal, color: cfg.color }}>{table.active_order_number}</span>
                  </div>
                  {table.active_total !== null && (
                    <div style={s.orderInfoRow}>
                      <span style={s.orderInfoLabel}>금액</span>
                      <span style={s.orderInfoVal}>{fmt(table.active_total)}</span>
                    </div>
                  )}
                  {elapsed !== null && (
                    <div style={s.orderInfoRow}>
                      <span style={s.orderInfoLabel}>경과</span>
                      <span style={{ ...s.orderInfoVal, color: elapsed >= 60 ? '#ef4444' : '#6b7280' }}>
                        {elapsed >= 60 ? `${Math.floor(elapsed / 60)}시간 ${elapsed % 60}분` : `${elapsed}분`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {table.status === 'empty' && (
                <div style={s.emptyMsg}>손님 없음</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:           { display: 'flex', flexDirection: 'column', gap: 20 },
  header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title:          { fontSize: 18, fontWeight: 700, color: '#1e3a5f' },
  statPill:       { background: '#1e3a5f', color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 },
  grid:           { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  tableCard:      { borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  tableTop:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tableNum:       { fontSize: 18, fontWeight: 800, color: '#1e293b' },
  statusBadge:    { color: '#fff', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  seatRow:        { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 },
  seatCount:      { fontSize: 12, color: '#94a3b8', marginLeft: 'auto' },
  orderInfo:      { display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 10px' },
  orderInfoRow:   { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  orderInfoLabel: { color: '#94a3b8' },
  orderInfoVal:   { fontWeight: 700, color: '#374151' },
  emptyMsg:       { fontSize: 12, color: '#cbd5e1', textAlign: 'center', padding: '8px 0' },
};
