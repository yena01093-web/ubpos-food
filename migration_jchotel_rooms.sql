-- ================================================================
-- JC호텔 객실 데이터 마이그레이션
-- store_id: cf2d304d-998e-487a-9631-f8765fdae09b
-- ================================================================

-- 1. room_type 컬럼 추가 (없는 경우)
ALTER TABLE tables ADD COLUMN IF NOT EXISTS room_type VARCHAR(50);

-- 2. 가짜 101~150호 삭제
DELETE FROM tables
WHERE store_id = 'cf2d304d-998e-487a-9631-f8765fdae09b'
  AND regexp_replace(table_number, '[^0-9]', '', 'g') != ''
  AND regexp_replace(table_number, '[^0-9]', '', 'g')::integer BETWEEN 101 AND 150;

-- 3. 실제 객실 등록
INSERT INTO tables (id, store_id, table_number, room_type, status, seat_count, is_active, sort_order, qr_token)
VALUES
  -- ── 3층 ──────────────────────────────────────────────────────
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '301', 'superior',        'empty', 2, true,  1, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '302', 'superior',        'empty', 2, true,  2, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '303', 'superior',        'empty', 2, true,  3, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '305', 'superior',        'empty', 2, true,  4, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '306', 'superior',        'empty', 2, true,  5, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '307', 'superior',        'empty', 2, true,  6, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '308', 'superior',        'empty', 2, true,  7, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '309', 'superior_twin',   'empty', 2, true,  8, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '310', 'superior_twin',   'empty', 2, true,  9, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '311', 'standard',        'empty', 2, true, 10, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '312', 'deluxe_2pc',      'empty', 2, true, 11, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '313', 'deluxe_2pc',      'empty', 2, true, 12, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '315', 'deluxe_2pc',      'empty', 2, true, 13, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '316', 'deluxe_twin',     'empty', 2, true, 14, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '317', 'deluxe_twin',     'empty', 2, true, 15, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '318', 'deluxe_twin',     'empty', 2, true, 16, uuid_generate_v4()),

  -- ── 4층 ──────────────────────────────────────────────────────
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '401', 'deluxe_twin',     'empty', 2, true, 17, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '402', 'executive_twin',  'empty', 2, true, 18, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '403', 'superior',        'empty', 2, true, 19, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '405', 'superior',        'empty', 2, true, 20, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '406', 'superior',        'empty', 2, true, 21, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '407', 'superior',        'empty', 2, true, 22, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '408', 'superior_twin',   'empty', 2, true, 23, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '409', 'superior_twin',   'empty', 2, true, 24, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '410', 'standard',        'empty', 2, true, 25, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '411', 'deluxe_spa',      'empty', 2, true, 26, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '412', 'deluxe_spa',      'empty', 2, true, 27, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '413', 'deluxe_spa',      'empty', 2, true, 28, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '415', 'deluxe_twin',     'empty', 2, true, 29, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '416', 'deluxe_twin',     'empty', 2, true, 30, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '417', 'deluxe_twin',     'empty', 2, true, 31, uuid_generate_v4()),

  -- ── 5층 ──────────────────────────────────────────────────────
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '501', 'deluxe_twin',     'empty', 2, true, 32, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '502', 'suite',           'empty', 2, true, 33, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '503', 'superior',        'empty', 2, true, 34, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '505', 'superior',        'empty', 2, true, 35, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '506', 'superior',        'empty', 2, true, 36, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '507', 'superior',        'empty', 2, true, 37, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '508', 'superior_twin',   'empty', 2, true, 38, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '509', 'superior_twin',   'empty', 2, true, 39, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '510', 'standard',        'empty', 2, true, 40, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '511', 'deluxe_family',   'empty', 4, true, 41, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '512', 'deluxe_2pc',      'empty', 2, true, 42, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '513', 'deluxe_family',   'empty', 4, true, 43, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '515', 'executive_family','empty', 4, true, 44, uuid_generate_v4()),
  (uuid_generate_v4(), 'cf2d304d-998e-487a-9631-f8765fdae09b', '516', 'deluxe_family',   'empty', 4, true, 45, uuid_generate_v4());
