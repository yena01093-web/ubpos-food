// GET /api/store/[slug]/menu
// 손님 주문 페이지용 - 카테고리 + 메뉴 + 옵션 한 번에 반환
import { NextRequest } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { ok, notFound, serverError } from '@/lib/response';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // 1. 가맹점 조회
    const store = await queryOne<{
      id: string; name: string; logo_url: string | null;
      is_open: boolean; notice: string | null; phone: string | null;
    }>(
      `SELECT id, name, logo_url, is_open, notice, phone
       FROM stores WHERE slug = $1`,
      [params.slug]
    );
    if (!store) return notFound('가맹점을 찾을 수 없습니다');

    // 2. 카테고리 조회
    const categories = await query<{ id: string; name: string; sort_order: number; image_url: string | null }>(
      `SELECT id, name, sort_order, image_url
       FROM categories
       WHERE store_id = $1 AND is_active = true
       ORDER BY sort_order`,
      [store.id]
    );

    // 3. 메뉴 + 옵션 조회 (한 번의 쿼리로)
    const menus = await query<{
      menu_id: string; menu_name: string; description: string | null;
      price: number; image_url: string | null; is_soldout: boolean;
      sort_order: number; category_id: string | null;
      og_id: string | null; og_name: string | null;
      og_required: boolean | null; og_max: number | null; og_sort: number | null;
      opt_id: string | null; opt_name: string | null;
      opt_extra: number | null; opt_soldout: boolean | null; opt_sort: number | null;
    }>(
      `SELECT
         m.id           AS menu_id,
         m.name         AS menu_name,
         m.description,
         m.price,
         m.image_url,
         m.is_soldout,
         m.sort_order,
         m.category_id,
         og.id          AS og_id,
         og.name        AS og_name,
         og.is_required AS og_required,
         og.max_select  AS og_max,
         og.sort_order  AS og_sort,
         o.id           AS opt_id,
         o.name         AS opt_name,
         o.extra_price  AS opt_extra,
         o.is_soldout   AS opt_soldout,
         o.sort_order   AS opt_sort
       FROM menus m
       LEFT JOIN option_groups og ON og.menu_id = m.id
       LEFT JOIN options o        ON o.group_id = og.id
       WHERE m.store_id = $1 AND m.is_active = true
       ORDER BY m.sort_order, og.sort_order, o.sort_order`,
      [store.id]
    );

    // 4. 메뉴 데이터 조립 (flat rows → nested)
    const menuMap = new Map<string, {
      id: string; name: string; description: string | null;
      price: number; image_url: string | null; is_soldout: boolean;
      sort_order: number; category_id: string | null;
      option_groups: Map<string, {
        id: string; name: string; is_required: boolean;
        max_select: number; sort_order: number;
        options: { id: string; name: string; extra_price: number; is_soldout: boolean; sort_order: number }[];
      }>;
    }>();

    for (const row of menus) {
      if (!menuMap.has(row.menu_id)) {
        menuMap.set(row.menu_id, {
          id: row.menu_id, name: row.menu_name,
          description: row.description, price: row.price,
          image_url: row.image_url, is_soldout: row.is_soldout,
          sort_order: row.sort_order, category_id: row.category_id,
          option_groups: new Map(),
        });
      }
      const menu = menuMap.get(row.menu_id)!;

      if (row.og_id && !menu.option_groups.has(row.og_id)) {
        menu.option_groups.set(row.og_id, {
          id: row.og_id, name: row.og_name!,
          is_required: row.og_required!, max_select: row.og_max!,
          sort_order: row.og_sort!, options: [],
        });
      }
      if (row.og_id && row.opt_id) {
        menu.option_groups.get(row.og_id)!.options.push({
          id: row.opt_id, name: row.opt_name!,
          extra_price: row.opt_extra!, is_soldout: row.opt_soldout!,
          sort_order: row.opt_sort!,
        });
      }
    }

    // 5. 카테고리에 메뉴 연결
    const result = categories.map(cat => ({
      ...cat,
      menus: [...menuMap.values()]
        .filter(m => m.category_id === cat.id)
        .map(m => ({
          ...m,
          option_groups: [...m.option_groups.values()],
        }))
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

    return ok({ store, categories: result });
  } catch (err) {
    return serverError(err);
  }
}
