'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { CAFE4_SLUG, injectCafe4Font } from '@/lib/cafe4Font';
import { CAFE4_TAGS } from '@/lib/cafe4Tags';
import type { CategoryWithMenus, MenuWithOptions } from '@/types';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

// 실제 대표 사진(store.logo_url)이 설정되기 전까지 쓰는 임시 히어로 이미지입니다.
// 실제 매장 사진으로 교체하시려면 이 URL만 바꾸시거나, store.logo_url을 설정해주세요.
const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1769501203611-8fdaa2373826?auto=format&fit=crop&w=1600&q=80';

// 공간의 작은 구석들을 소개하는 두 장면 — 창가의 자리, 초록이 자라는 구석.
// 매장 실제 사진이 준비되면 image만 교체하면 됩니다.
const CORNERS = [
  {
    label: '창가의 자리',
    line: '햇살 좋은 날엔, 창가 자리부터 채워집니다',
    image: 'https://images.unsplash.com/photo-1769473357493-319cbde6b248?auto=format&fit=crop&w=1400&q=80',
  },
  {
    label: '초록이 자라는 구석',
    line: '작은 화분 하나가 공간의 온도를 바꿉니다',
    image: 'https://images.unsplash.com/photo-1762770622112-4a708ce0d731?auto=format&fit=crop&w=1400&q=80',
  },
];

// 아래 문구/카피는 전부 이 객체 하나에 모아뒀습니다. 실제 브랜드 톤에 맞게
// 자유롭게 바꿔주세요 — 나머지 레이아웃/애니메이션 코드는 건드릴 필요 없습니다.
const CONTENT = {
  hero: {
    eyebrow: 'THE HYGGE HOUR',
    title: '햇살이 스며드는,\n포근한 오후',
    subtitle: '나무와 식물, 그리고 그 사이의 여유 — 북유럽의 오후처럼',
  },
  story: {
    eyebrow: 'OUR HYGGE',
    title: '휘게, 소소한 안락함',
    quote: '"거창하지 않아도 괜찮아요. 따뜻한 한 잔이면 충분합니다."',
    paragraphs: [
      '북유럽 사람들은 특별한 순간이 아니어도 소소하게 안락함을 즐길 줄 압니다. 그 마음을 이 공간에 담고 싶었어요.',
      '나무 테이블과 초록 식물, 은은하게 스며드는 햇살 — 화려하지 않아도 편안한 것들로만 채웠습니다.',
      '바쁜 하루 중 잠깐, 이곳에서만큼은 천천히 숨을 고르고 가셨으면 좋겠습니다.',
    ],
    signature: '- 카페 드림',
  },
  finder: {
    eyebrow: 'FIND YOUR HYGGE',
    title: '오늘의 안락함을 찾다',
    subtitle: '지금 기분에 맞는 한 잔을 골라보세요',
    empty: '아직 이 순간에 어울리는 메뉴를 준비 중이에요 🌿',
    prompt: '위에서 오늘의 기분을 골라보세요',
  },
  cta: {
    title: '오늘 하루, 잠시 쉬어가세요',
    subtitle: '포근한 자리 하나, 이곳에 마련해두었습니다',
    button: '주문하러 가기',
  },
};

