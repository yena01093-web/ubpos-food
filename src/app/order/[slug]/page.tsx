'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { BAKERY_SLUG, injectBakeryFont } from '@/lib/bakeryFont';
import { BAKERY_TAGS } from '@/lib/bakeryTags';
import { CAFE_SLUG } from '@/lib/cafeFont';
import CafeLanding from './CafeLanding';
import { CAFE2_SLUG } from '@/lib/cafe2Font';
import Cafe2Landing from './Cafe2Landing';
import type { CategoryWithMenus, MenuWithOptions } from '@/types';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

// 실제 대표 사진(store.logo_url)이 설정되기 전까지 쓰는 임시 히어로 이미지입니다.
// 실제 빵 사진으로 교체하시려면 이 URL만 바꾸시거나, store.logo_url을 설정해주세요.
const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1600&q=80';

// 아래 문구/카피는 전부 이 객체 하나에 모아뒀습니다. 실제 브랜드 톤에 맞게
// 자유롭게 바꿔주세요 — 나머지 레이아웃/애니메이션 코드는 건드릴 필요 없습니다.
const CONTENT = {
  hero: {
    eyebrow: 'EVERYDAY BAKERY',
    title: '갓 구운 빵,\n오늘 이 순간',
    subtitle: '매일 아침 직접 반죽하고 구워내는 동네 베이커리',
  },
  story: {
    eyebrow: "OWNER'S STORY",
    title: '사장님의 이야기',
    quote: '“좋은 재료로, 정직하게 구운 빵을 나누고 싶었어요.”',
    paragraphs: [
      '작은 오븐 하나로 시작한 빵집입니다. 처음엔 가족들에게 빵을 구워주던 게 전부였어요.',
      '지금도 매일 아침 반죽부터 굽기까지 손으로 직접 만듭니다. 그날 구운 빵은 그날 다 팔아요.',
      '한 조각을 먹어도 정성이 느껴지는 빵을 만들고 싶습니다. 오늘도 그 마음으로 굽습니다.',
    ],
    signature: '- 베이커리 드림',
  },
  finder: {
    eyebrow: 'FIND YOUR BREAD',
    title: '나에게 맞는 빵 찾기',
    subtitle: '오늘 내 상황에 맞는 빵을 골라보세요',
    empty: '아직 이 카테고리에 맞는 빵을 준비 중이에요. 곧 만나요! 🥐',
    prompt: '위에서 카테고리를 골라보세요',
  },
  cta: {
    title: '지금 바로 주문해보세요',
    subtitle: '오늘 구운 빵을 원하는 시간에 픽업하실 수 있어요',
    button: '주문하러 가기',
  },
};

// 이 랜딩 페이지는 현재 베이커리/카페/카페2 전용입니다. 그 외 매장은 아직 별도 랜딩이 없으므로
// 기존 포장 주문 페이지로 바로 보냅니다 (베이커리·카페 매장의 동작/스타일은 그대로 유지됩니다).
export default function StoreLandingPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const hasLanding = slug === BAKERY_SLUG || slug === CAFE_SLUG || slug === CAFE2_SLUG;

  useEffect(() => {
    if (!hasLanding) {
      router.replace(`/order/${slug}/takeout`);
    }
  }, [slug, hasLanding, router]);

  if (slug === BAKERY_SLUG) return <BakeryLanding />;
  if (slug === CAFE_SLUG) return <CafeLanding />;
  if (slug === CAFE2_SLUG) return <Cafe2Landing />;
  return null;
}

