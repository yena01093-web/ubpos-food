'use client';
import { useEffect, useState, useCallback } from 'react';

const fmt   = (n: number) => n.toLocaleString('ko-KR') + '원';
const fmtN  = (n: number) => n.toLocaleString('ko-KR');

interface TodaySummary {
  revenue: string; orders: string; avg_price: string;
  card_revenue: string; cash_revenue: string;
}
interface DailyRow   { date: string; revenue: string; orders: string; }
interface MenuRow    { menu_name: string; total_qty: string; total_revenue: string; }
interface HourlyRow  { hour: string; orders: string; }

export default function RevenuePanel({ storeId, token }: { storeId: string; token: string }) {
  const [period,   setPeriod]   = useState<'day'|'week'|'month'>('week');
  const [today,    setToday]    = useState<TodaySummary | null>(null);
  const [daily,    setDaily]    = useState<DailyRow[]>([]);
  const [topMenus, setTopMenus] = useState<MenuRow[]>([]);
  const [hourly,   setHourly]   = useState<HourlyRow[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/dashboard/revenue?storeId=${storeId}&period=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) {
      setToday(data.data.today);
      setDaily(data.data.daily);
      setTopMenus(data.data.topMenus);
      setHourly(data.data.hourly);
    }
    setLoading(false);
  }, [storeId, token, period]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ color:'#94a3b8', padding:40, textAlign:'center' }}>불러오는 중...</div>;

  // 바 차트용 최댓값
  const maxRevenue = Math.max(...daily.map(d => Number(d.revenue)), 1);
  const maxOrders  = Math.max(...hourly.map(h => Number(h.orders)), 1);
  const maxQty     = Math.max(...topMenus.map(m => Number(m.total_qty)), 1);

  return (
    <div style={s.root}>

      {/* 기간 탭 */}
      <div style={s.periodRow}>
        {(['day','week','month'] as const).map(p => (
          <button
            key={p}
            style={{ ...s.periodBtn, ...(period===p ? s.periodActive : {}) }}
            onClick={() => setPeriod(p)}
          >
            {p==='day'?'오늘':p==='week'?'7일':'30일'}
          </button>
        ))}
      </div>

      {/* 오늘 요약 카드 */}
      {today && (
        <div style={s.summaryGrid}>
          <SummaryCard label="매출" value={fmt(Number(today.revenue))}      color="#2563eb" icon="💰" />
          <SummaryCard label="주문"  value={`${fmtN(Number(today.orders))}건`} color="#10b981" icon="📋" />
          <SummaryCard label="평균단가" value={fmt(Math.round(Number(today.avg_price)))} color="#8b5cf6" icon="📊" />
          <SummaryCard label="카드"  value={fmt(Number(today.card_revenue))} color="#f59e0b" icon="💳" />
        </div>
      )}

      <div style={s.twoCol}>
        {/* 일별 매출 바 차트 */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>📈 일별 매출</h3>
          <div style={s.barChart}>
            {daily.length === 0 && <div style={s.empty}>데이터 없음</div>}
            {daily.map(row => {
              const pct = (Number(row.revenue) / maxRevenue) * 100;
              const label = row.date.slice(5); // MM-DD
              return (
                <div key={row.date} style={s.barGroup}>
                  <div style={s.barWrap}>
                    <div style={{ ...s.bar, height: `${Math.max(pct, 2)}%`, background: '#2563eb' }} />
                  </div>
                  <div style={s.barLabel}>{label}</div>
                  <div style={s.barValue}>{Number(row.revenue) > 0 ? `${Math.round(Number(row.revenue)/1000)}k` : '-'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 시간대별 주문 분포 */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>🕐 시간대별 주문</h3>
          <div style={s.barChart}>
            {hourly.length === 0 && <div style={s.empty}>데이터 없음</div>}
            {Array.from({ length: 24 }, (_, h) => {
              const row  = hourly.find(r => Number(r.hour) === h);
              const cnt  = row ? Number(row.orders) : 0;
              const pct  = (cnt / maxOrders) * 100;
              const peak = cnt === maxOrders && cnt > 0;
              return (
                <div key={h} style={s.barGroup}>
                  <div style={s.barWrap}>
                    <div style={{
                      ...s.bar,
                      height: `${Math.max(pct, cnt > 0 ? 4 : 0)}%`,
                      background: peak ? '#ef4444' : '#10b981',
                    }} />
                  </div>
                  <div style={s.barLabel}>{h}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 메뉴별 판매 순위 */}
      <div style={s.chartCard}>
        <h3 style={s.chartTitle}>🏆 메뉴 판매 순위</h3>
        {topMenus.length === 0 && <div style={s.empty}>데이터 없음</div>}
        {topMenus.map((menu, i) => {
          const pct = (Number(menu.total_qty) / maxQty) * 100;
          return (
            <div key={menu.menu_name} style={s.rankRow}>
              <span style={{ ...s.rankNum, color: i < 3 ? ['#f59e0b','#94a3b8','#cd7f32'][i] : '#cbd5e1' }}>
                {i+1}
              </span>
              <div style={s.rankBarWrap}>
                <div style={s.rankNameRow}>
                  <span style={s.rankName}>{menu.menu_name}</span>
                  <span style={s.rankStat}>{fmtN(Number(menu.total_qty))}개 · {fmt(Number(menu.total_revenue))}</span>
                </div>
                <div style={s.rankBg}>
                  <div style={{ ...s.rankBar, width:`${pct}%`, background: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#cd7f32':'#2563eb' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

function SummaryCard({ label, value, color, icon }: { label:string; value:string; color:string; icon:string }) {
  return (
    <div style={s.summaryCard}>
      <div style={s.summaryIcon}>{icon}</div>
      <div style={{ ...s.summaryValue, color }}>{value}</div>
      <div style={s.summaryLabel}>{label}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:         { display:'flex', flexDirection:'column', gap:20 },
  periodRow:    { display:'flex', gap:8 },
  periodBtn:    { padding:'8px 20px', borderRadius:20, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, fontWeight:600, color:'#64748b', cursor:'pointer' },
  periodActive: { background:'#1e3a5f', color:'#fff', border:'1.5px solid #1e3a5f' },
  summaryGrid:  { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 },
  summaryCard:  { background:'#fff', borderRadius:14, padding:'18px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', display:'flex', flexDirection:'column', gap:4 },
  summaryIcon:  { fontSize:22, marginBottom:4 },
  summaryValue: { fontSize:20, fontWeight:800 },
  summaryLabel: { fontSize:12, color:'#94a3b8' },
  twoCol:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  chartCard:    { background:'#fff', borderRadius:14, padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  chartTitle:   { fontSize:15, fontWeight:700, color:'#1e3a5f', marginBottom:16 },
  empty:        { color:'#cbd5e1', textAlign:'center', padding:'24px 0', fontSize:14 },
  barChart:     { display:'flex', alignItems:'flex-end', gap:4, height:140, borderBottom:'1px solid #f1f5f9', paddingBottom:4 },
  barGroup:     { display:'flex', flexDirection:'column', alignItems:'center', flex:1, gap:2 },
  barWrap:      { flex:1, width:'100%', display:'flex', alignItems:'flex-end', justifyContent:'center' },
  bar:          { width:'70%', borderRadius:'3px 3px 0 0', transition:'height 0.4s ease', minHeight:0 },
  barLabel:     { fontSize:10, color:'#94a3b8', textAlign:'center' },
  barValue:     { fontSize:9, color:'#64748b', textAlign:'center' },
  rankRow:      { display:'flex', alignItems:'center', gap:12, marginBottom:12 },
  rankNum:      { fontSize:18, fontWeight:900, width:24, textAlign:'center', flexShrink:0 },
  rankBarWrap:  { flex:1 },
  rankNameRow:  { display:'flex', justifyContent:'space-between', marginBottom:4 },
  rankName:     { fontSize:14, fontWeight:600, color:'#1e293b' },
  rankStat:     { fontSize:12, color:'#94a3b8' },
  rankBg:       { height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' },
  rankBar:      { height:'100%', borderRadius:4, transition:'width 0.5s ease' },
};
