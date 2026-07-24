'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { CAFE2_SLUG, injectCafe2Font } from '@/lib/cafe2Font';
import { CAFE2_TAGS } from '@/lib/cafe2Tags';
import type { CategoryWithMenus, MenuWithOptions } from '@/types';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

// 실제 대표 사진(store.logo_url)이 설정되기 전까지 쓰는 임시 히어로 이미지입니다.
// 실제 매장 사진으로 교체하시려면 이 URL만 바꾸시거나, store.logo_url을 설정해주세요.
const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1658592560895-734960787ca8?auto=format&fit=crop&w=1600&q=80';

// 카세트 A/B면처럼 이어지는 두 장면 — 젖은 거리의 네온 → 도심의 블루 네온 골목.
// 매장 실제 사진이 준비되면 image만 교체하면 됩니다.
const JOURNEY_SCENES = [
  {
    timestamp: 'SIDE A · 자정의 네온',
    line: '젖은 거리 위로 번지는 네온, 오늘 밤의 첫 장면',
    image: 'https://images.unsplash.com/photo-1526361547623-9dd08c979bb1?auto=format&fit=crop&w=1600&q=80',
  },
  {
    timestamp: 'SIDE B · 도시의 야상곡',
    line: '멀리서 들려오는 멜로디처럼, 골목마다 불빛이 흐르고',
    image: 'https://images.unsplash.com/photo-1671877256664-259292ead848?auto=format&fit=crop&w=1600&q=80',
  },
];

// 아래 문구/카피는 전부 이 객체 하나에 모아뒀습니다. 실제 브랜드 톤에 맞게
// 자유롭게 바꿔주세요 — 나머지 레이아웃/애니메이션 코드는 건드릴 필요 없습니다.
const CONTENT = {
  hero: {
    eyebrow: 'MIDNIGHT CITY POP',
    timestamp: 'NOW PLAYING · 자정의 드라이브',
    title: '오래된 미래,\n네온 속으로',
    subtitle: '80년대의 밤을 닮은, 시티팝 무드의 카페',
  },
  story: {
    eyebrow: 'REWIND',
    title: '테이프에 담긴 밤',
    quote: '"낡은 카세트를 되감듯, 그 시절 밤의 온도를 다시 틀어드립니다."',
    paragraphs: [
      '늦은 밤 라디오에서 흘러나오던 시티팝, 어딘가 촌스럽지만 세련됐던 그 시절의 공기를 좋아합니다.',
      '네온 간판, 낡은 턴테이블, 살짝 늘어진 테이프 소리 — 그 무드를 그대로 담아 이 공간을 만들었습니다.',
      '오늘 밤도 어딘가에서 낡은 노래가 다시 재생되고 있다고 생각하면, 이곳에 오시는 발걸음이 조금 더 즐거워질 거예요.',
    ],
    signature: '- 카페 드림',
  },
  finder: {
    eyebrow: 'SIDE B: REQUEST',
    title: '지금 이 밤에 어울리는 한 잔',
    subtitle: '오늘 밤 플레이리스트에 맞는 메뉴를 골라보세요',
    empty: '아직 이 무드에 어울리는 메뉴를 준비 중이에요. 곧 만나요 🌴',
    prompt: '위에서 오늘 밤의 무드를 골라보세요',
  },
  cta: {
    title: '오늘 밤, 이 무드 그대로',
    subtitle: '네온 불빛 아래서 즐기는 나만의 시간',
    button: '주문하러 가기',
  },
};

