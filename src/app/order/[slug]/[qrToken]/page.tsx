'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/components/useCart';
import type { CategoryWithMenus, MenuWithOptions } from '@/types';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';
const PROMO_SEARCHES = ['디럭스 치즈 치킨버거 세트', '오리지널 한마리'];
const STORE_LEGAL = {
  name:   '슈퍼크리스피 제천점',
  ceo:    '박선호',
  bizNo:  '207-11-50669',
  address:'충북 제천시 의림대로 342 1층',
  tel:    '043-756-8077',
};

// shimmer 애니메이션을 head에 주입
function injectShimmer() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('shimmer-style')) return;
  const s = document.createElement('style');
  s.id = 'shimmer-style';
  s.textContent = `@keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`;
  document.head.appendChild(s);
}

export default function OrderPage({ params }: { params: { slug: string; qrToken: string } }) {
  const { slug, qrToken } = params;
  const isTakeout = !qrToken;
  const cart = useCart();

  const [store,      setStore]      = useState<{ id: string; name: string; notice: string | null; is_open: boolean } | null>(null);
  const [table,      setTable]      = useState<{ id: string; table_number: string } | null>(null);
  const [categories, setCategories] = useState<CategoryWithMenus[]>([]);
  const [banners,    setBanners]    = useState<{ id: string; image_url: string; sort_order: number }[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activecat,  setActivecat]  = useState('');
  const [selectedMenu, setSelectedMenu] = useState<MenuWithOptions | null>(null);
  const [showCart,     setShowCart]     = useState(false);
  const [orderStep,    setOrderStep]    = useState<'menu' | 'confirm' | 'payment' | 'done'>('menu');
  const [orderId,      setOrderId]      = useState('');
  const [requestNote,  setRequestNote]  = useState('');
  const [payLoading,   setPayLoading]   = useState(false);
  const [error,        setError]        = useState('');
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const promoMenus = useMemo(() => {
    const all = categories.flatMap(c => c.menus);
    return PROMO_SEARCHES.map(s => all.find(m => m.name.includes(s))).filter((m): m is MenuWithOptions => !!m);
  }, [categories]);

  useEffect(() => {
    injectShimmer();
    if (document.getElementById('nicepay-sdk')) return;
    const script = document.createElement('script');
    script.id = 'nicepay-sdk';
    script.src = 'https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js';
    script.type = 'text/javascript';
    script.async = false;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const menuRes  = await fetch(`/api/store/${slug}/menu`);
        const menuData = await menuRes.json();
        if (!menuRes.ok) throw new Error(menuData.message);
        setStore(menuData.data.store);
        setCategories(menuData.data.categories);
        setBanners(menuData.data.banners ?? []);
        setActivecat(menuData.data.categories[0]?.id ?? '');
        if (!isTakeout) {
          const tableRes  = await fetch(`/api/store/${slug}/table/${qrToken}`);
          const tableData = await tableRes.json();
          if (!tableRes.ok) throw new Error(tableData.message);
          setTable(tableData.data.table);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '메뉴를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, qrToken, isTakeout]);

  const scrollTocat = (id: string) => {
    setActivecat(id);
    catRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitOrder = async () => {
    if (!isTakeout && !table) return;
    setPayLoading(true); setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store?.id,
          tableId: isTakeout ? undefined : table?.id,
          type: isTakeout ? 'takeout' : 'dine_in',
          items: cart.items.map(i => ({ menuId: i.menuId, quantity: i.quantity, selectedOptionIds: i.options.map(o => o.id) })),
          requestNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrderId(data.data.order.id);
      setOrderStep('payment');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '주문 중 오류가 발생했습니다');
    } finally { setPayLoading(false); }
  };

  const processPayment = async () => {
    setPayLoading(true); setError('');
    try {
      const sdRes  = await fetch('/api/payment/signdata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
      const sdData = await sdRes.json();
      if (!sdRes.ok) throw new Error(sdData.message);
      const { mid, amt, moid, goodsName, ediDate, signData } = sdData.data;
      const returnURL = `${window.location.origin}/api/payment/result`;
      const form = document.createElement('form');
      form.name = 'payForm'; form.method = 'post'; form.action = returnURL; form.acceptCharset = 'euc-kr';
      const fields: Record<string, string> = { PayMethod: 'CARD', GoodsName: goodsName, Amt: amt, MID: mid, Moid: moid, ReturnURL: returnURL, CharSet: 'utf-8', EdiDate: ediDate, SignData: signData, GoodsCl: '1', TransType: '0' };
      Object.entries(fields).forEach(([k, v]) => { const input = document.createElement('input'); input.type = 'hidden'; input.name = k; input.value = v; form.appendChild(input); });
      document.body.appendChild(form);
      const waitGoPay = () => new Promise<void>((resolve, reject) => {
        let tries = 0;
        const check = setInterval(() => { tries++; if (typeof (window as any).goPay === 'function') { clearInterval(check); resolve(); } else if (tries > 20) { clearInterval(check); reject(new Error('결제 모듈 로딩 실패')); } }, 200);
      });
      await waitGoPay();
      (window as any).goPay(form);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : '결제 중 오류가 발생했습니다'); setPayLoading(false); }
  };

  if (loading) return <LoadingScreen />;
  if (error && !store) return <ErrorScreen message={error} />;

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <span style={styles.storeName}>{store?.name}</span>
          <span style={styles.tableBadge}>{isTakeout ? '📦 포장' : `🪑 ${table?.table_number}`}</span>
        </div>
        {store?.notice && <div style={styles.notice}>📢 {store.notice}</div>}
      </header>
      {(banners.length > 0 || promoMenus.length > 0) && <PromoBanner menus={promoMenus} banners={banners} onSelect={menu => !menu.is_soldout && setSelectedMenu(menu)} />}
      <nav style={styles.catNav}>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => scrollTocat(cat.id)} style={styles.catTab}>
            <div style={{ ...styles.catTabImgBox, outline: activecat === cat.id ? '2.5px solid #E8560A' : '2.5px solid transparent', outlineOffset: '2px' }}>
              {cat.image_url ? <img src={cat.image_url} alt={cat.name} style={styles.catTabImg} /> : <div style={{ ...styles.catTabFallback, background: activecat === cat.id ? '#E8560A' : '#f3f4f6', color: activecat === cat.id ? '#fff' : '#9ca3af' }}>{cat.name[0]}</div>}
            </div>
            <span style={{ ...styles.catTabText, color: activecat === cat.id ? '#E8560A' : '#6b7280', fontWeight: activecat === cat.id ? 700 : 500 }}>{cat.name}</span>
          </button>
        ))}
      </nav>
      <main style={styles.main}>
        <BrandHero categories={categories} />
        {categories.map(cat => (
          <div key={cat.id} ref={el => { catRefs.current[cat.id] = el; }} style={styles.catSection}>
            <h2 style={styles.catTitle}>{cat.name} <span style={styles.catCount}>{cat.menus.length}</span></h2>
            <div style={styles.menuGrid}>
              {cat.menus.map(menu => <MenuCard key={menu.id} menu={menu} onSelect={() => !menu.is_soldout && setSelectedMenu(menu)} />)}
            </div>
          </div>
        ))}
        <StoreFooter />
        <div style={{ height: 100 }} />
      </main>
      {cart.totalCount > 0 && !showCart && <button style={styles.cartFloat} onClick={() => setShowCart(true)}>🛒 {cart.totalCount}개 · {fmt(cart.totalPrice)}</button>}
      {selectedMenu && <OptionModal menu={selectedMenu} onClose={() => setSelectedMenu(null)} onAdd={(item) => { cart.addItem(item); setSelectedMenu(null); }} />}
      {showCart && <CartModal cart={cart} requestNote={requestNote} onNoteChange={setRequestNote} onClose={() => setShowCart(false)} onOrder={() => { setShowCart(false); setOrderStep('confirm'); }} />}
      {orderStep === 'confirm' && <ConfirmModal cart={cart} requestNote={requestNote} loading={payLoading} error={error} onClose={() => setOrderStep('menu')} onSubmit={submitOrder} />}
      {orderStep === 'payment' && <PaymentModal amount={cart.totalPrice} loading={payLoading} error={error} onPay={processPayment} onBack={() => setOrderStep('confirm')} />}
      {orderStep === 'done' && <DoneModal orderId={orderId} onClose={() => setOrderStep('menu')} />}
    </div>
  );
}

