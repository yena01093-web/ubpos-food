'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { CAFE_SLUG, injectCafeFont } from '@/lib/cafeFont';
import { CAFE_TAGS } from '@/lib/cafeTags';
import type { CategoryWithMenus, MenuWithOptions } from '@/types';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

// 실제 대표 사진(store.logo_url)이 설정되기 전까지 쓰는 임시 히어로 이미지입니다.
// 실제 매장 사진으로 교체하시려면 이 URL만 바꾸시거나, store.logo_url을 설정해주세요.
const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1554181167-9cb58ddcc56c?auto=format&fit=crop&w=1600&q=80';

// 스크롤하면서 지나가는 여행 장면들 — 오후 테라스 → 저녁 불빛으로 이어지는 하루의 흐름.
// 매장 실제 사진이 준비되면 image만 교체하면 됩니다.
const JOURNEY_SCENES = [
  {
    timestamp: '오후 · 테라스의 빛',
    line: '햇살이 낮게 드는 시간, 테라스에 앉아 잠시 멈춰가요',
    image: 'https://images.unsplash.com/photo-1546072533-72256bac6a51?auto=format&fit=crop&w=1600&q=80',
  },
  {
    timestamp: '저녁 · 노란 불빛 아래',
    line: '하나 둘 불이 켜지면, 골목은 또 다른 얼굴을 보여줘요',
    image: 'https://images.unsplash.com/photo-1616091216791-a5360b5fc78a?auto=format&fit=crop&w=1600&q=80',
  },
];

// 아래 문구/카피는 전부 이 객체 하나에 모아뒀습니다. 실제 브랜드 톤에 맞게
// 자유롭게 바꿔주세요 — 나머지 레이아웃/애니메이션 코드는 건드릴 필요 없습니다.
const CONTENT = {
  hero: {
    eyebrow: 'SOMEWHERE IN EUROPE',
    timestamp: '아침 · 골목 어귀에서',
    title: '낯선 골목에서,\n커피 한 잔의 여행',
    subtitle: '유럽의 어느 골목을 걷다 만난 카페처럼',
  },
  story: {
    eyebrow: "TRAVELER'S NOTE",
    title: '어느 골목의 이야기',
    quote: '"여행에서 만난 카페의 온기를, 이 골목에 그대로 옮겨 놓고 싶었어요."',
    paragraphs: [
      '오래 여행하며 낯선 도시의 작은 카페에 자주 머물렀습니다. 말이 통하지 않아도, 커피 한 잔이 주는 안도감은 늘 같았어요.',
      '그 느낌을 그대로 옮기고 싶어 이 공간을 만들었습니다. 원두는 매일 아침 직접 내리고, 디저트도 그날 만든 것만 올립니다.',
      '멀리 가지 않아도, 이 골목 하나로 잠깐 여행을 다녀온 기분이 들었으면 좋겠습니다.',
    ],
    signature: '- 카페 드림',
  },
  finder: {
    eyebrow: 'FIND YOUR MOMENT',
    title: '지금 이 순간, 어울리는 한 잔',
    subtitle: '오늘 기분에 맞는 메뉴를 찾아보세요',
    empty: '아직 이 순간에 어울리는 메뉴를 준비 중이에요. 곧 만나요 ☕',
    prompt: '위에서 지금 기분을 골라보세요',
  },
  cta: {
    title: '지금, 그 골목으로 떠나보세요',
    subtitle: '가까운 자리에서, 여행하듯 즐기는 한 잔',
    button: '주문하러 가기',
  },
};

