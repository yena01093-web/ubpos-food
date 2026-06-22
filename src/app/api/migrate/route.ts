// GET /api/migrate — production DB migration runner
// REMOVE THIS FILE after migrations are complete
import { query } from '@/lib/db';
import { ok, serverError } from '@/lib/response';

export async function GET() {
  try {
    const results: string[] = [];

    // 1. Add image_url column to categories (idempotent)
    await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT`);
    results.push('categories.image_url: OK');

    // 2. Find store
    const stores = await query<{ id: string }>(
      `SELECT id FROM stores WHERE slug = 'supercrispy-jc'`
    );
    if (stores.length === 0) {
      results.push('store supercrispy-jc not found');
      return ok({ results });
    }
    const storeId = stores[0].id;

    // 3. Read current categories
    const cats = await query<{ id: string; name: string; sort_order: number }>(
      `SELECT id, name, sort_order FROM categories WHERE store_id = $1 ORDER BY sort_order`,
      [storeId]
    );
    results.push(`현재 카테고리: ${cats.map(c => `${c.name}(${c.sort_order})`).join(', ')}`);

    // Helper: get existing id or insert new category
    const ensure = async (name: string, sortOrder: number): Promise<string> => {
      const existing = cats.find(c => c.name === name);
      if (existing) {
        await query(
          `UPDATE categories SET sort_order = $1, is_active = true WHERE id = $2`,
          [sortOrder, existing.id]
        );
        return existing.id;
      }
      const rows = await query<{ id: string }>(
        `INSERT INTO categories (store_id, name, sort_order, is_active)
         VALUES ($1, $2, $3, true) RETURNING id`,
        [storeId, name, sortOrder]
      );
      results.push(`✅ ${name} 카테고리 생성 (sort_order=${sortOrder})`);
      return rows[0].id;
    };

    // 4. 목표 카테고리 순서 설정
    // 치킨(1) → 순살치킨(2) → 콤보팩(3) → 버거(4) → 세트(5) → 사이드(6) → 음료·소스(7)
    const chickenId  = await ensure('치킨', 1);
    const sunsalId   = await ensure('순살치킨', 2);
    const comboPakId = await ensure('콤보팩', 3);
    await ensure('버거', 4);
    await ensure('세트', 5);
    await ensure('사이드', 6);

    // 음료 or 음료·소스 → 음료·소스 (sort_order=7)
    const drinkCat = cats.find(c => c.name === '음료' || c.name === '음료·소스');
    if (drinkCat) {
      await query(
        `UPDATE categories SET name = '음료·소스', sort_order = 7 WHERE id = $1`,
        [drinkCat.id]
      );
    } else {
      await query(
        `INSERT INTO categories (store_id, name, sort_order, is_active) VALUES ($1, '음료·소스', 7, true)`,
        [storeId]
      );
      results.push('✅ 음료·소스 카테고리 생성');
    }
    results.push('카테고리 순서 완료: 치킨(1)→순살치킨(2)→콤보팩(3)→버거(4)→세트(5)→사이드(6)→음료·소스(7)');

    // 5. 치킨 카테고리의 순살 메뉴 → 순살치킨 (이미 순살치킨에 있으면 스킵)
    const sunsalMoved = await query<{ name: string }>(
      `UPDATE menus SET category_id = $1
       WHERE store_id = $2
         AND name ILIKE '%순살%'
         AND category_id = $3
       RETURNING name`,
      [sunsalId, storeId, chickenId]
    );
    results.push(`순살 메뉴 → 순살치킨: ${sunsalMoved.length}개`);
    if (sunsalMoved.length > 0) results.push(sunsalMoved.map(m => m.name).join(', '));

    // 6. 콤보팩/패밀리팩 → 콤보팩 카테고리 + 활성화 (어느 카테고리에 있든)
    const comboMoved = await query<{ name: string }>(
      `UPDATE menus
       SET category_id = $1, is_active = true
       WHERE store_id = $2
         AND (name ILIKE '%콤보팩%' OR name ILIKE '%패밀리팩%')
       RETURNING name`,
      [comboPakId, storeId]
    );
    results.push(`콤보팩/패밀리팩 → 콤보팩 카테고리: ${comboMoved.length}개`);
    if (comboMoved.length > 0) results.push(comboMoved.map(m => m.name).join(', '));

    return ok({ results });
  } catch (err) {
    return serverError(err);
  }
}
