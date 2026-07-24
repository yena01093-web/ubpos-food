'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { CAFE3_SLUG, injectCafe3Font } from '@/lib/cafe3Font';
import { CAFE3_TAGS } from '@/lib/cafe3Tags';
import type { CategoryWithMenus, MenuWithOptions } from '@/types';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

// 실제 대표 사진(store.logo_url)이 설정되기 전까지 쓰는 임시 히어로 이미지입니다.
// 실제 매장 사진으로 교체하시려면 이 URL만 바꾸시거나, store.logo_url을 설정해주세요.
const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1769053202058-74062e1f1530?auto=format&fit=crop&w=1600&q=80';

// 여백 있는 액자처럼 보여주는 두 장면 — 물줄기를 따르는 순간과, 잔에 담기는 순간.
// 매장 실제 사진이 준비되면 image만 교체하면 됩니다.
const PLATES = [
  {
    label: 'PLATE 01 — POUR',
    line: '0.1초의 물줄기, 그 차이를 압니다',
    image: 'https://images.unsplash.com/photo-1565264214959-3a8b70ae4560?auto=format&fit=crop&w=1400&q=80',
  },
  {
    label: 'PLATE 02 — CUP',
    line: '잔에 담기는 순간까지, 정성은 계속됩니다',
    image: 'https://images.unsplash.com/photo-1589686548535-f99c0d09c90f?auto=format&fit=crop&w=1400&q=80',
  },
];

// 아래 문구/카피는 전부 이 객체 하나에 모아뒀습니다. 실제 브랜드 톤에 맞게
// 자유롭게 바꿔주세요 — 나머지 레이아웃/애니메이션 코드는 건드릴 필요 없습니다.
const CONTENT = {
  hero: {
    eyebrow: 'QUIETLY, WELL MADE',
    title: '군더더기 없이,\n한 잔에 집중하다',
    subtitle: '불필요한 것을 덜어낸, 커피 본연의 자리',
  },
  story: {
    eyebrow: 'PHILOSOPHY',
    title: '더하지 않는 방식',
    quote: '"좋은 원두와 정확한 온도, 그 이상은 더하지 않습니다."',
    paragraphs: [
      '유행을 따르기보다, 기본에 오래 머물렀습니다. 원두 본연의 맛을 가장 정확하게 전달하는 방법을 고민합니다.',
      '공간도 마찬가지입니다. 필요하지 않은 것은 두지 않았습니다. 남은 여백은 온전히 커피와, 그 시간을 위한 것입니다.',
      '한 잔을 내리는 데 걸리는 시간, 그 안에 담긴 정성이 다르다는 걸 마셔보면 아실 거예요.',
    ],
    signature: '- 카페 드림',
  },
  finder: {
    eyebrow: 'FIND YOUR ROAST',
    title: '오늘의 취향을 찾다',
    subtitle: '취향에 맞는 한 잔을 골라보세요',
    empty: '아직 이 취향에 맞는 메뉴를 준비 중이에요.',
    prompt: '위에서 오늘의 취향을 골라보세요',
  },
  cta: {
    title: '지금, 조용히 한 잔',
    subtitle: '불필요한 것을 덜어낸 그 자리에서',
    button: '주문하러 가기',
  },
};

export default function Cafe3Landing() {
  const [store, setStore] = useState<{ name: string; notice: string | null; logo_url: string | null }>({
    name: '카페',
    notice: null,
    logo_url: null,
  });
  const [categories, setCategories] = useState<CategoryWithMenus[]>([]);

  useEffect(() => {
    injectCafe3Font();
    (async () => {
      try {
        const res = await fetch(`/api/store/${CAFE3_SLUG}/menu`);
        const data = await res.json();
        if (res.ok) {
          setStore(data.data.store);
          setCategories(data.data.categories ?? []);
        }
      } catch {
        // 실패해도 기본값(카페)으로 그대로 보여준다
      }
    })();
  }, []);

  const allMenus = categories.flatMap(c => c.menus).filter(m => !m.is_soldout);

  return (
    <div style={{ background: '#FAF9F7', fontFamily: "'Gothic A1', 'Pretendard', sans-serif" }}>
      <Hero store={store} />
      <StorySection />
      {PLATES.map((plate, i) => (
        <Plate key={i} plate={plate} alt={i % 2 === 1} />
      ))}
      <RoastFinder menus={allMenus} />
      <ClosingCTA />
      <StickyOrderButton />
    </div>
  );
}

