# ubpos Food 🍔

> QR 주문 · 사장님 대시보드 · 주방 KDS · 나이스페이먼츠 결제 연동

---

## 폴더 구조

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts       # POST  로그인
│   │   │   ├── refresh/route.ts     # POST  토큰 갱신
│   │   │   └── me/route.ts          # GET   내 정보
│   │   ├── store/[slug]/
│   │   │   ├── menu/route.ts        # GET   메뉴+옵션 전체
│   │   │   └── table/[qrToken]/route.ts  # GET  QR 테이블 검증
│   │   ├── orders/
│   │   │   ├── route.ts             # POST  주문 생성
│   │   │   └── [orderId]/status/route.ts # PATCH 상태 변경
│   │   └── dashboard/
│   │       └── orders/route.ts      # GET   주문 목록 + 요약
│   ├── order/                       # 손님 주문 페이지 (Phase 2)
│   ├── dashboard/                   # 사장님 대시보드 (Phase 3)
│   └── kds/                         # 주방 KDS (Phase 4)
├── lib/
│   ├── db.ts                        # PostgreSQL 커넥션 풀
│   ├── jwt.ts                       # JWT sign/verify
│   ├── auth.ts                      # 인증 미들웨어 헬퍼
│   └── response.ts                  # API 응답 헬퍼
└── types/
    └── index.ts                     # 공통 타입 정의
```

---

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 편집

# 3. DB 스키마 적용 (Supabase SQL Editor에 붙여넣기)
# ubpos_food_schema_v1.sql

# 4. 개발 서버
npm run dev
```

---

## API 요약

### 인증
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/login` | 로그인 → accessToken + refreshToken |
| POST | `/api/auth/refresh` | 토큰 갱신 |
| GET  | `/api/auth/me` | 내 정보 조회 |

### 손님 주문
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET  | `/api/store/:slug/menu` | 메뉴+옵션 전체 조회 |
| GET  | `/api/store/:slug/table/:qrToken` | 테이블 검증 |
| POST | `/api/orders` | 주문 생성 |

### 대시보드
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET   | `/api/dashboard/orders` | 주문 목록 + 오늘 요약 |
| PATCH | `/api/orders/:id/status` | 주문 상태 변경 |

---

## 주문 상태 전이

```
pending → accepted → cooking → ready → completed
   ↓          ↓
cancelled  cancelled
```

---

## 환경변수

| 키 | 설명 |
|----|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | Access Token 서명 키 |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 키 |
| `NICE_CLIENT_KEY` | 나이스페이먼츠 클라이언트 키 |
| `NICE_SECRET_KEY` | 나이스페이먼츠 시크릿 키 |
| `NICE_MID` | 가맹점 MID (`yena01093m`) |

---

## Phase 로드맵

- [x] **Phase 1** — DB 스키마 / 프로젝트 셋업 / 인증 API / 메뉴 API
- [ ] **Phase 2** — 손님 QR 주문 페이지 + 나이스페이먼츠 결제
- [ ] **Phase 3** — 사장님 대시보드 (실시간 WebSocket)
- [ ] **Phase 4** — 주방 KDS + 매출 대시보드
- [ ] **Phase 5** — 바로고 배달 연동 / 알림톡