export default function Cafe4Landing() {
  const [store, setStore] = useState<{ name: string; notice: string | null; logo_url: string | null }>({
    name: '카페',
    notice: null,
    logo_url: null,
  });
  const [categories, setCategories] = useState<CategoryWithMenus[]>([]);

  useEffect(() => {
    injectCafe4Font();
    (async () => {
      try {
        const res = await fetch(`/api/store/${CAFE4_SLUG}/menu`);
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
    <div style={{ background: '#FAF7F1', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      <Hero store={store} />
      <StorySection />
      {CORNERS.map((corner, i) => (
        <CornerScene key={i} corner={corner} alt={i % 2 === 1} />
      ))}
      <HyggeFinder menus={allMenus} />
      <ClosingCTA />
      <StickyOrderButton />
    </div>
  );
}

function Hero({ store }: { store: { name: string; notice: string | null; logo_url: string | null } }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
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
            filter: 'brightness(1.06) saturate(0.92) contrast(0.98)',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #EDE7D8 0%, #DCE3D6 55%, #CFDCE0 100%)',
        }} />
      )}
      {/* 텍스트 가독성용 옅은 크림 그라데이션 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(58,53,48,0.06) 0%, rgba(58,53,48,0.08) 45%, rgba(40,36,30,0.55) 100%)',
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
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999,
              background: 'rgba(250,247,241,0.85)', marginBottom: 22,
            }}
          >
            <span style={{ fontSize: 12, letterSpacing: 3, color: '#7C9270', fontWeight: 700 }}>
              {CONTENT.hero.eyebrow}
            </span>
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif",
              fontSize: 'clamp(34px, 8vw, 58px)',
              fontWeight: 400, color: '#FFFDF8', margin: 0, lineHeight: 1.4,
              whiteSpace: 'pre-line', textShadow: '0 4px 20px rgba(40,36,30,0.25)',
            }}
          >
            {CONTENT.hero.title}
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ marginTop: 20, fontSize: 16, lineHeight: 1.8, color: 'rgba(255,253,248,0.92)', maxWidth: 380, textShadow: '0 2px 12px rgba(40,36,30,0.2)' }}
          >
            {store.notice ?? CONTENT.hero.subtitle}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ marginTop: 32 }}
          >
            <OrderButton />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,253,248,0.85)', fontSize: 22, zIndex: 1 }}
      >
        ⌄
      </motion.div>
    </div>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
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
    <div style={{ fontSize: 12, letterSpacing: 3, color: '#7C9270', fontWeight: 700, marginBottom: 10 }}>
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
          background: 'linear-gradient(160deg, #B7C7A9, #7C9270)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, boxShadow: '0 10px 24px rgba(124,146,112,0.25)',
        }}>
          🕯️
        </div>
        <SectionEyebrow text={CONTENT.story.eyebrow} />
        <h2 style={{
          fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif", fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: 400, color: '#3A3530', margin: '0 0 24px',
        }}>
          {CONTENT.story.title}
        </h2>
        <p style={{
          fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif", fontSize: 18, color: '#8FA8B8',
          lineHeight: 1.7, marginBottom: 32,
        }}>
          {CONTENT.story.quote}
        </p>
      </Reveal>

      {CONTENT.story.paragraphs.map((p, i) => (
        <Reveal key={i} delay={0.1 + i * 0.1}>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#8C8579', marginTop: i === 0 ? 0 : 12 }}>{p}</p>
        </Reveal>
      ))}

      <Reveal delay={0.3}>
        <div style={{ marginTop: 28, fontSize: 14, color: '#7C9270', fontStyle: 'italic' }}>
          {CONTENT.story.signature}
        </div>
      </Reveal>
    </section>
  );
}

// 화면을 꽉 채우기보다, 공간의 한 구석을 들여다보듯 둥근 프레임 안에 사진을 앉힌 장면.
function CornerScene({ corner, alt }: { corner: { label: string; line: string; image: string }; alt: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1, 1.05]);

  return (
    <section ref={sceneRef} style={{ padding: '100px 24px', background: alt ? '#EFEEE3' : '#FAF7F1' }}>
      <Reveal>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            borderRadius: 28, overflow: 'hidden', aspectRatio: '4 / 3',
            boxShadow: '0 20px 48px rgba(58,53,48,0.14)', background: '#E5E1D3',
          }}>
            <motion.img
              src={corner.image}
              alt={corner.line}
              style={{ width: '100%', height: '100%', objectFit: 'cover', scale }}
            />
          </div>
          <div style={{
            fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif", fontSize: 15, fontWeight: 700,
            color: alt ? '#8FA8B8' : '#7C9270', marginTop: 26,
          }}>
            {corner.label}
          </div>
          <p style={{
            fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif", fontSize: 'clamp(18px, 3.5vw, 22px)',
            color: '#3A3530', maxWidth: 420, margin: '10px auto 0', lineHeight: 1.6,
          }}>
            {corner.line}
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function HyggeFinder({ menus }: { menus: MenuWithOptions[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const matched = selected ? menus.filter(m => m.tags?.includes(selected)) : [];

  return (
    <section style={{ padding: '80px 24px 120px', background: '#EFEEE3' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <SectionEyebrow text={CONTENT.finder.eyebrow} />
            <h2 style={{
              fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif", fontSize: 'clamp(24px, 5vw, 32px)',
              fontWeight: 400, color: '#3A3530', margin: '0 0 10px',
            }}>
              {CONTENT.finder.title}
            </h2>
            <p style={{ fontSize: 14, color: '#9C9587' }}>{CONTENT.finder.subtitle}</p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
            {CAFE4_TAGS.map(tag => {
              const active = selected === tag.key;
              return (
                <motion.button
                  key={tag.key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelected(active ? null : tag.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '18px 22px', minWidth: 100, borderRadius: 22, cursor: 'pointer',
                    border: active ? '2px solid #7C9270' : '1.5px solid #DEDACB',
                    background: active ? '#7C9270' : '#FFFDF8',
                    boxShadow: active ? '0 10px 24px rgba(124,146,112,0.25)' : '0 4px 12px rgba(58,53,48,0.05)',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{tag.icon}</span>
                  <span style={{
                    fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif", fontSize: 14, fontWeight: 400,
                    color: active ? '#FFFDF8' : '#4A463D',
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
              style={{ textAlign: 'center', color: '#ADA894', fontSize: 14, padding: '20px 0' }}
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
                  borderRadius: 24, border: '1px solid #DEDACB', color: '#9C9587', fontSize: 14,
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
                        border: '1px solid #E5E1D3', boxShadow: '0 10px 24px rgba(58,53,48,0.08)',
                      }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#E5E1D3', position: 'relative' }}>
                        {menu.image_url
                          ? <img src={menu.image_url} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🌿</div>}
                      </div>
                      <div style={{ padding: '16px 16px 18px' }}>
                        <div style={{ fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif", fontSize: 17, fontWeight: 400, color: '#3A3530' }}>{menu.name}</div>
                        <div style={{ fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif", fontSize: 15, fontWeight: 400, color: '#7C9270', marginTop: 6 }}>{fmt(menu.price)}</div>
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
      background: 'linear-gradient(160deg, #EDE7D8 0%, #DCE3D6 55%, #CFDCE0 100%)',
    }}>
      <Reveal>
        <h2 style={{
          fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif", fontSize: 'clamp(24px, 5vw, 34px)',
          fontWeight: 400, color: '#3A3530', margin: '0 0 14px',
        }}>
          {CONTENT.cta.title}
        </h2>
        <p style={{ fontSize: 15, color: '#6B6659', marginBottom: 36 }}>{CONTENT.cta.subtitle}</p>
        <OrderButton />
      </Reveal>
    </section>
  );
}

function OrderButton() {
  return (
    <Link href={`/order/${CAFE4_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
      <motion.span
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '18px 40px', borderRadius: 999,
          background: '#7C9270', color: '#FFFDF8',
          fontSize: 17, fontWeight: 700,
          boxShadow: '0 10px 28px rgba(124,146,112,0.3)',
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
        <Link href={`/order/${CAFE4_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 999,
              background: '#7C9270', color: '#FFFDF8',
              fontSize: 15, fontWeight: 700,
              boxShadow: '0 8px 24px rgba(124,146,112,0.32)',
            }}
          >
            🌿 {CONTENT.cta.button}
          </motion.span>
        </Link>
      </motion.div>
    </>
  );
}
