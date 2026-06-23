'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '@/components/useSocket';

// ── ESC/POS 바이트 빌더 ───────────────────────────────────────────
// 프린터에 직접 전송할 바이트열 생성 (UTF-8 인코딩)
function buildTicketBytes(order: Order): Uint8Array {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const enc = new TextEncoder();
  const b = (...n: number[]) => new Uint8Array(n);

  const segs: Uint8Array[] = [
    b(0x1B, 0x40),                // ESC @ 초기화
    b(0x1B, 0x74, 0xFF),          // UTF-8 코드페이지 (지원 모델)
    b(0x1B, 0x61, 0x01),          // 가운데 정렬
    b(0x1B, 0x45, 0x01),          // 볼드 ON
    enc.encode('\xbc\xb3\xc6\xdb\xc5\xa9\xb8\xae\xbd\xba\xc7\xc3 \xc1\xa6\xc3\xa2\xc1\xa1\n'), // fallback: store name
    b(0x1B, 0x45, 0x00),          // 볼드 OFF
    enc.encode('\xc1\xd6\xb9\xe6\xbf\xb5\xbc\xf6\xc1\xf5\n'),
    enc.encode('--------------------------------\n'),
    b(0x1D, 0x21, 0x11),          // 2배 크기
    enc.encode(`#${order.order_number}\n`),
    b(0x1D, 0x21, 0x00),          // 일반 크기
    b(0x1B, 0x61, 0x00),          // 왼쪽 정렬
    enc.encode(`${order.table_number ? `Table: ${order.table_number}` : 'Takeout'}  ${hh}:${mm}\n`),
    enc.encode('--------------------------------\n'),
    ...order.items.map(i => enc.encode(`${i.menu_name}  x${i.quantity}\n`)),
    enc.encode('--------------------------------\n'),
    ...(order.request_note ? [enc.encode(`Memo: ${order.request_note}\n`)] : []),
    b(0x0A, 0x0A, 0x0A, 0x0A),   // 용지 피드
    b(0x1D, 0x56, 0x41, 0x00),   // 풀 컷
  ];

  const total = segs.reduce((n, s) => n + s.length, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const s of segs) { buf.set(s, off); off += s.length; }
  return buf;
}

