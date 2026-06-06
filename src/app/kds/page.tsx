'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/components/useSocket';

interface KdsItem  { menu_name: string; quantity: number; selected_options: { name: string }[]; }
interface KdsOrder {
  id: string; order_number: string; type: string;
  table_number: string | null; status: string;
  request_note: string | null; created_at: string;
  items: KdsItem[];
}

// 경과 시간 (초 단위)
function useElapsed(createdAt: string) {
  const [sec, setSec] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  );
  useEffect(() => {
    const id = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return sec;
}

function ElapsedBadge({ createdAt }: { createdAt: string }) {
  const sec = useElapsed(createdAt);
  const min = Math.floor(sec / 60);
  const s   = sec % 60;
  const color =
    sec >= 300 ? '#ef4444' :   // 5분+ 빨강
    sec >= 180 ? '#f59e0b' :   // 3분+ 주황
    '#10b981';                 // 정상 초록

  return (
    <span style={{
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 800, fontSize: 20,
      color,
      letterSpacing: 1,
    }}>
      {String(min).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  );
}

export default function KdsPage() {
  const [storeId, setStoreId] = useState('');
  const [token,   setToken]   = useState('');
  const [orders,  setOrders]  = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sound,   setSound]   = useState(true);

  const { joinStore, on } = useSocket(token);

  const load = useCallback(async (sid: string, tok: string) => {
    const res  = await fetch(`/api/dashboard/orders?storeId=${sid}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    const data = await res.json();
    if (data.ok) {
      // KDS는 pending/accepted/cooking 만 표시
      const active = data.data.orders.filter((o: KdsOrder) =>
        ['pending','accepted','cooking'].includes(o.status)
      );
      setOrders(active);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const tok = localStorage.getItem('ubpos_token') ?? '';
    const sid = localStorage.getItem('ubpos_store') ?? '';
    setToken(tok); setStoreId(sid);
    if (tok && sid) {
      load(sid, tok);
      joinStore(sid);
    }

    const off1 = on<KdsOrder>('order:new', (o) => {
      setOrders(prev => [o, ...prev]);
      if (sound) {
        try { new Audio('/sounds/order.mp3').play(); } catch {}
      }
    });
    const off2 = on<{ orderId: string; status: string }>('order:status_changed', ({ orderId, status }) => {
      if (['ready','completed','cancelled'].includes(status)) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      }
    });
    return () => { off1(); off2(); };
  }, [load, joinStore, on, sound]);

  const advance = async (orderId: string, current: string) => {
    const next: Record<string,string> = {
      pending: 'accepted', accepted: 'cooking', cooking: 'ready',
    };
    if (!next[current]) return;
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ status: next[current] }),
    });
  };

  const STATUS_LABEL: Record<string,string> = {
    pending: '⏳ 대기', accepted: '✅ 접수', cooking: '🔥 조리중',
  };
  const STATUS_COLOR: Record<string,string> = {
    pending: '#f59e0b', accepted: '#3b82f6', cooking: '#ef4444',
  };
  const NEXT_BTN: Record<string,string> = {
    pending: '접수', accepted: '조리 시작', cooking: '완료 🔔',
  };

  return (
    <div style={s.root}>
      {/* 헤더 */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>🍳 KDS</span>
          <span style={s.orderCount}>{orders.length}건 대기</span>
        </div>
        <div style={s.headerRight}>
          <button
            style={{ ...s.soundBtn, ...(sound ? s.soundOn : s.soundOff) }}
            onClick={() => setSound(v => !v)}
          >
            {sound ? '🔔 알림 ON' : '🔕 알림 OFF'}
          </button>
        </div>
      </header>

      {/* KDS 카드 그리드 */}
      {loading ? (
        <div style={s.center}>불러오는 중...</div>
      ) : orders.length === 0 ? (
        <div style={s.center}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✨</div>
          <div style={{ color: '#94a3b8', fontSize: 20 }}>모든 주문 완료!</div>
        </div>
      ) : (
        <div style={s.grid}>
          {orders.map(order => (
            <KdsCard
              key={order.id}
              order={order}
              statusLabel={STATUS_LABEL[order.status] ?? order.status}
              statusColor={STATUS_COLOR[order.status] ?? '#6b7280'}
              nextBtn={NEXT_BTN[order.status]}
              onAdvance={() => advance(order.id, order.status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KdsCard({ order, statusLabel, statusColor, nextBtn, onAdvance }: {
  order: KdsOrder;
  statusLabel: string; statusColor: string;
  nextBtn: string; onAdvance: () => void;
}) {
  const sec = useElapsed(order.created_at);
  const urgent = sec >= 300;

  return (
    <div style={{
      ...s.card,
      borderLeft: `5px solid ${statusColor}`,
      boxShadow: urgent ? '0 0 0 2px #ef4444' : s.card.boxShadow,
      animation: urgent ? 'pulse 1.5s infinite' : 'none',
    }}>
      {/* 카드 헤더 */}
      <div style={s.cardHeader}>
        <div style={s.cardHeaderLeft}>
          <span style={{ ...s.orderNum, color: statusColor }}>{order.order_number}</span>
          {order.table_number && (
            <span style={s.tableTag}>🪑 {order.table_number}</span>
          )}
          {order.type === 'takeout' && (
            <span style={{ ...s.tableTag, background: '#f0fdf4', color: '#16a34a' }}>포장</span>
          )}
        </div>
        <div style={s.cardHeaderRight}>
          <ElapsedBadge createdAt={order.created_at} />
          <span style={{ ...s.statusPill, background: statusColor }}>{statusLabel}</span>
        </div>
      </div>

      {/* 메뉴 항목 */}
      <div style={s.items}>
        {order.items.map((item, i) => (
          <div key={i} style={s.itemRow}>
            <div style={s.itemLeft}>
              <span style={s.itemQty}>{item.quantity}</span>
              <div>
                <div style={s.itemName}>{item.menu_name}</div>
                {item.selected_options?.length > 0 && (
                  <div style={s.itemOpts}>
                    {item.selected_options.map(o => o.name).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 요청사항 */}
      {order.request_note && (
        <div style={s.note}>📝 {order.request_note}</div>
      )}

      {/* 액션 버튼 */}
      <button
        style={{ ...s.advanceBtn, background: statusColor }}
        onClick={onAdvance}
      >
        {nextBtn}
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:        { minHeight: '100dvh', background: '#0f172a', color: '#f8fafc', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", display: 'flex', flexDirection: 'column' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#1e293b', borderBottom: '1px solid #334155' },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: 16 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  logo:        { fontSize: 22, fontWeight: 800, color: '#f8fafc' },
  orderCount:  { background: '#ef4444', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 14, fontWeight: 700 },
  soundBtn:    { border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  soundOn:     { background: '#1e3a5f', color: '#60a5fa' },
  soundOff:    { background: '#374151', color: '#9ca3af' },
  center:      { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, padding: 24, alignItems: 'start' },
  card:        { background: '#1e293b', borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft:  { display: 'flex', flexDirection: 'column', gap: 6 },
  cardHeaderRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  orderNum:    { fontSize: 24, fontWeight: 900, letterSpacing: -0.5 },
  tableTag:    { background: '#334155', color: '#94a3b8', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600, alignSelf: 'flex-start' },
  statusPill:  { color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  items:       { display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #334155', paddingTop: 10 },
  itemRow:     { display: 'flex', alignItems: 'flex-start' },
  itemLeft:    { display: 'flex', alignItems: 'flex-start', gap: 10 },
  itemQty:     { background: '#334155', color: '#f8fafc', borderRadius: 6, padding: '2px 10px', fontSize: 18, fontWeight: 800, minWidth: 36, textAlign: 'center', lineHeight: 1.5 },
  itemName:    { fontSize: 17, fontWeight: 700, color: '#f1f5f9' },
  itemOpts:    { fontSize: 12, color: '#64748b', marginTop: 2 },
  note:        { background: '#0f172a', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#94a3b8' },
  advanceBtn:  { width: '100%', padding: '14px', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 4, letterSpacing: 0.5 },
};
