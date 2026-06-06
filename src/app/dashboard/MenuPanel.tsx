'use client';
import { useEffect, useState, useCallback } from 'react';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

interface Category { id: string; name: string; sort_order: number; }
interface Menu {
  id: string; category_id: string | null; name: string;
  description: string | null; price: number;
  is_soldout: boolean; is_active: boolean; sort_order: number;
}

export default function MenuPanel({ storeId, token }: { storeId: string; token: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menus,      setMenus]      = useState<Menu[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeCat,  setActiveCat]  = useState<string>('all');

  // 등록 폼
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ name:'', price:'', description:'', categoryId:'' });
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    const res  = await fetch(`/api/dashboard/menu?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) {
      setCategories(data.data.categories);
      setMenus(data.data.menus);
      if (!activeCat && data.data.categories[0]) {
        setActiveCat(data.data.categories[0].id);
      }
    }
    setLoading(false);
  }, [storeId, token, activeCat]);

  useEffect(() => { load(); }, [load]);

  const toggleSoldout = async (menuId: string, current: boolean) => {
    await fetch(`/api/dashboard/menu/${menuId}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ is_soldout: !current }),
    });
    setMenus(prev => prev.map(m => m.id===menuId ? { ...m, is_soldout: !current } : m));
  };

  const deleteMenu = async (menuId: string) => {
    if (!confirm('메뉴를 삭제할까요? (주문 이력은 보존됩니다)')) return;
    await fetch(`/api/dashboard/menu/${menuId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setMenus(prev => prev.filter(m => m.id !== menuId));
  };

  const addMenu = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    const res = await fetch('/api/dashboard/menu', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({
        storeId, name: form.name,
        price: Number(form.price),
        description: form.description || null,
        categoryId: form.categoryId || null,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      await load();
      setForm({ name:'', price:'', description:'', categoryId:'' });
      setShowForm(false);
    }
    setSaving(false);
  };

  const filtered = activeCat === 'all'
    ? menus.filter(m => m.is_active)
    : menus.filter(m => m.is_active && m.category_id === activeCat);

  if (loading) return <div style={{ color:'#94a3b8', padding:40, textAlign:'center' }}>불러오는 중...</div>;

  return (
    <div style={s.root}>
      <div style={s.topBar}>
        <div style={s.catTabs}>
          <button
            style={{ ...s.catTab, ...(activeCat==='all' ? s.catActive : {}) }}
            onClick={() => setActiveCat('all')}
          >
            전체 ({menus.filter(m=>m.is_active).length})
          </button>
          {categories.map(cat => {
            const cnt = menus.filter(m => m.is_active && m.category_id===cat.id).length;
            return (
              <button
                key={cat.id}
                style={{ ...s.catTab, ...(activeCat===cat.id ? s.catActive : {}) }}
                onClick={() => setActiveCat(cat.id)}
              >
                {cat.name} ({cnt})
              </button>
            );
          })}
        </div>
        <button style={s.addBtn} onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ 닫기' : '＋ 메뉴 추가'}
        </button>
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>새 메뉴 등록</h3>
          <div style={s.formGrid}>
            <input
              style={s.input} placeholder="메뉴명 *"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              style={s.input} placeholder="가격 (원) *" type="number"
              value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            />
            <select
              style={s.input}
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">카테고리 선택</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              style={s.input} placeholder="설명 (선택)"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <button style={s.saveBtn} onClick={addMenu} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}

      {/* 메뉴 목록 */}
      <div style={s.menuList}>
        {filtered.length === 0 && (
          <div style={s.empty}>메뉴가 없습니다</div>
        )}
        {filtered.map(menu => (
          <div key={menu.id} style={{ ...s.menuRow, ...(menu.is_soldout ? s.menuRowSoldout : {}) }}>
            <div style={s.menuInfo}>
              <span style={s.menuName}>{menu.name}</span>
              {menu.description && <span style={s.menuDesc}>{menu.description}</span>}
            </div>
            <div style={s.menuRight}>
              <span style={s.menuPrice}>{fmt(menu.price)}</span>
              <button
                style={{ ...s.toggleBtn, ...(menu.is_soldout ? s.soldoutOn : s.soldoutOff) }}
                onClick={() => toggleSoldout(menu.id, menu.is_soldout)}
              >
                {menu.is_soldout ? '품절 해제' : '품절'}
              </button>
              <button style={s.delBtn} onClick={() => deleteMenu(menu.id)}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:           { display:'flex', flexDirection:'column', gap:16 },
  topBar:         { display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' },
  catTabs:        { display:'flex', gap:6, flexWrap:'wrap' },
  catTab:         { padding:'7px 16px', borderRadius:20, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, fontWeight:600, color:'#64748b', cursor:'pointer' },
  catActive:      { background:'#1e3a5f', color:'#fff', border:'1.5px solid #1e3a5f' },
  addBtn:         { background:'#2563eb', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontSize:14, fontWeight:700, cursor:'pointer' },
  formCard:       { background:'#fff', borderRadius:14, padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  formTitle:      { fontSize:15, fontWeight:700, color:'#1e3a5f', marginBottom:14 },
  formGrid:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 },
  input:          { padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', width:'100%' },
  saveBtn:        { background:'#1e3a5f', color:'#fff', border:'none', borderRadius:10, padding:'12px 28px', fontSize:14, fontWeight:700, cursor:'pointer' },
  menuList:       { display:'flex', flexDirection:'column', gap:8 },
  empty:          { color:'#cbd5e1', textAlign:'center', padding:'40px 0', fontSize:14 },
  menuRow:        { background:'#fff', borderRadius:12, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', gap:12 },
  menuRowSoldout: { opacity:0.55 },
  menuInfo:       { display:'flex', flexDirection:'column', gap:3 },
  menuName:       { fontSize:15, fontWeight:600, color:'#1e293b' },
  menuDesc:       { fontSize:12, color:'#94a3b8' },
  menuRight:      { display:'flex', alignItems:'center', gap:10, flexShrink:0 },
  menuPrice:      { fontSize:15, fontWeight:700, color:'#2563eb', minWidth:70, textAlign:'right' },
  toggleBtn:      { border:'none', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer' },
  soldoutOn:      { background:'#fee2e2', color:'#ef4444' },
  soldoutOff:     { background:'#f1f5f9', color:'#64748b' },
  delBtn:         { background:'none', border:'none', color:'#cbd5e1', fontSize:13, cursor:'pointer', padding:'4px 8px' },
};
