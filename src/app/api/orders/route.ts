// POST /api/orders — 주문 생성
import { NextRequest } from 'next/server';
import { withTransaction } from '@/lib/db';
import { ok, fail, serverError } from '@/lib/response';
import { emitToStore, emitToKds } from '@/lib/ws-emit';
import type { PoolClient } from 'pg';

interface OrderItemInput {
  menuId: string;
  quantity: number;
  selectedOptionIds: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, tableId, type = 'dine_in', items, requestNote } = body;

    // ── 유효성 검사 ──────────────────────────────────────
    if (!storeId)               return fail('storeId가 필요합니다');
    if (!items?.length)         return fail('주문 항목이 없습니다');
    if (type === 'dine_in' && !tableId) return fail('테이블 정보가 필요합니다');

    const order = await withTransaction(async (client: PoolClient) => {

      // 1. 가맹점 영업 여부 확인
      const { rows: [store] } = await client.query(
        `SELECT id, is_open FROM stores WHERE id = $1`, [storeId]
      );
      if (!store)         throw new Error('가맹점을 찾을 수 없습니다');
      if (!store.is_open) throw new Error('현재 영업 중이 아닙니다');

      // 2. 메뉴 및 옵션 가격 서버사이드 계산
      let totalPrice = 0;
      const resolvedItems = [];

      for (const item of items as OrderItemInput[]) {
        const { rows: [menu] } = await client.query(
          `SELECT id, name, price, is_soldout FROM menus
           WHERE id = $1 AND store_id = $2 AND is_active = true`,
          [item.menuId, storeId]
        );
        if (!menu)          throw new Error(`메뉴를 찾을 수 없습니다: ${item.menuId}`);
        if (menu.is_soldout) throw new Error(`품절된 메뉴입니다: ${menu.name}`);

        // 선택된 옵션 가격 합산
        let optionExtra = 0;
        const selectedOptions = [];

        if (item.selectedOptionIds?.length) {
          const { rows: opts } = await client.query(
            `SELECT o.id, o.name, o.extra_price, o.is_soldout
             FROM options o
             JOIN option_groups og ON og.id = o.group_id
             WHERE o.id = ANY($1) AND og.menu_id = $2`,
            [item.selectedOptionIds, item.menuId]
          );
          for (const opt of opts) {
            if (opt.is_soldout) throw new Error(`품절된 옵션입니다: ${opt.name}`);
            optionExtra += opt.extra_price;
            selectedOptions.push({ name: opt.name, extra_price: opt.extra_price });
          }
        }

        const unitPrice  = menu.price;
        const itemTotal  = (unitPrice + optionExtra) * item.quantity;
        totalPrice      += itemTotal;

        resolvedItems.push({
          menuId: menu.id, menuName: menu.name, unitPrice,
          quantity: item.quantity, selectedOptions, itemTotal,
        });
      }

      // 3. 당일 주문번호 채번
      const { rows: [seq] } = await client.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 2) AS INT)), 0) + 1 AS next
         FROM orders
         WHERE store_id = $1 AND created_at::DATE = CURRENT_DATE`,
        [storeId]
      );
      const orderNumber = `#${String(seq.next).padStart(4, '0')}`;

      // 4. orders INSERT
      const { rows: [newOrder] } = await client.query(
        `INSERT INTO orders
           (store_id, table_id, order_number, type, status, total_price,
            payment_status, request_note)
         VALUES ($1,$2,$3,$4,'pending',$5,'unpaid',$6)
         RETURNING id, order_number, total_price, status, created_at`,
        [storeId, tableId ?? null, orderNumber, type, totalPrice, requestNote ?? null]
      );

      // 5. order_items INSERT
      for (const ri of resolvedItems) {
        await client.query(
          `INSERT INTO order_items
             (order_id, menu_id, menu_name, unit_price, quantity,
              selected_options, item_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [newOrder.id, ri.menuId, ri.menuName, ri.unitPrice,
           ri.quantity, JSON.stringify(ri.selectedOptions), ri.itemTotal]
        );
      }

      // 6. 테이블 상태 → occupied
      if (tableId) {
        await client.query(
          `UPDATE tables SET status = 'occupied' WHERE id = $1`, [tableId]
        );
      }

      return { ...newOrder, storeId };
    });

    // 실시간 알림 (대시보드 + KDS)
    await emitToStore(order.storeId, 'order:new', {
      id:           order.id,
      order_number: order.order_number,
      total_price:  order.total_price,
      status:       'pending',
      type,
      table_id:     tableId ?? null,
      items:        resolvedItems.map(i => ({
        menu_name: i.menuName, quantity: i.quantity, item_total: i.itemTotal,
      })),
    });
    await emitToKds(order.storeId, 'order:new', {
      id: order.id, order_number: order.order_number,
    });

    return ok({ order }, 201);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '주문 처리 중 오류가 발생했습니다';
    // 비즈니스 에러 (품절, 영업 종료 등)
    if (['품절', '영업', '찾을 수 없습니다'].some(k => msg.includes(k))) {
      return fail(msg);
    }
    return serverError(err);
  }
}
