// src/lib/alimtalk.ts
// Solapi (구 메시지허브) 카카오 알림톡 발송

const SOLAPI_KEY    = process.env.SOLAPI_API_KEY    ?? '';
const SOLAPI_SECRET = process.env.SOLAPI_API_SECRET ?? '';
const SENDER_KEY    = process.env.KAKAO_SENDER_KEY  ?? '';  // 카카오채널 발신프로필
const SENDER_PHONE  = process.env.SENDER_PHONE      ?? '';  // 발신번호 (SMS 대체발송용)
const SOLAPI_URL    = 'https://api.solapi.com/messages/v4/send';

import crypto from 'crypto';

function makeSolapiAuth() {
  const date   = new Date().toISOString();
  const salt   = crypto.randomBytes(16).toString('hex');
  const hmac   = crypto.createHmac('sha256', SOLAPI_SECRET);
  hmac.update(`${date}${salt}`);
  const sig = hmac.digest('hex');
  return `HMAC-SHA256 apiKey=${SOLAPI_KEY}, date=${date}, salt=${salt}, signature=${sig}`;
}

async function sendSolapi(payload: object) {
  const res = await fetch(SOLAPI_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': makeSolapiAuth(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errorMessage ?? '알림톡 발송 실패');
  return data;
}

// ── 템플릿별 발송 함수 ────────────────────────────────────────────

/** 주문 접수 완료 */
export async function sendOrderAccepted(params: {
  phone:       string;
  orderNumber: string;
  storeName:   string;
  items:       string;   // "후라이드치킨 1개, 콜라 1개"
  totalPrice:  number;
}) {
  return sendSolapi({
    message: {
      to:   params.phone,
      from: SENDER_PHONE,
      kakaoOptions: {
        pfId:        SENDER_KEY,
        templateId:  process.env.KAKAO_TMPL_ORDER_ACCEPTED,
        variables: {
          '#{가게명}':    params.storeName,
          '#{주문번호}':  params.orderNumber,
          '#{주문내역}':  params.items,
          '#{결제금액}':  params.totalPrice.toLocaleString('ko-KR') + '원',
        },
      },
    },
  });
}

/** 조리 완료 / 서빙 준비 */
export async function sendOrderReady(params: {
  phone:       string;
  orderNumber: string;
  storeName:   string;
  tableNumber?: string;
}) {
  return sendSolapi({
    message: {
      to:   params.phone,
      from: SENDER_PHONE,
      kakaoOptions: {
        pfId:       SENDER_KEY,
        templateId: process.env.KAKAO_TMPL_ORDER_READY,
        variables: {
          '#{가게명}':    params.storeName,
          '#{주문번호}':  params.orderNumber,
          '#{테이블}':    params.tableNumber ?? '포장',
        },
      },
    },
  });
}

/** 배달 배차 완료 */
export async function sendDeliveryAssigned(params: {
  phone:        string;
  orderNumber:  string;
  riderName:    string;
  riderPhone:   string;
  estimatedMin: number;
}) {
  return sendSolapi({
    message: {
      to:   params.phone,
      from: SENDER_PHONE,
      kakaoOptions: {
        pfId:       SENDER_KEY,
        templateId: process.env.KAKAO_TMPL_DELIVERY_ASSIGNED,
        variables: {
          '#{주문번호}':    params.orderNumber,
          '#{라이더이름}':  params.riderName,
          '#{라이더연락처}': params.riderPhone,
          '#{예상시간}':    `${params.estimatedMin}분`,
        },
      },
    },
  });
}

/** 배달 완료 */
export async function sendDeliveryDone(params: {
  phone: string; orderNumber: string; storeName: string;
}) {
  return sendSolapi({
    message: {
      to:   params.phone,
      from: SENDER_PHONE,
      kakaoOptions: {
        pfId:       SENDER_KEY,
        templateId: process.env.KAKAO_TMPL_DELIVERY_DONE,
        variables: {
          '#{가게명}':   params.storeName,
          '#{주문번호}': params.orderNumber,
        },
      },
    },
  });
}

/** 주문 취소 */
export async function sendOrderCancelled(params: {
  phone: string; orderNumber: string; reason?: string;
}) {
  return sendSolapi({
    message: {
      to:   params.phone,
      from: SENDER_PHONE,
      kakaoOptions: {
        pfId:       SENDER_KEY,
        templateId: process.env.KAKAO_TMPL_ORDER_CANCELLED,
        variables: {
          '#{주문번호}': params.orderNumber,
          '#{사유}':     params.reason ?? '매장 사정',
        },
      },
    },
  });
}