export default function Cafe2Landing() {
  const [store, setStore] = useState<{ name: string; notice: string | null; logo_url: string | null }>({
    name: '카페',
    notice: null,
    logo_url: null,
  });
  const [categories, setCategories] = useState<CategoryWithMenus[]>([]);

  useEffect(() => {
    injectCafe2Font();
    (async () => {
      try {
        const res = await fetch(`/api/store/${CAFE2_SLUG}/menu`);
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
    <div style={{ background: '#120A24', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      <Hero store={store} />
      <StorySection />
      {JOURNEY_SCENES.map((scene, i) => (
        <PhotoScene key={i} scene={scene} />
      ))}
      <MoodFinder menus={allMenus} />
      <ClosingCTA />
      <StickyOrderButton />
    </div>
  );
}

// 사진 위에 스캔라인 + 자홍/청록 듀오톤 오버레이를 겹쳐 낡은 VHS/인화지 느낌을 낸다.
function VintageOverlay() {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(120deg, rgba(255,46,154,0.22) 0%, rgba(0,0,0,0) 45%, rgba(46,230,214,0.18) 100%)',
        mixBlendMode: 'color-dodge',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)',
        mixBlendMode: 'multiply', opacity: 0.5,
      }} />
    </>
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
            filter: 'saturate(1.35) contrast(1.08) brightness(0.92) sepia(0.12) hue-rotate(-6deg)',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 90% at 50% 100%, #4A1A6B 0%, #24123F 45%, #0D0618 100%)',
        }} />
      )}
      {showPhoto && <VintageOverlay />}
      {/* 텍스트 가독성용 그라데이션 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(10,4,20,0.25) 0%, rgba(10,4,20,0.35) 40%, rgba(8,3,16,0.92) 100%)',
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
              fontSize: 12, letterSpacing: 4, color: '#2EE6D6', marginBottom: 18, fontWeight: 700,
              textShadow: '0 0 12px rgba(46,230,214,0.7)',
            }}
          >
            {CONTENT.hero.eyebrow}
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              fontFamily: "'Black Han Sans', 'Pretendard', sans-serif",
              fontSize: 'clamp(38px, 9vw, 64px)',
              fontWeight: 400, color: '#FFF6FC', margin: 0, lineHeight: 1.3,
              whiteSpace: 'pre-line',
              textShadow: '0 0 10px rgba(255,46,154,0.85), 0 0 32px rgba(155,77,255,0.55), 0 0 64px rgba(46,230,214,0.25)',
            }}
          >
            {CONTENT.hero.title}
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ marginTop: 20, fontSize: 16, lineHeight: 1.8, color: '#D9CBEF', maxWidth: 380 }}
          >
            {store.notice ?? CONTENT.hero.subtitle}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              marginTop: 28, fontSize: 13, letterSpacing: 1, color: '#9B8CC4',
              display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace',
            }}
          >
            <span style={{ width: 20, height: 1, background: 'rgba(155,140,196,0.5)' }} />
            {CONTENT.hero.timestamp}
            <span style={{ width: 20, height: 1, background: 'rgba(155,140,196,0.5)' }} />
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
        style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', color: '#2EE6D6', fontSize: 22, zIndex: 1 }}
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
    <div style={{
      fontSize: 12, letterSpacing: 3, color: '#2EE6D6', fontWeight: 700, marginBottom: 10,
      textShadow: '0 0 10px rgba(46,230,214,0.6)',
    }}>
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
          background: 'linear-gradient(160deg, #FF2E9A, #7B2FF7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, boxShadow: '0 0 32px rgba(255,46,154,0.45), 0 0 64px rgba(123,47,247,0.3)',
        }}>
          📼
        </div>
        <SectionEyebrow text={CONTENT.story.eyebrow} />
        <h2 style={{
          fontFamily: "'Black Han Sans', 'Pretendard', sans-serif", fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: 400, color: '#FFF6FC', margin: '0 0 24px',
        }}>
          {CONTENT.story.title}
        </h2>
        <p style={{
          fontSize: 18, color: '#FF77C2',
          lineHeight: 1.7, marginBottom: 32,
        }}>
          {CONTENT.story.quote}
        </p>
      </Reveal>

      {CONTENT.story.paragraphs.map((p, i) => (
        <Reveal key={i} delay={0.1 + i * 0.1}>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#B9A8D9', marginTop: i === 0 ? 0 : 12 }}>{p}</p>
        </Reveal>
      ))}

      <Reveal delay={0.3}>
        <div style={{ marginTop: 28, fontSize: 14, color: '#2EE6D6', fontStyle: 'italic' }}>
          {CONTENT.story.signature}
        </div>
      </Reveal>
    </section>
  );
}

// 스크롤을 내리면 카세트 A/B면을 넘기듯, 빈티지 필터를 입힌 큰 사진 + 짧은 순간의 문장으로 구성된 장면.
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
          filter: 'saturate(1.35) contrast(1.08) brightness(0.9) sepia(0.12) hue-rotate(-6deg)',
        }}
      />
      <VintageOverlay />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(10,4,20,0.15) 0%, rgba(10,4,20,0.12) 55%, rgba(8,3,16,0.82) 100%)',
      }} />
      <div style={{
        position: 'relative', zIndex: 1, height: '100%', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        textAlign: 'center', padding: '0 24px 72px',
      }}>
        <Reveal>
          <div style={{
            fontSize: 13, letterSpacing: 1.5, color: '#2EE6D6', fontFamily: 'monospace',
            marginBottom: 14, fontWeight: 700, textShadow: '0 0 10px rgba(46,230,214,0.6)',
          }}>
            {scene.timestamp}
          </div>
          <p style={{
            fontFamily: "'Black Han Sans', 'Pretendard', sans-serif", fontSize: 'clamp(20px, 4vw, 28px)',
            color: '#FFF6FC', maxWidth: 460, lineHeight: 1.6, margin: 0, fontWeight: 400,
            textShadow: '0 0 20px rgba(255,46,154,0.5), 0 4px 20px rgba(0,0,0,0.4)',
          }}>
            {scene.line}
          </p>
        </Reveal>
      </div>
    </div>
  );
}

function MoodFinder({ menus }: { menus: MenuWithOptions[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const matched = selected ? menus.filter(m => m.tags?.includes(selected)) : [];

  return (
    <section style={{ padding: '80px 24px 120px', background: '#1A0F30' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <SectionEyebrow text={CONTENT.finder.eyebrow} />
            <h2 style={{
              fontFamily: "'Black Han Sans', 'Pretendard', sans-serif", fontSize: 'clamp(24px, 5vw, 32px)',
              fontWeight: 400, color: '#FFF6FC', margin: '0 0 10px',
            }}>
              {CONTENT.finder.title}
            </h2>
            <p style={{ fontSize: 14, color: '#9B8CC4' }}>{CONTENT.finder.subtitle}</p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
            {CAFE2_TAGS.map(tag => {
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
                    border: active ? '2px solid #FF2E9A' : '1.5px solid #3A2A5C',
                    background: active ? 'linear-gradient(160deg, #FF2E9A, #7B2FF7)' : '#211640',
                    boxShadow: active ? '0 0 28px rgba(255,46,154,0.4)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{tag.icon}</span>
                  <span style={{
                    fontFamily: "'Black Han Sans', 'Pretendard', sans-serif", fontSize: 13, fontWeight: 400,
                    color: active ? '#FFF6FC' : '#B9A8D9',
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
              style={{ textAlign: 'center', color: '#6E5E96', fontSize: 14, padding: '20px 0' }}
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
                  textAlign: 'center', padding: '48px 24px', background: '#211640',
                  borderRadius: 24, border: '1px solid #3A2A5C', color: '#9B8CC4', fontSize: 14,
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
                        background: '#211640', borderRadius: 24, overflow: 'hidden',
                        border: '1px solid #3A2A5C', boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                      }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#2C1E4D', position: 'relative' }}>
                        {menu.image_url
                          ? <img src={menu.image_url} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🌴</div>}
                      </div>
                      <div style={{ padding: '16px 16px 18px' }}>
                        <div style={{ fontFamily: "'Black Han Sans', 'Pretendard', sans-serif", fontSize: 16, fontWeight: 400, color: '#FFF6FC' }}>{menu.name}</div>
                        <div style={{ fontFamily: "'Black Han Sans', 'Pretendard', sans-serif", fontSize: 14, fontWeight: 400, color: '#FF77C2', marginTop: 6 }}>{fmt(menu.price)}</div>
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
      background: 'radial-gradient(130% 100% at 50% 100%, #4A1A6B 0%, #24123F 48%, #0D0618 100%)',
    }}>
      <Reveal>
        <h2 style={{
          fontFamily: "'Black Han Sans', 'Pretendard', sans-serif", fontSize: 'clamp(24px, 5vw, 34px)',
          fontWeight: 400, color: '#FFF6FC', margin: '0 0 14px',
          textShadow: '0 0 20px rgba(255,46,154,0.5)',
        }}>
          {CONTENT.cta.title}
        </h2>
        <p style={{ fontSize: 15, color: '#B9A8D9', marginBottom: 36 }}>{CONTENT.cta.subtitle}</p>
        <OrderButton />
      </Reveal>
    </section>
  );
}

function OrderButton() {
  return (
    <Link href={`/order/${CAFE2_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
      <motion.span
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '18px 40px', borderRadius: 999,
          background: 'linear-gradient(135deg, #FF2E9A, #7B2FF7)', color: '#FFF6FC',
          fontSize: 17, fontWeight: 700,
          boxShadow: '0 0 32px rgba(255,46,154,0.5), 0 10px 28px rgba(0,0,0,0.4)',
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
        <Link href={`/order/${CAFE2_SLUG}/takeout`} style={{ textDecoration: 'none' }}>
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 999,
              background: 'linear-gradient(135deg, #FF2E9A, #7B2FF7)', color: '#FFF6FC',
              fontSize: 15, fontWeight: 700,
              boxShadow: '0 0 24px rgba(255,46,154,0.45), 0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            🌴 {CONTENT.cta.button}
          </motion.span>
        </Link>
      </motion.div>
    </>
  );
}