function BrandHero({ categories }: { categories: CategoryWithMenus[] }) {
  const chickenCat = categories.find(c => c.name === '치킨') ?? categories[0];
  const menus = (chickenCat?.menus ?? []).filter(m => m.image_url).slice(0, 8);
  if (!menus.length) return null;
  return (
    <div style={{ background: '#1C0400', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '18px 16px 8px', gap: 12 }}>
        <div>
          <div style={{ fontSize: 33, fontWeight: 900, color: '#FFC300', lineHeight: 0.92, letterSpacing: -1 }}>SUPER</div>
          <div style={{ fontSize: 33, fontWeight: 900, color: '#FFC300', lineHeight: 0.92, letterSpacing: -1 }}>CRISPY</div>
          <div style={{ fontSize: 25, fontWeight: 900, color: '#fff', lineHeight: 1.2, letterSpacing: -0.5 }}>CHICKEN</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#E8560A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: '#fff', alignSelf: 'flex-start' }}>{chickenCat?.name ?? ''}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 16px 18px' }}>
        {menus.map(m => (
          <div key={m.id} style={{ flexShrink: 0, width: 84, textAlign: 'center' }}>
            <div style={{ width: 84, height: 84, borderRadius: 12, overflow: 'hidden', border: '1.5px solid rgba(255,195,0,0.25)' }}>
              <img src={m.image_url!} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} draggable={false} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 5, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromoBanner({ menus, banners = [], onSelect }: { menus: MenuWithOptions[]; banners?: { id: string; image_url: string; sort_order: number }[]; onSelect: (menu: MenuWithOptions) => void; }) {
  const useCustom = banners.length > 0;
  const count = useCustom ? banners.length : menus.length;
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  useEffect(() => { if (count < 2) return; const t = setInterval(() => setIdx(i => (i + 1) % count), 4500); return () => clearInterval(t); }, [count]);
  const go = (next: number) => setIdx(((next % count) + count) % count);
  return (
    <div style={{ overflow: 'hidden', position: 'relative', background: '#111', userSelect: 'none' }} onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }} onTouchEnd={e => { if (touchStartX.current === null) return; const dx = touchStartX.current - e.changedTouches[0].clientX; if (Math.abs(dx) > 40) go(idx + (dx > 0 ? 1 : -1)); touchStartX.current = null; }}>
      <div style={{ display: 'flex', transform: `translateX(-${idx * 100}%)`, transition: 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)', willChange: 'transform' }}>
        {useCustom ? banners.map(b => (<div key={b.id} style={{ flexShrink: 0, width: '100%', height: 230, position: 'relative' }}><img src={b.image_url} alt="배너" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} draggable={false} /></div>))
          : menus.map(menu => (
            <div key={menu.id} style={{ flexShrink: 0, width: '100%', height: 230, position: 'relative', cursor: 'pointer' }} onClick={() => onSelect(menu)}>
              {menu.image_url ? <img src={menu.image_url} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} draggable={false} /> : <div style={{ width: '100%', height: '100%', background: '#E8560A' }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(170deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.88) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', letterSpacing: 1.5, marginBottom: 7 }}>🔥 TODAY'S SPECIAL</div>
                <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 10 }}>{menu.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24' }}>{fmt(menu.price)}</div>
                  <div style={{ background: '#f97316', color: '#fff', borderRadius: 50, padding: '9px 20px', fontSize: 13, fontWeight: 700, boxShadow: '0 3px 12px rgba(249,115,22,0.55)' }}>담기 →</div>
                </div>
              </div>
            </div>
          ))}
      </div>
      {count > 1 && (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: count }).map((_, i) => <button key={i} onClick={e => { e.stopPropagation(); go(i); }} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4, background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.3s ease' }} />)}
        </div>
      )}
    </div>
  );
}

function MenuCard({ menu, onSelect }: { menu: MenuWithOptions; onSelect: () => void }) {
  return (
    <button style={{ ...styles.menuCard, ...(menu.is_soldout ? styles.menuCardSoldout : {}) }} onClick={onSelect} disabled={menu.is_soldout}>
      {menu.image_url && (<div style={styles.menuImgWrap}><img src={menu.image_url} alt={menu.name} style={styles.menuImg} />{menu.is_soldout && <div style={styles.soldoutOverlay}>품절</div>}</div>)}
      <div style={styles.menuInfo}>
        <span style={styles.menuName}>{menu.name}</span>
        {menu.description && <span style={styles.menuDesc}>{menu.description}</span>}
        <span style={styles.menuPrice}>{fmt(menu.price)}</span>
      </div>
      {!menu.is_soldout && <div style={styles.addCircle} aria-hidden="true">＋</div>}
    </button>
  );
}

function OptionModal({ menu, onClose, onAdd }: { menu: MenuWithOptions; onClose: () => void; onAdd: (item: { menuId: string; name: string; unitPrice: number; quantity: number; options: { id: string; name: string; extra_price: number }[] }) => void; }) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const toggleOpt = (groupId: string, optId: string, max: number) => { setSelected(prev => { const cur = prev[groupId] ?? []; if (cur.includes(optId)) return { ...prev, [groupId]: cur.filter(id => id !== optId) }; if (max === 1) return { ...prev, [groupId]: [optId] }; if (cur.length >= max) return prev; return { ...prev, [groupId]: [...cur, optId] }; }); };
  const allOptions = menu.option_groups.flatMap(g => (g.options ?? []).filter(o => (selected[g.id] ?? []).includes(o.id)));
  const optExtra = allOptions.reduce((s, o) => s + o.extra_price, 0);
  const total = (menu.price + optExtra) * qty;
  const canOrder = menu.option_groups.filter(g => g.is_required).every(g => (selected[g.id]?.length ?? 0) > 0);
  const handleAdd = () => { onAdd({ menuId: menu.id, name: menu.name, unitPrice: menu.price, quantity: qty, options: allOptions.map(o => ({ id: o.id, name: o.name, extra_price: o.extra_price })) }); };
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}><span style={styles.modalTitle}>{menu.name}</span><button style={styles.closeBtn} onClick={onClose}>✕</button></div>
        <div style={styles.modalBody}>
          {menu.option_groups.map(group => (
            <div key={group.id} style={styles.optGroup}>
              <div style={styles.optGroupHeader}><span style={styles.optGroupName}>{group.name}</span><span style={styles.optBadge}>{group.is_required ? '필수' : '선택'}{group.max_select > 1 ? ` (최대 ${group.max_select})` : ''}</span></div>
              {(group.options ?? []).map(opt => { const checked = (selected[group.id] ?? []).includes(opt.id); return (<button key={opt.id} style={{ ...styles.optItem, ...(checked ? styles.optItemSelected : {}) }} onClick={() => toggleOpt(group.id, opt.id, group.max_select)} disabled={opt.is_soldout}><span>{opt.name}{opt.is_soldout ? ' (품절)' : ''}</span>{opt.extra_price > 0 && <span style={styles.optPrice}>+{fmt(opt.extra_price)}</span>}</button>); })}
            </div>
          ))}
          <div style={styles.qtyRow}><button style={styles.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>－</button><span style={styles.qtyNum}>{qty}</span><button style={styles.qtyBtn} onClick={() => setQty(q => q + 1)}>＋</button></div>
        </div>
        <div style={styles.modalFooter}><button style={{ ...styles.addBtn, ...(!canOrder ? styles.addBtnDisabled : {}) }} onClick={handleAdd} disabled={!canOrder}>{fmt(total)} 담기</button></div>
      </div>
    </div>
  );
}

