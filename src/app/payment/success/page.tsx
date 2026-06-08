'use client';
import { useEffect, useState } from 'react';

export default function PaymentSuccess() {
  const [orderId, setOrderId] = useState('');
  const [status,  setStatus]  = useState('accepted');

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const oid     = params.get('orderId') ?? '';
    setOrderId(oid);

    if (!oid) return;
    const poll = setInterval(async () => {
      try {
        const res  = await fetch(`/api/orders/${oid}`);
        const data = await res.json();
        if (data.data?.status) setStatus(data.data.status);
        if (['completed','cancelled'].includes(data.data?.status)) clearInterval(poll);
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, []);

  const statusLabel: Record<string, string> = {
    accepted:  '✅ 주문이 접수되었습니다',
    cooking:   '👨‍🍳 조리 중입니다',
    ready:     '🔔 준비 완료! 서빙 중입니다',
    completed: '🎉 식사 맛있게 하세요!',
  };

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.icon}>🎉</div>
        <div style={s.title}>결제 완료!</div>
        <div style={s.status}>{statusLabel[status] ?? '주문 완료'}</div>
        <div style={s.sub}>잠시 후 음식이 준비됩니다</div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:   { minHeight: '100dvh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" },
  card:   { background: '#fff', borderRadius: 20, padding: '48px 36px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 360, width: '90%' },
  icon:   { fontSize: 56, marginBottom: 16 },
  title:  { fontSize: 24, fontWeight: 800, color: '#1e3a5f', marginBottom: 12 },
  status: { fontSize: 16, fontWeight: 600, color: '#059669', marginBottom: 8 },
  sub:    { fontSize: 14, color: '#94a3b8' },
};
