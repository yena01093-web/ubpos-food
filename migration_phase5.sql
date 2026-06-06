-- ============================================================
-- ubpos Food - Phase 5 Migration
-- 바로고 배달 + 알림톡 지원을 위한 컬럼/테이블 추가
-- ============================================================

-- 1. stores 테이블 — 바로고 연동 정보 추가
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS barogo_store_id VARCHAR(100),   -- 바로고 가맹점 ID
  ADD COLUMN IF NOT EXISTS pickup_lat       DECIMAL(10,7), -- 픽업 위치 위도
  ADD COLUMN IF NOT EXISTS pickup_lng       DECIMAL(10,7); -- 픽업 위치 경도

-- 2. orders 테이블 — 배달 관련 컬럼 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_phone   VARCHAR(20),   -- 손님 연락처 (알림톡 수신)
  ADD COLUMN IF NOT EXISTS customer_name    VARCHAR(50),   -- 손님 이름
  ADD COLUMN IF NOT EXISTS barogo_delivery_id VARCHAR(100); -- 바로고 배달 ID

-- 3. delivery_logs 테이블 (바로고 웹훅 이력)
CREATE TABLE IF NOT EXISTS delivery_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_id  VARCHAR(100),                          -- 바로고 배달 ID
  status       VARCHAR(50) NOT NULL,                  -- PENDING/ASSIGNED/PICKED_UP/DELIVERED/CANCELLED
  rider_name   VARCHAR(100),
  rider_phone  VARCHAR(20),
  estimated_at TIMESTAMPTZ,
  raw          JSONB,                                 -- 바로고 웹훅 원본
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_order ON delivery_logs(order_id);

-- 4. alimtalk_logs 테이블 (알림톡 발송 이력)
CREATE TABLE IF NOT EXISTS alimtalk_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID REFERENCES orders(id) ON DELETE SET NULL,
  phone        VARCHAR(20) NOT NULL,
  template_id  VARCHAR(100) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'sent',  -- sent / failed
  error_msg    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_order ON alimtalk_logs(order_id);

-- 5. .env.example 추가 환경변수 확인용 주석
-- BAROGO_API_URL=https://api.barogo.com
-- BAROGO_API_KEY=your_barogo_api_key
-- BAROGO_API_SECRET=your_barogo_api_secret
-- BAROGO_WEBHOOK_SECRET=your_webhook_secret
-- SOLAPI_API_KEY=your_solapi_api_key
-- SOLAPI_API_SECRET=your_solapi_api_secret
-- KAKAO_SENDER_KEY=your_kakao_sender_profile_key
-- SENDER_PHONE=0431234567
-- KAKAO_TMPL_ORDER_ACCEPTED=your_template_id
-- KAKAO_TMPL_ORDER_READY=your_template_id
-- KAKAO_TMPL_DELIVERY_ASSIGNED=your_template_id
-- KAKAO_TMPL_DELIVERY_DONE=your_template_id
-- KAKAO_TMPL_ORDER_CANCELLED=your_template_id