function BakeryLanding() {
  const [store, setStore] = useState<{ name: string; notice: string | null; logo_url: string | null }>({
    name: '베이커리',
    notice: null,
    logo_url: null,
  });
  const [categories, setCategories] = useState<CategoryWithMenus[]>([]);

  useEffect(() => {
    injectBakeryFont();
    (async () => {
      try {
        const res = await fetch(`/api/store/${BAKERY_SLUG}/menu`);
        const data = await res.json();
        if (res.ok) {
          setStore(data.data.store);
          setCategories(data.data.categories ?? []);
        }
      } catch {
        // 실패해도 기본값(베이커리)으로 그대로 보여준다
      }
    })();
  }, []);

  const allMenus = categories.flatMap(c => c.menus).filter(m => !m.is_soldout);

  return (
    <div style={{ background: '#FBF3E7', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      <Hero store={store} />
      <StorySection />
      <BreadFinder menus={allMenus} />
      <ClosingCTA />
      <StickyOrderButton />
    </div>
  );
}

function Hero({ store }: { store: { name: string; notice: string | null; logo_url: string | null } }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [imgFailed, setImgFailed] = useState(false);
  const heroImage = store.logo_url || DEFAULT_HERO_IMAGE;
  const showPhoto = !!heroImage && !imgFailed;

  return (
    <div ref={heroRef} style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      {showPhoto ? (
        <motion.img
          src={heroImage}
          alt={store.name}
          onError={() => setImgFailed(true)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', scale,
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(130% 100% at 50% 0%, #86603D 0%, #5C3A21 48%, #34210F 100%)',
        }} />
      )}
      {/* 텍스트 가독성용 그라데이션 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(30,18,9,0.35) 0%, rgba(30,18,9,0.35) 40%, rgba(30,18,9,0.85) 100%)',
      }} />

      <motion.div
        style={{ y, opacity, position: 'relative', zIndex: 1 }}
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
      >
        <div style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px',
        }}>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ fontSize: 12, letterSpacing: 4, color: 'rgba(255,255,255,0.6)', marginBottom: 18, fontWeight: 600 }}
          >
            {CONTENT.hero.eyebrow}
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              fontFamily: "'Gaegu', 'Pretendard', sans-serif",
              fontSize: 'clamp(40px, 10vw, 68px)',
              fontWeight: 700, color: '#FBEEDC', margin: 0, lineHeight: 1.3,
              whiteSpace: 'pre-line', textShadow: '0 4px 24px rgba(0,0,0,0.35)',
            }}
          >
            {CONTENT.hero.title}
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ marginTop: 20, fontSize: 16, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', maxWidth: 380 }}
          >
            {store.notice ?? CONTENT.hero.subtitle}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ marginTop: 36 }}
          >
            <OrderButton />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: 22, zIndex: 1 }}
      >
        ⌄
      </motion.div>
    </div>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function SectionEyebrow({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12, letterSpacing: 3, color: '#B08A5A', fontWeight: 700, marginBottom: 10 }}>
      {text}
    </div>
  );
}

function StorySection() {
  return (
    <section style={{ padding: '120px 24px', maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
      <Reveal>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', margin: '0 auto 24px',
          background: 'linear-gradient(160deg, #C89A66, #5C3A21)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, boxShadow: '0 10px 24px rgba(92,58,33,0.25)',
        }}>
          🧑‍🍳
        </div>
        <SectionEyebrow text={CONTENT.story.eyebrow} />
        <h2 style={{
          fontFamily: "'Gaegu', 'Pretendard', sans-serif", fontSize: 'clamp(26px, 5vw, 34px)',
          fontWeight: 700, color: '#3E2A1B', margin: '0 0 24px',
        }}>
          {CONTENT.story.title}
        </h2>
        <p style={{
          fontFamily: "'Gaegu', 'Pretendard', sans-serif", fontSize: 20, color: '#8B5E3C',
          lineHeight: 1.6, marginBottom: 32,
        }}>
          {CONTENT.story.quote}
        </p>
      </Reveal>

      {CONTENT.story.paragraphs.map((p, i) => (
        <Reveal key={i} delay={0.1 + i * 0.1}>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#6B5642', marginTop: i === 0 ? 0 : 12 }}>{p}</p>
        </Reveal>
      ))}

      <Reveal delay={0.3}>
        <div style={{ marginTop: 28, fontSize: 14, color: '#B08A5A', fontStyle: 'italic' }}>
          {CONTENT.story.signature}
        </div>
      </Reveal>
    </section>
  );
}

function BreadFinder({ menus }: { menus: MenuWithOptions[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const matched = selected ? menus.filter(m => m.tags?.includes(selected)) : [];

  return (
    <section style={{ padding: '80px 24px 120px', background: '#F3E6D2' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <SectionEyebrow text={CONTENT.finder.eyebrow} />
            <h2 style={{
              fontFamily: "'Gaegu', 'Pretendard', sans-serif", fontSize: 'clamp(26px, 5vw, 34px)',
              fontWeight: 700, color: '#3E2A1B', margin: '0 0 10px',
            }}>
              {CONTENT.finder.title}
            </h2>
            <p style={{ fontSize: 14, color: '#9C8064' }}>{CONTENT.finder.subtitle}</p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
            {BAKERY_TAGS.map(tag => {
              const active = selected === tag.key;
              return (
                <motion.button
                  key={tag.key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelected(active ? null : tag.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '18px 22px', minWidth: 100, borderRadius: 20, cursor: 'pointer',
                    border: active ? '2px solid #8B5E3C' : '1.5px solid #E8D7BC',
                    background: active ? '#3E2A1B' : '#FFFDF8',
                    boxShadow: active ? '0 10px 24px rgba(62,42,27,0.28)' : '0 4px 12px rgba(92,58,33,0.06)',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{tag.icon}</span>
                  <span style={{
                    fontFamily: "'Gaegu', 'Pretendard', sans-serif", fontSize: 14, fontWeight: 700,
                    color: active ? '#FBEEDC' : '#5C3A21',
                  }}>
                    {tag.shortLabel}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </Reveal>

        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', color: '#B8A088', fontSize: 14, padding: '20px 0' }}
            >
              {CONTENT.finder.prompt}
            </motion.div>
          ) : (
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {matched.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '48px 24px', background: '#FFFDF8',
                  borderRadius: 24, border: '1px solid #E8D7BC', color: '#9C8064', fontSize: 14,
                }}>
                  {CONTENT.finder.empty}
                </div>
              ) : (
                <div style={{
                  display: 'grid', gap: 24,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}>
                  {matched.map(menu => (
                    <motion.div
                      key={menu.id}
                      whileHover={{ y: -8 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        background: '#FFFDF8', borderRadius: 24, overflow: 'hidden',
                        border: '1px solid #EFE1CC', boxShadow: '0 10px 24px rgba(92,58,33,0.10)',
                      }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#EAD9BE', position: 'relative' }}>
                        {menu.image_url
                          ? <img src={menu.image_url} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🥐</div>}
                      </div>
                      <div style={{ padding: '16px 16px 18px' }}>
                        <div style={{ fontFamily: "'Gaegu', 'Pretendard', sans-serif", fontSize: 17, fontWeight: 700, color: '#3E2A1B' }}>{menu.name}</div>
                        <div style={{ fontFamily: "'Gaegu', 'Pretendard', sans-serif", fontSize: 15, fontWeight: 700, color: '#8B5E3C', marginTop: 6 }}>{fmt(menu.price)}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section style={{
      padding: '120px 24px', textAlign: 'center',
      background: 'radial-gradient(130% 100% at 50% 100%, #86603D 0%, #5C3A21 48%, #34210F 100%)',
    }}>
      <Reveal>
        <h2 style={{
          fontFamily: "'Gaegu', 'Pretendard', sans-serif", fontSize: 'clamp(26px, 5vw, 36px)',
          fontWeight: 700, color: '#FBEEDC', margin: '0 0 14px',
        }}>
          {CONTENT.cta.title}
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', marginBottom: 36 }}>{CONTENT.cta.subtitle}</p>
        <OrderButton />
      </Reveal>
    </section>
  );
}

function OrderButton() {
  return (
    <Link href={`/order/${BAKERY_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
      <motion.span
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '18px 40px', borderRadius: 999,
          background: '#FBEEDC', color: '#5C3A21',
          fontSize: 17, fontWeight: 700,
          boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
        }}
      >
        {CONTENT.cta.button} <span aria-hidden="true">→</span>
      </motion.span>
    </Link>
  );
}

function StickyOrderButton() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      {/* 히어로를 벗어나면 하단 고정 주문 버튼 노출 */}
      <motion.div
        onViewportEnter={() => setVisible(false)}
        onViewportLeave={() => setVisible(true)}
        style={{ position: 'absolute', top: '90dvh', height: 1, width: 1 }}
      />
      <motion.div
        initial={false}
        animate={{ y: visible ? 0 : 100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ position: 'fixed', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 50, pointerEvents: visible ? 'auto' : 'none' }}
      >
        <Link href={`/order/${BAKERY_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 999,
              background: '#5C3A21', color: '#FBEEDC',
              fontSize: 15, fontWeight: 700,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            🥐 {CONTENT.cta.button}
          </motion.span>
        </Link>
      </motion.div>
    </>
  );
}
