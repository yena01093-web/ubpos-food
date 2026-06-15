'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

interface Category { id: string; name: string; sort_order: number; }
interface Menu {
  id: string; category_id: string | null; name: string;
  description: string | null; price: number; image_url: string | null;
  is_soldout: boolean; is_active: boolean; sort_order: number;
}

export default function MenuPanel({ storeId, token }: { storeId: string; token: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menus,      setMenus]      = useState<Menu[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeCat,  setActiveCat]  = useState<string>('all');

  // 등록 폼
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name:'', price:'', description:'', categoryId:'' });
  const [saving,   setSaving]   = useState(false);

  // 이미지 업로드
  const fileInputRef                          = useRef<HTMLInputElement>(null);
  const [targetMenuId, setTargetMenuId]       = useState<string | null>(null);
  const [uploading,    setUploading]          = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const res  = await fetch(`/api/dashboard/menu?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) {
      setCategories(data.data.categories);
      setMenus(data.data.menus);
      if (!activeCat && data.data.categories[0]) setActiveCat(data.data.categories[0].id);
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
    setMenus(prev => prev.map(m => m.id === menuId ? { ...m, is_soldout: !current } : m));
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

  // ── 이미지 업로드 ─────────────────────────────────────────────
  const openFilePicker = (menuId: string) => {
    setTargetMenuId(menuId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 가능하도록 초기화
    if (!file || !targetMenuId) return;

    const menuId = targetMenuId;
    setTargetMenuId(null);
    setUploading(prev => ({ ...prev, [menuId]: true }));

    try {
      // 1) 이미지 업로드
      const fd = new FormData();
      fd.append('file',   file);
      fd.append('menuId', menuId);

      const upRes  = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const upData = await upRes.json();
      if (!upData.ok) throw new Error(upData.message ?? '업로드 실패');

      // 2) 메뉴 image_url 저장
      const patchRes  = await fetch(`/api/dashboard/menu/${menuId}`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ image_url: upData.data.imageUrl }),
      });
      const patchData = await patchRes.json();
      if (!patchData.ok) throw new Error(patchData.message ?? '저장 실패');

      setMenus(prev => prev.map(m =>
        m.id === menuId ? { ...m, image_url: upData.data.imageUrl } : m
      ));
    } catch (err) {
      alert('업로드 오류: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setUploading(prev => ({ ...prev, [menuId]: false }));
    }
  };

  const filtered = activeCat === 'all'
    ? menus.filter(m => m.is_active)
    : menus.filter(m => m.is_active && m.category_id === activeCat);

  if (loading) return <div style={{ color:'#94a3b8', padding:40, textAlign:'center' }}>불러오는 중...</div>;

  return (
    <div style={s.root}>
      {/* 숨김 파일 input (공유) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display:'none' }}
        onChange={handleFileChange}
      />

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
        {filtered.map(menu => {
          const isUploading = !!uploading[menu.id];
          return (
            <div key={menu.id} style={{ ...s.menuRow, ...(menu.is_soldout ? s.menuRowSoldout : {}) }}>
              {/* 썸네일 */}
              <div style={s.thumbWrap}>
                {isUploading ? (
                  <div style={s.thumbLoading}>
                    <span style={s.spinner} />
                  </div>
                ) : menu.image_url ? (
                  <img src={menu.image_url} alt={menu.name} style={s.thumb} />
                ) : (
                  <div style={s.thumbEmpty}>🍽️</div>
                )}
              </div>

              {/* 정보 */}
              <div style={s.menuInfo}>
                <span style={s.menuName}>{menu.name}</span>
                {menu.description && <span style={s.menuDesc}>{menu.description}</span>}
              </div>

              {/* 우측 액션 */}
              <div style={s.menuRight}>
                <span style={s.menuPrice}>{fmt(menu.price)}</span>
                <button
                  style={s.imgBtn}
                  onClick={() => openFilePicker(menu.id)}
                  disabled={isUploading}
                  title="이미지 업로드"
                >
                  {isUploading ? '업로드 중…' : menu.image_url ? '🖼 변경' : '📷 이미지'}
                </button>
                <button
                  style={{ ...s.toggleBtn, ...(menu.is_soldout ? s.soldoutOn : s.soldoutOff) }}
                  onClick={() => toggleSoldout(menu.id, menu.is_soldout)}
                >
                  {menu.is_soldout ? '품절 해제' : '품절'}
                </button>
                <button style={s.delBtn} onClick={() => deleteMenu(menu.id)}>삭제</button>
              </div>
            </div>
          );
        })}
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
  input:          { padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' },
  saveBtn:        { background:'#1e3a5f', color:'#fff', border:'none', borderRadius:10, padding:'12px 28px', fontSize:14, fontWeight:700, cursor:'pointer' },

  menuList:       { display:'flex', flexDirection:'column', gap:8 },
  empty:          { color:'#cbd5e1', textAlign:'center', padding:'40px 0', fontSize:14 },
  menuRow:        { background:'#fff', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' },
  menuRowSoldout: { opacity:0.55 },

  thumbWrap:      { width:56, height:56, borderRadius:10, overflow:'hidden', flexShrink:0, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' },
  thumb:          { width:'100%', height:'100%', objectFit:'cover' },
  thumbEmpty:     { fontSize:22, userSelect:'none' },
  thumbLoading:   { width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9' },
  spinner:        { width:20, height:20, border:'3px solid #e2e8f0', borderTop:'3px solid #2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' },

  menuInfo:       { display:'flex', flexDirection:'column', gap:3, flex:1, minWidth:0 },
  menuName:       { fontSize:15, fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  menuDesc:       { fontSize:12, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },

  menuRight:      { display:'flex', alignItems:'center', gap:8, flexShrink:0 },
  menuPrice:      { fontSize:15, fontWeight:700, color:'#2563eb', minWidth:70, textAlign:'right' },
  imgBtn:         { background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, color:'#475569', cursor:'pointer', whiteSpace:'nowrap' },
  toggleBtn:      { border:'none', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer' },
  soldoutOn:      { background:'#fee2e2', color:'#ef4444' },
  soldoutOff:     { background:'#f1f5f9', color:'#64748b' },
  delBtn:         { background:'none', border:'none', color:'#cbd5e1', fontSize:13, cursor:'pointer', padding:'4px 8px' },
};
