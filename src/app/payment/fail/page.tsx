'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FailContent() {
  const params = useSearchParams();
  const msg    = params.get('msg') ?? '결제가 취소되었습니다';

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.icon}>❌</div>
        <div style={s.title}>결제 실패</div>
        <div style={s.msg}>{msg}</div>
        <button style={s.btn} onClick={() => window.history.back()}>
          돌아가기
        </button>
      </div>
    </div>
  );
}

export default function PaymentFail() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}>로딩 중...</div>}>
      <FailContent />
    </Suspense>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100dvh', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" },
  card: { background: '#fff', borderRadius: 20, padding: '48px 36px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 360, width: '90%' },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 800, color: '#ef4444', marginBottom: 12 },
  msg: { fontSize: 15, color: '#6b7280', marginBottom: 24 },
  btn: { background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
};
