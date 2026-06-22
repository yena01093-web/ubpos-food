// GET /api/migrate — production DB migration runner
// REMOVE THIS FILE after migrations are complete
import { query } from '@/lib/db';
import { ok, serverError } from '@/lib/response';

export async function GET() {
  try {
    const results: string[] = [];

    await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT`);
    results.push('categories.image_url: OK');

    const stores = await query<{ id: string }>(
      `SELECT id FROM stores WHERE slug = 'supercrispy-jc'`
    );
    if (stores.length === 0) {
      results.push('store not found');
      return ok({ results });
    }
    const storeId = stores[0].id;

    const cats = await query<{ id: string; name: string; sort_order: number }>(
      `SELECT id, name, sort_order FROM categories WHERE store_id = $1 ORDER BY sort_order`,
      [storeId]
    );
    results.push(`현재 카테고리: ${cats.map(c => `${c.name}(${c.sort_order})`).join(', ')}`);

    const ensure = async (name: string, sortOrder: number): Promise<string> => {
      const existing = cats.find(c => c.name === name);
      if (existing) {
        await query(`UPDATE categories SET sort_order = $1, is_active = true WHERE id = $2`, [sortOrder, existing.id]);
        return existing.id;
      }
      const rows = await query<{ id: string }>(
        `INSERT INTO categories (store_id, name, sort_order, is_active) VALUES ($1, $2, $3, true) RETURNING id`,
        [storeId, name, sortOrder]
      );
      results.push(`✅ ${name} 카테고리 생성`);
      return rows[0].id;
    };

    // 1. 카테고리 순서 설정
    // 치킨(1) → 순살치킨(2) → 콤보팩(3) → 버거(4) → 세트(5) → 사이드(6) → 음료·소스(7)
    const chickenId  = await ensure('치킨', 1);
    const sunsalId   = await ensure('순살치킨', 2);
    const comboPakId = await ensure('콤보팩', 3);
    await ensure('버거', 4);
    await ensure('세트', 5);
    const sideId     = await ensure('사이드', 6);

    const drinkCat = cats.find(c => c.name === '음료' || c.name === '음료·소스');
    if (drinkCat) {
      await query(`UPDATE categories SET name = '음료·소스', sort_order = 7 WHERE id = $1`, [drinkCat.id]);
    } else {
      await query(
        `INSERT INTO categories (store_id, name, sort_order, is_active) VALUES ($1, '음료·소스', 7, true)`,
        [storeId]
      );
      results.push('✅ 음료·소스 생성');
    }
    results.push('카테고리 순서 완료: 치킨(1)→순살치킨(2)→콤보팩(3)→버거(4)→세트(5)→사이드(6)→음료·소스(7)');

    // 2. 사이드 메뉴 → 사이드 카테고리 (어느 카테고리에 있든 이름 패턴으로 이동)
    const sidePatterns = [
      '%감자%',        // 감자튀김, 양념감자
      '%치즈스틱%',    // 해피 치즈스틱
      '%치즈볼%',      // 퐁듀모짜치즈볼, 달마치 치즈볼비타
      '%너겟%',        // 치킨너겟
      '%텐더%',        // 치킨텐더
      '%샐러드%',      // 치킨샐러드
      '%크리스피 찰%', // 크리스피 찰
      '%파이%',        // 에플시나몬파이, 치킨파이
    ];
    const sideCond = sidePatterns.map((_, i) => `name ILIKE $${i + 3}`).join(' OR ');
    const sideMoved = await query<{ name: string }>(
      `UPDATE menus SET category_id = $1
       WHERE store_id = $2
         AND category_id != $1
         AND (${sideCond})
       RETURNING name`,
      [sideId, storeId, ...sidePatterns]
    );
    results.push(`사이드 메뉴 → 사이드: ${sideMoved.length}개`);
    if (sideMoved.length > 0) results.push(sideMoved.map(m => m.name).join(', '));

    // 3. 한마리 메뉴 → 치킨 (순살 제외)
    const chickenMoved = await query<{ name: string }>(
      `UPDATE menus SET category_id = $1
       WHERE store_id = $2
         AND category_id != $1
         AND name ILIKE '%한마리%'
         AND name NOT ILIKE '%순살%'
       RETURNING name`,
      [chickenId, storeId]
    );
    results.push(`한마리 메뉴 → 치킨: ${chickenMoved.length}개`);
    if (chickenMoved.length > 0) results.push(chickenMoved.map(m => m.name).join(', '));

    // 4. 순살 메뉴 → 순살치킨 (어느 카테고리에 있든)
    const sunsalMoved = await query<{ name: string }>(
      `UPDATE menus SET category_id = $1
       WHERE store_id = $2
         AND category_id != $1
         AND name ILIKE '%순살%'
       RETURNING name`,
      [sunsalId, storeId]
    );
    results.push(`순살 메뉴 → 순살치킨: ${sunsalMoved.length}개`);
    if (sunsalMoved.length > 0) results.push(sunsalMoved.map(m => m.name).join(', '));

    // 5. 콤보팩/패밀리팩 → 콤보팩 카테고리 + 활성화
    const comboMoved = await query<{ name: string }>(
      `UPDATE menus SET category_id = $1, is_active = true
       WHERE store_id = $2
         AND (name ILIKE '%콤보팩%' OR name ILIKE '%패밀리팩%')
       RETURNING name`,
      [comboPakId, storeId]
    );
    results.push(`콤보팩/패밀리팩 → 콤보팩: ${comboMoved.length}개`);
    if (comboMoved.length > 0) results.push(comboMoved.map(m => m.name).join(', '));

    // 6. 핫스파이시 치킨버거 → 버거 카테고리, 더블치킨버거 바로 아래
    const burgerId = cats.find(c => c.name === '버거')?.id
      ?? (await query<{ id: string }>(`SELECT id FROM categories WHERE store_id=$1 AND name='버거'`, [storeId]))[0]?.id;

    if (burgerId) {
      // 버거 카테고리 현재 메뉴 순서 조회
      const burgerMenus = await query<{ id: string; name: string; sort_order: number }>(
        `SELECT id, name, sort_order FROM menus
         WHERE store_id=$1 AND category_id=$2
         ORDER BY sort_order`,
        [storeId, burgerId]
      );

      const doubleIdx = burgerMenus.findIndex(m => m.name.includes('더블') && m.name.includes('치킨버거'));
      const insertAfterOrder = doubleIdx >= 0 ? burgerMenus[doubleIdx].sort_order : 0;

      // 더블치킨버거 뒤 항목들 sort_order + 1
      if (doubleIdx >= 0) {
        for (const m of burgerMenus.slice(doubleIdx + 1)) {
          await query(`UPDATE menus SET sort_order=$1 WHERE id=$2`, [m.sort_order + 1, m.id]);
        }
      }

      // 핫스파이시 치킨버거 이동 + sort_order 설정
      const hotspicy = await query<{ name: string }>(
        `UPDATE menus SET category_id=$1, sort_order=$2
         WHERE store_id=$3 AND name ILIKE '%핫스파이시%치킨버거%'
           AND name NOT ILIKE '%세트%'
         RETURNING name`,
        [burgerId, insertAfterOrder + 1, storeId]
      );
      results.push(`핫스파이시 치킨버거 → 버거 카테고리 (더블치킨버거 아래): ${hotspicy.map(m => m.name).join(', ') || '해당 메뉴 없음'}`);
    } else {
      results.push('⚠️ 버거 카테고리 없음');
    }

    return ok({ results });
  } catch (err) {
    return serverError(err);
  }
}
