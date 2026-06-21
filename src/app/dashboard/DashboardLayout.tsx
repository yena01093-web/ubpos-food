'use client';
import { useState } from 'react';
import OrdersPanel  from './OrdersPanel';
import TablesPanel  from './TablesPanel';
import RevenuePanel from './RevenuePanel';
import MenuPanel    from './MenuPanel';
import ChannelPanel from './ChannelPanel';

const NAV = [
  { id: 'orders',  label: '📋 주문'   },
  { id: 'tables',  label: '🪑 테이블' },
  { id: 'revenue', label: '📊 매출'   },
  { id: 'menu',    label: '🍔 메뉴'   },
  { id: 'channel', label: '🌐 채널관리' },
];

export default function DashboardLayout({
  storeId, token, onLogout,
}: {
  storeId: string; token: string; onLogout: () => void;
}) {
  const [tab, setTab] = useState<'orders' | 'tables' | 'revenue' | 'menu' | 'channel'>('orders');

  return (
    <div style={s.root}>
      {/* 사이드바 (tablet+) / 하단탭 (mobile) */}
      <aside style={s.sidebar}>
        <div style={s.logo}>ubpos<span style={s.logoAccent}> Food</span></div>
        {NAV.map(n => (
          <button
            key={n.id}
            style={{ ...s.navBtn, ...(tab === n.id ? s.navBtnActive : {}) }}
            onClick={() => setTab(n.id as 'orders'|'tables'|'revenue'|'menu'|'channel')}
          >
            {n.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={s.logoutBtn} onClick={onLogout}>
          🚪 로그아웃
        </button>
      </aside>

      <main style={s.main}>
        <div style={s.statusBar}>🟢 로그인됨</div>
        {tab === 'orders'  && <OrdersPanel  storeId={storeId} token={token} />}
        {tab === 'tables'  && <TablesPanel  storeId={storeId} token={token} />}
        {tab === 'revenue' && <RevenuePanel storeId={storeId} token={token} />}
        {tab === 'menu'    && <MenuPanel    storeId={storeId} token={token} />}
        {tab === 'channel' && <ChannelPanel />}
      </main>

      {/* 모바일 하단 탭 */}
      <nav style={s.mobileNav}>
        {NAV.map(n => (
          <button
            key={n.id}
            style={{ ...s.mobileTab, ...(tab === n.id ? s.mobileTabActive : {}) }}
            onClick={() => setTab(n.id as 'orders'|'tables'|'revenue'|'menu'|'channel')}
          >
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:          { display: 'flex', minHeight: '100dvh', background: '#f1f5f9', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" },
  sidebar:       { width: 200, background: '#1e3a5f', display: 'flex', flexDirection: 'column', padding: '24px 12px', gap: 4, flexShrink: 0 },
  logo:          { fontSize: 20, fontWeight: 800, color: '#fff', padding: '0 12px 24px' },
  logoAccent:    { color: '#60a5fa' },
  navBtn:        { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: 'none', background: 'none', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', width: '100%' },
  navBtnActive:  { background: '#2563eb', color: '#fff' },
  logoutBtn:     { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: '1px solid #334155', background: 'none', color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', width: '100%', marginTop: 8 },
  statusBar:     { fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 12 },
  main:          { flex: 1, overflow: 'auto', padding: '24px' },
  placeholder:   { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontSize: 18, color: '#94a3b8' },
  mobileNav:     { display: 'none' },
};