function CartModal({ cart, requestNote, onNoteChange, onClose, onOrder }: { cart: ReturnType<typeof useCart>; requestNote: string; onNoteChange: (v: string) => void; onClose: () => void; onOrder: () => void; }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}><span style={styles.modalTitle}>장바구니</span><button style={styles.closeBtn} onClick={onClose}>✕</button></div>
        <div style={{ ...styles.modalBody, overflowY: 'auto' }}>
          {cart.items.map(item => (<div key={item.cartKey} style={styles.cartItem}><div style={styles.cartItemInfo}><span style={styles.cartItemName}>{item.name}</span>{item.options.length > 0 && <span style={styles.cartItemOpts}>{item.options.map(o => o.name).join(', ')}</span>}</div><div style={styles.cartItemRight}><div style={styles.qtyRow}><button style={styles.qtyBtnSm} onClick={() => cart.updateQty(item.cartKey, item.quantity - 1)}>－</button><span style={styles.qtyNumSm}>{item.quantity}</span><button style={styles.qtyBtnSm} onClick={() => cart.updateQty(item.cartKey, item.quantity + 1)}>＋</button></div><span style={styles.cartItemPrice}>{fmt(item.itemTotal)}</span></div></div>))}
          <textarea style={styles.noteInput} placeholder="요청사항" value={requestNote} onChange={e => onNoteChange(e.target.value)} rows={2} />
        </div>
        <div style={styles.modalFooter}><div style={styles.totalRow}><span>합계</span><span style={styles.totalPrice}>{fmt(cart.totalPrice)}</span></div><button style={styles.addBtn} onClick={onOrder}>주문하기</button></div>
      </div>
    </div>
  );
}