function Hero({ store }: { store: { name: string; notice: string | null; logo_url: string | null } }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
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
            filter: 'grayscale(0.15) contrast(1.03) brightness(1.03)',
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#EDEAE3' }} />
      )}
      {/* 텍스트 가독성용 옅은 스크림 — 사진을 거의 그대로 두고 하단만 부드럽게 정리 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(0deg, rgba(250,249,247,0.94) 0%, rgba(250,249,247,0.55) 32%, rgba(250,249,247,0) 62%)',
      }} />

      <motion.div
        style={{ y, opacity, position: 'relative', zIndex: 1, height: '100%' }}
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}
      >
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start', justifyContent: 'flex-end', textAlign: 'left',
          padding: '0 32px 96px', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box',
        }}>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}
          >
            <span style={{ width: 28, height: 1, background: '#8A7458' }} />
            <span style={{ fontSize: 12, letterSpacing: 3, color: '#8A7458', fontWeight: 500 }}>
              {CONTENT.hero.eyebrow}
            </span>
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              fontFamily: "'Gothic A1', 'Pretendard', sans-serif",
              fontSize: 'clamp(32px, 6.5vw, 52px)',
              fontWeight: 300, color: '#201F1D', margin: 0, lineHeight: 1.4,
              whiteSpace: 'pre-line', letterSpacing: '-0.01em',
            }}
          >
            {CONTENT.hero.title}
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ marginTop: 22, fontSize: 16, lineHeight: 1.8, color: '#6B675F', maxWidth: 380, fontWeight: 400 }}
          >
            {store.notice ?? CONTENT.hero.subtitle}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ marginTop: 36 }}
          >
            <OrderButton />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.9, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function SectionEyebrow({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16,
    }}>
      <span style={{ width: 24, height: 1, background: '#8A7458' }} />
      <span style={{ fontSize: 12, letterSpacing: 3, color: '#8A7458', fontWeight: 500 }}>{text}</span>
      <span style={{ width: 24, height: 1, background: '#8A7458' }} />
    </div>
  );
}

function StorySection() {
  return (
    <section style={{ padding: '160px 32px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <Reveal>
        <SectionEyebrow text={CONTENT.story.eyebrow} />
        <h2 style={{
          fontFamily: "'Gothic A1', 'Pretendard', sans-serif", fontSize: 'clamp(24px, 4.5vw, 30px)',
          fontWeight: 300, color: '#201F1D', margin: '0 0 28px', letterSpacing: '-0.01em',
        }}>
          {CONTENT.story.title}
        </h2>
        <p style={{
          fontSize: 17, color: '#8A7458',
          lineHeight: 1.7, marginBottom: 36, fontWeight: 400,
        }}>
          {CONTENT.story.quote}
        </p>
      </Reveal>

      {CONTENT.story.paragraphs.map((p, i) => (
        <Reveal key={i} delay={0.08 + i * 0.08}>
          <p style={{ fontSize: 15, lineHeight: 2.1, color: '#6B675F', marginTop: i === 0 ? 0 : 14, fontWeight: 400 }}>{p}</p>
        </Reveal>
      ))}

      <Reveal delay={0.24}>
        <div style={{ marginTop: 32, fontSize: 13, color: '#A79A85' }}>
          {CONTENT.story.signature}
        </div>
      </Reveal>
    </section>
  );
}

// 화면 전체를 채우는 대신, 여백을 넉넉히 두고 사진을 액자처럼 앉힌 절제된 장면.
function Plate({ plate, alt }: { plate: { label: string; line: string; image: string }; alt: boolean }) {
  const plateRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: plateRef, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.04, 1, 1.04]);

  return (
    <section ref={plateRef} style={{ padding: '96px 32px', background: alt ? '#F1EFEA' : '#FAF9F7' }}>
      <Reveal>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{
            overflow: 'hidden', border: '1px solid #DEDAD2', aspectRatio: '16 / 10',
            background: '#EDEAE3',
          }}>
            <motion.img
              src={plate.image}
              alt={plate.line}
              style={{
                width: '100%', height: '100%', objectFit: 'cover', scale,
                filter: 'grayscale(0.1) contrast(1.03) brightness(1.02)',
              }}
            />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginTop: 22, paddingTop: 22, borderTop: '1px solid #DEDAD2', gap: 16, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, letterSpacing: 2, color: '#8A7458', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {plate.label}
            </span>
            <span style={{ fontSize: 16, color: '#201F1D', fontWeight: 400, textAlign: 'right' }}>
              {plate.line}
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function RoastFinder({ menus }: { menus: MenuWithOptions[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const matched = selected ? menus.filter(m => m.tags?.includes(selected)) : [];

  return (
    <section style={{ padding: '120px 32px', background: '#F1EFEA' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionEyebrow text={CONTENT.finder.eyebrow} />
            <h2 style={{
              fontFamily: "'Gothic A1', 'Pretendard', sans-serif", fontSize: 'clamp(24px, 4.5vw, 30px)',
              fontWeight: 300, color: '#201F1D', margin: '0 0 12px', letterSpacing: '-0.01em',
            }}>
              {CONTENT.finder.title}
            </h2>
            <p style={{ fontSize: 14, color: '#8A8578' }}>{CONTENT.finder.subtitle}</p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 40 }}>
            {CAFE3_TAGS.map(tag => {
              const active = selected === tag.key;
              return (
                <motion.button
                  key={tag.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(active ? null : tag.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '13px 20px', borderRadius: 999, cursor: 'pointer',
                    border: active ? '1px solid #201F1D' : '1px solid #DEDAD2',
                    background: active ? '#201F1D' : '#FAF9F7',
                  }}
                >
                  <span style={{ fontSize: 15, color: active ? '#FAF9F7' : '#8A7458' }}>{tag.icon}</span>
                  <span style={{
                    fontFamily: "'Gothic A1', 'Pretendard', sans-serif", fontSize: 14, fontWeight: 400,
                    color: active ? '#FAF9F7' : '#4A4740',
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
              style={{ textAlign: 'center', color: '#A79E8E', fontSize: 14, padding: '20px 0' }}
            >
              {CONTENT.finder.prompt}
            </motion.div>
          ) : (
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {matched.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '48px 24px', background: '#FAF9F7',
                  border: '1px solid #DEDAD2', color: '#8A8578', fontSize: 14,
                }}>
                  {CONTENT.finder.empty}
                </div>
              ) : (
                <div style={{
                  display: 'grid', gap: 1, background: '#DEDAD2',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}>
                  {matched.map(menu => (
                    <motion.div
                      key={menu.id}
                      style={{ background: '#FAF9F7' }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#EDEAE3', position: 'relative' }}>
                        {menu.image_url
                          ? <img src={menu.image_url} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(0.1)' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#DEDAD2' }}>◯</div>}
                      </div>
                      <div style={{ padding: '18px 18px 20px' }}>
                        <div style={{ fontFamily: "'Gothic A1', 'Pretendard', sans-serif", fontSize: 16, fontWeight: 400, color: '#201F1D' }}>{menu.name}</div>
                        <div style={{ fontFamily: "'Gothic A1', 'Pretendard', sans-serif", fontSize: 14, fontWeight: 400, color: '#8A7458', marginTop: 8 }}>{fmt(menu.price)}</div>
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
    <section style={{ padding: '160px 32px', textAlign: 'center', background: '#FAF9F7' }}>
      <Reveal>
        <h2 style={{
          fontFamily: "'Gothic A1', 'Pretendard', sans-serif", fontSize: 'clamp(24px, 4.5vw, 32px)',
          fontWeight: 300, color: '#201F1D', margin: '0 0 14px', letterSpacing: '-0.01em',
        }}>
          {CONTENT.cta.title}
        </h2>
        <p style={{ fontSize: 15, color: '#8A8578', marginBottom: 40 }}>{CONTENT.cta.subtitle}</p>
        <OrderButton />
      </Reveal>
    </section>
  );
}

function OrderButton() {
  return (
    <Link href={`/order/${CAFE3_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
      <motion.span
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '17px 38px', borderRadius: 999,
          background: '#201F1D', color: '#FAF9F7',
          fontSize: 15, fontWeight: 500, letterSpacing: '0.02em',
          boxShadow: '0 8px 24px rgba(32,31,29,0.16)',
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
        <Link href={`/order/${CAFE3_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 30px', borderRadius: 999,
              background: '#201F1D', color: '#FAF9F7',
              fontSize: 14, fontWeight: 500, letterSpacing: '0.02em',
              boxShadow: '0 6px 20px rgba(32,31,29,0.22)',
            }}
          >
            {CONTENT.cta.button}
          </motion.span>
        </Link>
      </motion.div>
    </>
  );
}