export default function CafeLanding() {
  const [store, setStore] = useState<{ name: string; notice: string | null; logo_url: string | null }>({
    name: '카페',
    notice: null,
    logo_url: null,
  });
  const [categories, setCategories] = useState<CategoryWithMenus[]>([]);

  useEffect(() => {
    injectCafeFont();
    (async () => {
      try {
        const res = await fetch(`/api/store/${CAFE_SLUG}/menu`);
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
    <div style={{ background: '#F4EFE3', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      <Hero store={store} />
      <StorySection />
      {JOURNEY_SCENES.map((scene, i) => (
        <PhotoScene key={i} scene={scene} />
      ))}
      <MomentFinder menus={allMenus} />
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
          background: 'radial-gradient(130% 100% at 50% 0%, #3F5B49 0%, #223327 48%, #14201A 100%)',
        }} />
      )}
      {/* 텍스트 가독성용 그라데이션 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(20,24,18,0.30) 0%, rgba(20,24,18,0.35) 40%, rgba(14,17,12,0.86) 100%)',
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
              fontFamily: "'Gowun Batang', 'Pretendard', serif",
              fontSize: 'clamp(38px, 9vw, 62px)',
              fontWeight: 700, color: '#F6F1E4', margin: 0, lineHeight: 1.35,
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
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              marginTop: 28, fontSize: 13, letterSpacing: 1, color: 'rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.4)' }} />
            {CONTENT.hero.timestamp}
            <span style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.4)' }} />
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ marginTop: 28 }}
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
    <div style={{ fontSize: 12, letterSpacing: 3, color: '#A8623F', fontWeight: 700, marginBottom: 10 }}>
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
          background: 'linear-gradient(160deg, #6B8A76, #2C3F33)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, boxShadow: '0 10px 24px rgba(44,63,51,0.25)',
        }}>
          🧳
        </div>
        <SectionEyebrow text={CONTENT.story.eyebrow} />
        <h2 style={{
          fontFamily: "'Gowun Batang', 'Pretendard', serif", fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: 700, color: '#2C2620', margin: '0 0 24px',
        }}>
          {CONTENT.story.title}
        </h2>
        <p style={{
          fontFamily: "'Gowun Batang', 'Pretendard', serif", fontSize: 19, color: '#7A5A45',
          lineHeight: 1.7, marginBottom: 32,
        }}>
          {CONTENT.story.quote}
        </p>
      </Reveal>

      {CONTENT.story.paragraphs.map((p, i) => (
        <Reveal key={i} delay={0.1 + i * 0.1}>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#6B6154', marginTop: i === 0 ? 0 : 12 }}>{p}</p>
        </Reveal>
      ))}

      <Reveal delay={0.3}>
        <div style={{ marginTop: 28, fontSize: 14, color: '#A8623F', fontStyle: 'italic' }}>
          {CONTENT.story.signature}
        </div>
      </Reveal>
    </section>
  );
}

// 스크롤을 내리면 여행 사진 사이를 지나가듯, 큰 사진 한 장 + 짧은 순간의 문장으로 구성된 장면.
function PhotoScene({ scene }: { scene: { timestamp: string; line: string; image: string } }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [-60, 60]);

  return (
    <div ref={sceneRef} style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      <motion.img
        src={scene.image}
        alt={scene.line}
        style={{
          position: 'absolute', inset: '-8% 0', width: '100%', height: '116%',
          objectFit: 'cover', y,
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(14,17,12,0.15) 0%, rgba(14,17,12,0.1) 55%, rgba(14,17,12,0.72) 100%)',
      }} />
      <div style={{
        position: 'relative', zIndex: 1, height: '100%', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        textAlign: 'center', padding: '0 24px 72px',
      }}>
        <Reveal>
          <div style={{
            fontSize: 13, letterSpacing: 1.5, color: 'rgba(255,255,255,0.65)',
            marginBottom: 14, fontWeight: 600,
          }}>
            {scene.timestamp}
          </div>
          <p style={{
            fontFamily: "'Gowun Batang', 'Pretendard', serif", fontSize: 'clamp(20px, 4vw, 28px)',
            color: '#F6F1E4', maxWidth: 460, lineHeight: 1.6, margin: 0,
            textShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            {scene.line}
          </p>
        </Reveal>
      </div>
    </div>
  );
}

function MomentFinder({ menus }: { menus: MenuWithOptions[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const matched = selected ? menus.filter(m => m.tags?.includes(selected)) : [];

  return (
    <section style={{ padding: '80px 24px 120px', background: '#EDE6D6' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <SectionEyebrow text={CONTENT.finder.eyebrow} />
            <h2 style={{
              fontFamily: "'Gowun Batang', 'Pretendard', serif", fontSize: 'clamp(24px, 5vw, 32px)',
              fontWeight: 700, color: '#2C2620', margin: '0 0 10px',
            }}>
              {CONTENT.finder.title}
            </h2>
            <p style={{ fontSize: 14, color: '#8A8073' }}>{CONTENT.finder.subtitle}</p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
            {CAFE_TAGS.map(tag => {
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
                    border: active ? '2px solid #4A6656' : '1.5px solid #DCD2BC',
                    background: active ? '#2C3F33' : '#FFFDF8',
                    boxShadow: active ? '0 10px 24px rgba(44,63,51,0.28)' : '0 4px 12px rgba(44,63,51,0.06)',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{tag.icon}</span>
                  <span style={{
                    fontFamily: "'Gowun Batang', 'Pretendard', serif", fontSize: 14, fontWeight: 700,
                    color: active ? '#F6F1E4' : '#3B3328',
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
              style={{ textAlign: 'center', color: '#B0A691', fontSize: 14, padding: '20px 0' }}
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
                  borderRadius: 24, border: '1px solid #DCD2BC', color: '#8A8073', fontSize: 14,
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
                        border: '1px solid #E4DAC4', boxShadow: '0 10px 24px rgba(44,63,51,0.10)',
                      }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#DED2BB', position: 'relative' }}>
                        {menu.image_url
                          ? <img src={menu.image_url} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>☕</div>}
                      </div>
                      <div style={{ padding: '16px 16px 18px' }}>
                        <div style={{ fontFamily: "'Gowun Batang', 'Pretendard', serif", fontSize: 17, fontWeight: 700, color: '#2C2620' }}>{menu.name}</div>
                        <div style={{ fontFamily: "'Gowun Batang', 'Pretendard', serif", fontSize: 15, fontWeight: 700, color: '#A8623F', marginTop: 6 }}>{fmt(menu.price)}</div>
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
      background: 'radial-gradient(130% 100% at 50% 100%, #3F5B49 0%, #223327 48%, #14201A 100%)',
    }}>
      <Reveal>
        <h2 style={{
          fontFamily: "'Gowun Batang', 'Pretendard', serif", fontSize: 'clamp(24px, 5vw, 34px)',
          fontWeight: 700, color: '#F6F1E4', margin: '0 0 14px',
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
    <Link href={`/order/${CAFE_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
      <motion.span
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '18px 40px', borderRadius: 999,
          background: '#F6F1E4', color: '#2C2620',
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
        <Link href={`/order/${CAFE_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 999,
              background: '#2C3F33', color: '#F6F1E4',
              fontSize: 15, fontWeight: 700,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            ☕ {CONTENT.cta.button}
          </motion.span>
        </Link>
      </motion.div>
    </>
  );
}