function ConfirmModal({ cart, requestNote, loading, error, onClose, onSubmit }: { cart: ReturnType<typeof useCart>; requestNote: string; loading: boolean; error: string; onClose: () => void; onSubmit: () => void; }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}><span style={styles.modalTitle}>주문 확인</span><button style={styles.closeBtn} onClick={onClose}>✕</button></div>
        <div style={styles.modalBody}>
          {cart.items.map(item => (<div key={item.cartKey} style={styles.confirmItem}><span>{item.name} × {item.quantity}</span><span>{fmt(item.itemTotal)}</span></div>))}
          {requestNote && <div style={styles.noteDisplay}>📝 {requestNote}</div>}
          {error && <div style={styles.errorMsg}>{error}</div>}
        </div>
        <div style={styles.modalFooter}><div style={styles.totalRow}><span>결제금액</span><span style={styles.totalPrice}>{fmt(cart.totalPrice)}</span></div><button style={styles.addBtn} onClick={onSubmit} disabled={loading}>{loading ? '처리 중...' : '결제하기'}</button></div>
      </div>
    </div>
  );
}

function PaymentModal({ amount, loading, error, onPay, onBack }: { amount: number; loading: boolean; error: string; onPay: () => void; onBack: () => void; }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}><span style={styles.modalTitle}>결제</span></div>
        <div style={{ ...styles.modalBody, textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>{fmt(amount)}</div>
          {error && <div style={styles.errorMsg}>{error}</div>}
        </div>
        <div style={styles.modalFooter}><button style={styles.addBtn} onClick={onPay} disabled={loading}>{loading ? '결제 처리 중...' : '카드/간편결제'}</button><button style={styles.backBtn} onClick={onBack}>뒤로</button></div>
      </div>
    </div>
  );
}

function DoneModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [status, setStatus] = useState('accepted');
  useEffect(() => {
    const poll = setInterval(async () => { const res = await fetch(`/api/orders/${orderId}`); const data = await res.json(); if (data.data?.status) setStatus(data.data.status); if (['completed', 'cancelled'].includes(data.data?.status)) clearInterval(poll); }, 5000);
    return () => clearInterval(poll);
  }, [orderId]);
  const statusLabel: Record<string, string> = { accepted: '✅ 주문이 접수되었습니다', cooking: '👨‍🍳 조리 중입니다', ready: '🔔 준비 완료! 서빙 중입니다', completed: '🎉 식사 맛있게 하세요!' };
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={{ ...styles.modalBody, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{statusLabel[status] ?? '주문 완료'}</div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>주문번호 조회 중...</div>
        </div>
        <div style={styles.modalFooter}><button style={styles.backBtn} onClick={onClose}>메뉴로 돌아가기</button></div>
      </div>
    </div>
  );
}

function StoreFooter() {
  return (
    <footer style={styles.footer}>
      <div style={styles.footerName}>{STORE_LEGAL.name}</div>
      <div style={styles.footerRow}><span>대표자 {STORE_LEGAL.ceo}</span><span style={styles.footerDot}>|</span><span>사업자등록번호 {STORE_LEGAL.bizNo}</span></div>
      <div style={styles.footerRow}>{STORE_LEGAL.address}</div>
      <div style={styles.footerRow}>고객센터&nbsp;<a href={`tel:${STORE_LEGAL.tel}`} style={styles.footerTel}>{STORE_LEGAL.tel}</a></div>
    </footer>
  );
}

