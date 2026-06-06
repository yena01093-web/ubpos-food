'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';

export default function DashboardPage() {
  const [auth,    setAuth]    = useState<{ token: string; storeId: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // 로그인 폼 상태
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [logging,  setLogging]  = useState(false);

  useEffect(() => {
    // localStorage에서 토큰 복원
    const token   = localStorage.getItem('ubpos_token');
    const storeId = localStorage.getItem('ubpos_store');
    if (token && storeId) setAuth({ token, storeId });
    setLoading(false);
  }, []);

  const login = async () => {
    setLogging(true); setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const storeId = data.data.user.storeIds?.[0] ?? '';
      localStorage.setItem('ubpos_token', data.data.accessToken);
      localStorage.setItem('ubpos_store', storeId);
      setAuth({ token: data.data.accessToken, storeId });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로그인 실패');
    } finally {
      setLogging(false);
    }
  };

  if (loading) return null;

  if (!auth) {
    return (
      <div style={s.loginWrap}>
        <div style={s.loginBox}>
          <div style={s.loginLogo}>ubpos <span style={{ color: '#2563eb' }}>Food</span></div>
          <div style={s.loginSub}>사장님 대시보드</div>
          <input
            style={s.input}
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            style={s.input}
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          {error && <div style={s.error}>{error}</div>}
          <button style={s.loginBtn} onClick={login} disabled={logging}>
            {logging ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
    );
  }

  return <DashboardLayout storeId={auth.storeId} token={auth.token} />;
}

const s: Record<string, React.CSSProperties> = {
  loginWrap:  { minHeight: '100dvh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" },
  loginBox:   { background: '#fff', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12 },
  loginLogo:  { fontSize: 28, fontWeight: 800, color: '#1e3a5f', marginBottom: 4 },
  loginSub:   { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  input:      { padding: '13px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', width: '100%' },
  loginBtn:   { background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  error:      { color: '#ef4444', fontSize: 13, textAlign: 'center' },
};