// ── window.print() 폴백 ──────────────────────────────────────────
function printKitchenTicket(order: Order) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const fmtP = (n: number) => n.toLocaleString('ko-KR') + '원';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:80mm auto;margin:3mm 2mm}
body{font-family:'Courier New',monospace;font-size:15px;width:76mm;line-height:1.5}
.center{text-align:center}.bold{font-weight:bold}
.huge{font-size:32px;font-weight:bold;text-align:center;margin:6px 0}
.dash{border-top:1px dashed #000;margin:6px 0}
.row{display:flex;justify-content:space-between;margin:2px 0}
.note{margin-top:6px;padding:4px;border:1px dashed #000;font-size:13px}
</style></head><body>
<div class="center bold" style="font-size:16px">슈퍼크리스피 제천점</div>
<div class="center" style="font-size:12px">주방영수증</div>
<div class="dash"></div>
<div class="huge">${order.order_number}</div>
<div class="row"><span>${order.table_number ? '🪑 ' + order.table_number : '📦 포장'}</span><span>${timeStr}</span></div>
<div class="dash"></div>
${order.items.map(i => `<div class="row"><span>${i.menu_name}</span><span>× ${i.quantity}</span></div>`).join('')}
<div class="dash"></div>
<div class="row bold"><span>합계</span><span>${fmtP(order.total_price)}</span></div>
${order.request_note ? `<div class="note">📝 ${order.request_note}</div>` : ''}
<div style="margin-top:20px"></div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=1,height=1,left=-100,top=-100');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

interface OrderItem { menu_name: string; quantity: number; item_total: number; }
interface Order {
  id: string; order_number: string; type: string; status: string;
  total_price: number; payment_status: string;
  table_number: string | null; request_note: string | null;
  created_at: string; items: OrderItem[];
}

const STATUS_COLS = [
  { key: 'pending',  label: '📩 접수대기', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'accepted', label: '✅ 접수완료', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'cooking',  label: '👨‍🍳 조리중',  color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'ready',    label: '🔔 준비완료', color: '#10b981', bg: '#ecfdf5' },
];

const NEXT_STATUS: Record<string, string> = {
  pending: 'accepted', accepted: 'cooking', cooking: 'ready', ready: 'completed',
};
const NEXT_LABEL: Record<string, string> = {
  pending: '접수', accepted: '조리시작', cooking: '준비완료', ready: '완료처리',
};

export default function OrdersPanel({ storeId, token }: { storeId: string; token: string }) {
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [summary,       setSummary]       = useState({ total_orders: 0, total_revenue: 0, pending_count: 0 });
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState<Order | null>(null);
  const [printerStatus, setPrinterStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');

  const { joinStore, on } = useSocket(token);
  const knownIds   = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const portRef    = useRef<SerialPort | null>(null);
  const portOpen   = useRef(false);

  // ── Serial 포트 열기 ──────────────────────────────────────────
  const openPort = useCallback(async (port: SerialPort) => {
    try {
      if (portOpen.current) return;
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      portOpen.current = true;
      setPrinterStatus('connected');

      port.addEventListener('disconnect', () => {
        portOpen.current = false;
        portRef.current = null;
        setPrinterStatus('disconnected');
      });
    } catch {
      setPrinterStatus('error');
    }
  }, []);

  // ── 이전에 허용한 포트 자동 연결 ────────────────────────────
  useEffect(() => {
    if (!('serial' in navigator)) return;
    (navigator as unknown as { serial: { getPorts(): Promise<SerialPort[]> } })
      .serial.getPorts()
      .then(ports => { if (ports.length > 0) openPort(ports[0]); })
      .catch(() => {});
  }, [openPort]);

  // ── 프린터 연결 버튼 핸들러 ──────────────────────────────────
  const connectPrinter = useCallback(async () => {
    if (!('serial' in navigator)) {
      alert('Web Serial API를 지원하지 않습니다. Chrome 89+ 필요');
      return;
    }
    try {
      const port = await (navigator as unknown as {
        serial: { requestPort(o?: object): Promise<SerialPort> }
      }).serial.requestPort();
      await openPort(port);
    } catch {
      // 사용자가 취소한 경우 무시
    }
  }, [openPort]);

  // ── 인쇄 (Serial 우선, 폴백 window.print) ───────────────────
  const doPrint = useCallback(async (order: Order) => {
    if (portRef.current && portOpen.current) {
      try {
        const bytes  = buildTicketBytes(order);
        const writer = portRef.current.writable!.getWriter();
        await writer.write(bytes);
        writer.releaseLock();
        return;
      } catch (e) {
        console.error('Serial print error:', e);
        setPrinterStatus('error');
        portOpen.current = false;
        portRef.current  = null;
      }
    }
    // 폴백: 팝업 프린트
    printKitchenTicket(order);
  }, []);

  // ── 로드 + 새 주문 감지 → 자동 출력 ──────────────────────────
  const load = useCallback(async () => {
    const res  = await fetch(`/api/dashboard/orders?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) {
      const fetched: Order[] = data.data.orders;

      if (isFirstLoad.current) {
        fetched.forEach(o => knownIds.current.add(o.id));
        isFirstLoad.current = false;
      } else {
        const newOrders = fetched.filter(o => !knownIds.current.has(o.id));
        newOrders.forEach(o => {
          knownIds.current.add(o.id);
          doPrint(o);
          try { new Audio('/sounds/order.mp3').play(); } catch {}
        });
      }

      setOrders(fetched);
      setSummary({
        total_orders:  Number(data.data.summary.total_orders),
        total_revenue: Number(data.data.summary.total_revenue),
        pending_count: Number(data.data.summary.pending_count),
      });
    }
    setLoading(false);
  }, [storeId, token, doPrint]);

  useEffect(() => {
    load();
    joinStore(storeId);

    const off1 = on<Order>('order:new', (newOrder) => {
      if (!knownIds.current.has(newOrder.id)) {
        knownIds.current.add(newOrder.id);
        setOrders(prev => [newOrder, ...prev]);
        setSummary(s => ({ ...s, total_orders: s.total_orders + 1, pending_count: s.pending_count + 1 }));
        doPrint(newOrder);
        try { new Audio('/sounds/order.mp3').play(); } catch {}
      }
    });

    const off2 = on<{ orderId: string; status: string }>('order:status_changed', ({ orderId, status }) => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      setSelected(prev => prev?.id === orderId ? { ...prev, status } : prev);
    });

    return () => { off1(); off2(); };
  }, [storeId, load, joinStore, on, doPrint]);

  // ── 5초 폴링 ─────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => { load(); }, 5000);
    return () => clearInterval(interval);
  }, [load]);

  // ── 상태 변경 ─────────────────────────────────────────────────
  const changeStatus = async (orderId: string, status: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
  };

  if (loading) return <div style={s.loading}>불러오는 중...</div>;

  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));

  const printerBtnColor =
    printerStatus === 'connected' ? '#10b981' :
    printerStatus === 'error'     ? '#ef4444' : '#94a3b8';
  const printerBtnLabel =
    printerStatus === 'connected' ? '🖨 COM12 연결됨' :
    printerStatus === 'error'     ? '🖨 오류 - 재연결' : '🖨 프린터 연결';

  return (
    <div style={s.root}>
      {/* 프린터 연결 바 */}
      <div style={s.printerBar}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {printerStatus === 'connected'
            ? 'COM12 · 9600baud · 직접 인쇄 활성'
            : '프린터 미연결 — 연결 시 팝업 없이 바로 출력'}
        </span>
        <button
          style={{ ...s.printerBtn, background: printerBtnColor }}
          onClick={connectPrinter}
        >
          {printerBtnLabel}
        </button>
      </div>

      {/* 요약 카드 */}
      <div style={s.summaryRow}>
        <SummaryCard label="오늘 주문" value={`${summary.total_orders}건`}  color="#2563eb" />
        <SummaryCard label="오늘 매출" value={fmt(summary.total_revenue)}   color="#10b981" />
        <SummaryCard label="대기 중"   value={`${summary.pending_count}건`} color="#f59e0b" />
      </div>

      {/* 칸반 보드 */}
      <div style={s.kanban}>
        {STATUS_COLS.map(col => {
          const colOrders = activeOrders.filter(o => o.status === col.key);
          return (
            <div key={col.key} style={{ ...s.col, background: col.bg }}>
              <div style={{ ...s.colHeader, color: col.color }}>
                {col.label}
                <span style={{ ...s.colBadge, background: col.color }}>{colOrders.length}</span>
              </div>
              <div style={s.colBody}>
                {colOrders.length === 0 && <div style={s.emptyCol}>없음</div>}
                {colOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    accentColor={col.color}
                    onSelect={() => setSelected(order)}
                    onAction={() => changeStatus(order.id, NEXT_STATUS[order.status])}
                    actionLabel={NEXT_LABEL[order.status]}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 주문 상세 모달 */}
      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onAction={(status) => { changeStatus(selected.id, status); setSelected(null); }}
          onPrint={() => doPrint(selected)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={s.summaryCard}>
      <div style={{ ...s.summaryValue, color }}>{value}</div>
      <div style={s.summaryLabel}>{label}</div>
    </div>
  );
}

function OrderCard({ order, accentColor, onSelect, onAction, actionLabel }: {
  order: Order; accentColor: string;
  onSelect: () => void; onAction: () => void; actionLabel: string;
}) {
  const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const timeColor = elapsed >= 5 ? '#ef4444' : elapsed >= 3 ? '#f59e0b' : '#6b7280';

  return (
    <div style={s.card} onClick={onSelect}>
      <div style={s.cardTop}>
        <span style={{ ...s.orderNum, color: accentColor }}>{order.order_number}</span>
        <span style={{ ...s.elapsed, color: timeColor }}>{elapsed}분 전</span>
      </div>
      {order.table_number && <div style={s.tableTag}>🪑 {order.table_number}</div>}
      <div style={s.itemList}>
        {order.items?.slice(0, 3).map((item, i) => (
          <div key={i} style={s.itemRow}>
            <span>{item.menu_name}</span>
            <span style={s.itemQty}>×{item.quantity}</span>
          </div>
        ))}
        {(order.items?.length ?? 0) > 3 && (
          <div style={s.moreItems}>+{order.items.length - 3}개 더</div>
        )}
      </div>
      <div style={s.cardBottom}>
        <span style={s.price}>{fmt(order.total_price)}</span>
        <button
          style={{ ...s.actionBtn, background: accentColor }}
          onClick={e => { e.stopPropagation(); onAction(); }}
        >
          {actionLabel}
        </button>
      </div>
      {order.request_note && <div style={s.note}>📝 {order.request_note}</div>}
    </div>
  );
}

function OrderDetailModal({ order, onClose, onAction, onPrint }: {
  order: Order; onClose: () => void;
  onAction: (status: string) => void;
  onPrint: () => void;
}) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>{order.order_number}</span>
          <button style={s.printBtn} onClick={onPrint}>🖨 재인쇄</button>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={s.modalBody}>
          {order.table_number && <div style={s.detailRow}>🪑 {order.table_number}</div>}
          <div style={s.detailRow}>
            상태: <strong>{order.status}</strong>  |  결제: <strong>{order.payment_status}</strong>
          </div>
          <div style={{ marginTop: 12 }}>
            {order.items?.map((item, i) => (
              <div key={i} style={s.detailItem}>
                <span>{item.menu_name} × {item.quantity}</span>
                <span>{fmt(item.item_total)}</span>
              </div>
            ))}
          </div>
          {order.request_note && <div style={s.note}>📝 {order.request_note}</div>}
          <div style={{ ...s.detailItem, fontWeight: 700, marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            <span>합계</span><span>{fmt(order.total_price)}</span>
          </div>
        </div>
        <div style={s.modalFooter}>
          {NEXT_STATUS[order.status] && (
            <button style={s.primaryBtn} onClick={() => onAction(NEXT_STATUS[order.status])}>
              {NEXT_LABEL[order.status]}
            </button>
          )}
          <button style={s.cancelBtn} onClick={() => onAction('cancelled')}>주문 취소</button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:         { display: 'flex', flexDirection: 'column', gap: 20 },
  loading:      { color: '#94a3b8', padding: 40, textAlign: 'center' },
  printerBar:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px' },
  printerBtn:   { color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  summaryRow:   { display: 'flex', gap: 12 },
  summaryCard:  { flex: 1, background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  summaryValue: { fontSize: 22, fontWeight: 800, marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: '#94a3b8' },
  kanban:       { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, alignItems: 'start' },
  col:          { borderRadius: 14, padding: '14px 10px', minHeight: 200 },
  colHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 14, marginBottom: 10, padding: '0 4px' },
  colBadge:     { color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 12 },
  colBody:      { display: 'flex', flexDirection: 'column', gap: 8 },
  emptyCol:     { textAlign: 'center', color: '#cbd5e1', fontSize: 13, padding: '20px 0' },
  card:         { background: '#fff', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'transform 0.1s', display: 'flex', flexDirection: 'column', gap: 6 },
  cardTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orderNum:     { fontWeight: 800, fontSize: 16 },
  elapsed:      { fontSize: 12, fontWeight: 600 },
  tableTag:     { fontSize: 12, color: '#64748b', background: '#f1f5f9', borderRadius: 6, padding: '2px 8px', alignSelf: 'flex-start' },
  itemList:     { display: 'flex', flexDirection: 'column', gap: 2 },
  itemRow:      { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' },
  itemQty:      { color: '#94a3b8', fontWeight: 600 },
  moreItems:    { fontSize: 12, color: '#94a3b8' },
  cardBottom:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price:        { fontWeight: 700, fontSize: 14, color: '#1e3a5f' },
  actionBtn:    { color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  note:         { fontSize: 12, color: '#94a3b8', background: '#f8fafc', borderRadius: 6, padding: '4px 8px' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:        { background: '#fff', borderRadius: 16, width: '90%', maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '20px 20px 0' },
  printBtn:     { background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', marginLeft: 'auto' },
  modalTitle:   { fontSize: 18, fontWeight: 700 },
  closeBtn:     { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' },
  modalBody:    { padding: '16px 20px', overflowY: 'auto', flex: 1 },
  modalFooter:  { padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  detailRow:    { fontSize: 14, color: '#374151', marginBottom: 4 },
  detailItem:   { display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' },
  primaryBtn:   { background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  cancelBtn:    { background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