// ── 스켈레톤 로딩 (햄버거 없앰) ──────────────────────────────────
const skBox = (w: string | number, h: number, r = 6): React.CSSProperties => ({
  width: w, height: h, borderRadius: r, background: '#e5e7eb', position: 'relative', overflow: 'hidden', flexShrink: 0,
});
const skShimmer: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
  animation: 'shimmer 1.4s infinite',
};

function SkBox({ w, h, r }: { w: string | number; h: number; r?: number }) {
  return <div style={skBox(w, h, r)}><div style={skShimmer} /></div>;
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100dvh', background: '#f9fafb', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      {/* 헤더 */}
      <div style={{ background: '#E8560A', padding: '14px 16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkBox w={130} h={20} r={8} />
        <SkBox w={60} h={20} r={20} />
      </div>

      {/* 배너 */}
      <SkBox w="100%" h={230} r={0} />

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: 14, padding: '10px 12px 0', background: '#fff', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingBottom: 10 }}>
            <SkBox w={52} h={52} r={12} />
            <SkBox w={36} h={10} r={4} />
          </div>
        ))}
      </div>

      {/* 브랜드 히어로 */}
      <SkBox w="100%" h={130} r={0} />

      {/* 카테고리 타이틀 */}
      <div style={{ background: '#fff', padding: '14px 16px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <SkBox w={60} h={16} r={4} />
        <SkBox w={20} h={14} r={4} />
      </div>

      {/* 메뉴 아이템 */}
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
          <SkBox w={100} h={100} r={0} />
          <div style={{ padding: '14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkBox w="65%" h={14} r={4} />
            <SkBox w="85%" h={11} r={4} />
            <SkBox w="35%" h={14} r={4} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{ ...styles.root, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: '#ef4444' }}>{message}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root:           { minHeight: '100dvh', background: '#f9fafb', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" },
  header:         { background: '#E8560A', color: '#fff', padding: '14px 16px 0' },
  headerInner:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  storeName:      { fontSize: 18, fontWeight: 700 },
  tableBadge:     { background: '#E8560A', borderRadius: 20, padding: '4px 12px', fontSize: 13 },
  notice:         { background: '#c44508', fontSize: 12, padding: '8px 0 12px', color: '#ffe4c4' },
  catNav:         { display: 'flex', gap: 0, overflowX: 'auto', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10, padding: '8px 8px 0' },
  catTab:         { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 6px 8px', background: 'none', border: 'none', cursor: 'pointer', minWidth: 60 },
  catTabActive:   {},
  catTabImgBox:   { width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0 },
  catTabImg:      { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  catTabFallback: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 },
  catTabText:     { fontSize: 11, lineHeight: 1.2, textAlign: 'center', whiteSpace: 'nowrap' },
  main:           { padding: '0 0 16px', background: '#f3f4f6' },
  catSection:     { marginTop: 8, background: '#fff' },
  catBanner:      { display: 'none' },
  catBannerImg:   { width: '100%', height: '100%', objectFit: 'cover' },
  catTitle:       { fontSize: 15, fontWeight: 800, color: '#111827', margin: 0, padding: '14px 16px 10px', background: '#fff', display: 'flex', alignItems: 'center', gap: 6 },
  catCount:       { fontSize: 13, fontWeight: 500, color: '#9ca3af' },
  menuGrid:       { display: 'flex', flexDirection: 'column', gap: 0 },
  menuCard:       { display: 'flex', alignItems: 'center', background: '#fff', border: 'none', borderBottom: '1px solid #f3f4f6', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', padding: 0, width: '100%' },
  menuCardSoldout:{ opacity: 0.5 },
  menuImgWrap:    { position: 'relative', width: 100, height: 100, flexShrink: 0 },
  menuImg:        { width: '100%', height: '100%', objectFit: 'cover' },
  soldoutOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 },
  menuInfo:       { padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 },
  menuName:       { fontSize: 14, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  menuDesc:       { fontSize: 12, color: '#9ca3af', lineHeight: 1.4 },
  menuPrice:      { fontSize: 16, fontWeight: 800, color: '#E8560A', marginTop: 4 },
  addCircle:      { width: 36, height: 36, borderRadius: '50%', background: '#E8560A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 400, flexShrink: 0, marginRight: 14 },
  cartFloat:      { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#E8560A', color: '#fff', border: 'none', borderRadius: 50, padding: '16px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', zIndex: 50, whiteSpace: 'nowrap' },
  overlay:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' },
  modal:          { background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  modalHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' },
  modalTitle:     { fontSize: 18, fontWeight: 700 },
  closeBtn:       { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', padding: 4 },
  modalBody:      { padding: '16px 20px', flex: 1, overflowY: 'auto' },
  modalFooter:    { padding: '12px 20px 32px', borderTop: '1px solid #f3f4f6' },
  optGroup:       { marginBottom: 20 },
  optGroupHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  optGroupName:   { fontSize: 15, fontWeight: 600 },
  optBadge:       { fontSize: 11, background: '#fff3e0', color: '#E8560A', borderRadius: 6, padding: '2px 8px' },
  optItem:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 14px', marginBottom: 6, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 14 },
  optItemSelected:{ border: '1.5px solid #E8560A', background: '#fff3e0' },
  optPrice:       { color: '#E8560A', fontWeight: 600 },
  qtyRow:         { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '16px 0' },
  qtyBtn:         { width: 40, height: 40, borderRadius: '50%', border: '1.5px solid #d1d5db', background: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qtyBtnSm:       { width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #d1d5db', background: '#fff', fontSize: 16, cursor: 'pointer' },
  qtyNum:         { fontSize: 20, fontWeight: 700, minWidth: 32, textAlign: 'center' },
  qtyNumSm:       { fontSize: 15, fontWeight: 600, minWidth: 24, textAlign: 'center' },
  addBtn:         { width: '100%', padding: '16px', background: '#E8560A', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 8 },
  addBtnDisabled: { background: '#9ca3af', cursor: 'not-allowed' },
  backBtn:        { width: '100%', padding: '14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  cartItem:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' },
  cartItemInfo:   { display: 'flex', flexDirection: 'column', gap: 2 },
  cartItemName:   { fontSize: 15, fontWeight: 600 },
  cartItemOpts:   { fontSize: 12, color: '#9ca3af' },
  cartItemRight:  { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  cartItemPrice:  { fontSize: 14, fontWeight: 700, color: '#E8560A' },
  noteInput:      { width: '100%', marginTop: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, resize: 'none', boxSizing: 'border-box' },
  totalRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalPrice:     { fontSize: 20, fontWeight: 700, color: '#E8560A' },
  confirmItem:    { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 },
  noteDisplay:    { marginTop: 12, padding: 10, background: '#f9fafb', borderRadius: 8, fontSize: 13, color: '#6b7280' },
  errorMsg:       { color: '#ef4444', fontSize: 13, margin: '8px 0', textAlign: 'center' },
  footer:         { margin: '24px 0 0', padding: '20px 16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: 6 },
  footerName:     { fontSize: 13, fontWeight: 700, color: '#6b7280' },
  footerRow:      { fontSize: 12, color: '#9ca3af', lineHeight: 1.6, display: 'flex', flexWrap: 'wrap', gap: '0 6px', alignItems: 'center' },
  footerDot:      { color: '#d1d5db' },
  footerTel:      { color: '#6b7280', textDecoration: 'none', fontWeight: 600 },
};
