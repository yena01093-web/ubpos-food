// POST /api/kitchen-print
// 주문 데이터 받아서 EUC-KR 인코딩된 ESC/POS 바이트를 base64로 반환
import { NextRequest } from 'next/server';
import iconv from 'iconv-lite';

export async function POST(req: NextRequest) {
  try {
    const order = await req.json();

    const now = new Date();
    const hh  = now.getHours().toString().padStart(2, '0');
    const mm  = now.getMinutes().toString().padStart(2, '0');

    const ko = (text: string) => iconv.encode(text, 'CP949');
    const b  = (...n: number[]) => Buffer.from(n);
    const LF = b(0x0A);

    const parts: Buffer[] = [
      b(0x1B, 0x40),              // ESC @ 초기화
      b(0x1B, 0x61, 0x01),        // 가운데 정렬
      b(0x1B, 0x45, 0x01),        // 볼드 ON
      ko('슈퍼크리스피 제천점'), LF,
      b(0x1B, 0x45, 0x00),        // 볼드 OFF
      ko('주방영수증'), LF,
      ko('--------------------------------'), LF,

      b(0x1D, 0x21, 0x11),        // 2배 크기
      b(0x1B, 0x61, 0x01),        // 가운데
      Buffer.from(`#${order.order_number}\n`),

      b(0x1D, 0x21, 0x00),        // 일반 크기
      b(0x1B, 0x61, 0x00),        // 왼쪽 정렬
      ko(order.table_number ? `테이블: ${order.table_number}` : '포장'),
      Buffer.from(`  ${hh}:${mm}`), LF,
      ko('--------------------------------'), LF,
    ];

    for (const item of (order.items ?? [])) {
      const name = String(item.menu_name ?? '');
      const qty  = `x${item.quantity}`;
      // 이름 왼쪽, 수량 오른쪽 (32컬럼 기준)
      const pad  = Math.max(1, 28 - Buffer.byteLength(ko(name)));
      parts.push(ko(name));
      parts.push(Buffer.from(' '.repeat(pad) + qty));
      parts.push(LF);
    }

    parts.push(ko('--------------------------------'), LF);

    if (order.request_note) {
      parts.push(ko(`메모: ${order.request_note}`), LF);
    }

    parts.push(b(0x0A, 0x0A, 0x0A, 0x0A));  // 용지 피드
    parts.push(b(0x1D, 0x56, 0x41, 0x00));   // 풀 컷

    const combined = Buffer.concat(parts);
    return new Response(combined.toString('base64'), {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err) {
    return new Response('error', { status: 500 });
  }
}
