// GET /api/migrate-hotel — 서울호텔 스토어 초기 세팅 (1회 실행)
import { query, queryOne } from '@/lib/db';
import { ok, serverError } from '@/lib/response';

const SLUG = 'seoul-hotel';

export async function GET() {
  try {
    const results: string[] = [];

    // 1. 스토어 생성 (없을 때만)
    let store = await queryOne<{ id: string }>(
      `SELECT id FROM stores WHERE slug = $1`, [SLUG]
    );
    if (!store) {
      const rows = await query<{ id: string }>(
        `INSERT INTO stores (name, slug, is_open, notice, phone)
         VALUES ('JC 호텔 룸서비스', $1, true, '24시간 룸서비스를 이용하실 수 있습니다', '043-000-0000')
         RETURNING id`,
        [SLUG]
      );
      store = rows[0];
      results.push(`✅ 스토어 생성: ${store.id}`);
    } else {
      results.push(`ℹ️  스토어 이미 존재: ${store.id}`);
    }
    const storeId = store.id;

    // 2. 카테고리 (없을 때만)
    const ensureCat = async (name: string, sort: number) => {
      const ex = await queryOne<{ id: string }>(
        `SELECT id FROM categories WHERE store_id = $1 AND name = $2`, [storeId, name]
      );
      if (ex) { results.push(`ℹ️  카테고리 이미 존재: ${name}`); return ex.id; }
      const r = await query<{ id: string }>(
        `INSERT INTO categories (store_id, name, sort_order, is_active) VALUES ($1,$2,$3,true) RETURNING id`,
        [storeId, name, sort]
      );
      results.push(`✅ 카테고리 생성: ${name}`);
      return r[0].id;
    };
    await ensureCat('🍷 주류 & 음료', 1);
    await ensureCat('🍕 퀵안주', 2);
    await ensureCat('📦 패키지', 3);

    // 3. 객실 등록 101~150호 (qr_token = 방번호, 예: '101')
    const floors = [
      { label: '1층', start: 101, end: 110 },
      { label: '2층', start: 111, end: 120 },
      { label: '3층', start: 121, end: 130 },
      { label: '4층', start: 131, end: 140 },
      { label: '5층', start: 141, end: 150 },
    ];
    let created = 0;
    let sortOrder = 0;
    for (const floor of floors) {
      for (let r = floor.start; r <= floor.end; r++) {
        sortOrder++;
        const roomStr = r.toString();
        const ex = await queryOne<{ id: string }>(
          `SELECT id FROM tables WHERE store_id=$1 AND table_number=$2`, [storeId, roomStr]
        );
        if (!ex) {
          await query(
            `INSERT INTO tables (id, store_id, table_number, room_type, status, seat_count, is_active, sort_order, qr_token)
             VALUES (gen_random_uuid(),$1,$2,'standard','empty',2,true,$3,$4)`,
            [storeId, roomStr, sortOrder, roomStr]
          );
          created++;
        }
      }
    }
    results.push(`✅ 객실 등록: ${created}개 (101~150호)`);

    return ok({ results });
  } catch (err) {
    return serverError(err);
  }
}
