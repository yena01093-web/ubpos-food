// ubpos 프린터 에이전트 - Polling 방식
// WS 대신 API 폴링으로 새 주문 체크
// 실행: node agent_poll.js

const { SerialPort } = require('serialport');

const CONFIG = {
  API_URL:   'https://ubpos-food.vercel.app',
  STORE_ID:  'b0000000-0000-0000-0000-000000000001',
  EMAIL:     'yena01093@gmail.com',
  PASSWORD:  'password',  // 실제 비밀번호

  RECEIPT_PORT: 'COM3',
  RECEIPT_BAUD: 38400,
  KITCHEN_PORT: 'COM12',
  KITCHEN_BAUD: 9600,

  POLL_SEC: 5,  // 5초마다 체크
};

const ESC = 0x1B;
const GS  = 0x1D;
const CMD = {
  INIT:         Buffer.from([ESC, 0x40]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_LEFT:   Buffer.from([ESC, 0x61, 0x00]),
  BOLD_ON:      Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF:     Buffer.from([ESC, 0x45, 0x00]),
  FONT_LARGE:   Buffer.from([ESC, 0x21, 0x30]),
  FONT_NORMAL:  Buffer.from([ESC, 0x21, 0x00]),
  FEED5:        Buffer.from([ESC, 0x64, 0x05]),
  CUT:          Buffer.from([GS,  0x56, 0x41, 0x00]),
};

function txt(str) {
  try {
    const iconv = require('iconv-lite');
    return iconv.encode(str + '\n', 'EUC-KR');
  } catch {
    return Buffer.from(str + '\n', 'utf-8');
  }
}
function line(c='-', n=32) { return txt(c.repeat(n)); }
function rpad(s,n) { return String(s).padEnd(n).substring(0,n); }
function lpad(s,n) { return String(s).padStart(n).substring(0,n); }

function buildReceipt(order) {
  const now = new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
  const bufs = [
    CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.FONT_LARGE,
    txt('슈퍼크리스피 제천점'),
    CMD.FONT_NORMAL, CMD.BOLD_OFF,
    txt('충북 제천시 의림대로 342 1층'),
    txt('TEL: 043-756-8077'),
    line(), CMD.ALIGN_LEFT, CMD.BOLD_ON,
    txt(`주문번호: ${order.order_number}`),
    CMD.BOLD_OFF,
    txt(`일시: ${now}`),
    txt(`테이블: ${order.table_number ?? '포장'}`),
    line(),
  ];
  let total = 0;
  for (const item of (order.items||[])) {
    bufs.push(txt(`${rpad(item.menu_name,18)}x${item.quantity}${lpad(Number(item.item_total).toLocaleString(),8)}`));
    if (item.selected_options?.length)
      for (const o of item.selected_options) bufs.push(txt(`  └ ${o.name}`));
    total += Number(item.item_total);
  }
  bufs.push(line('='), CMD.BOLD_ON, CMD.FONT_LARGE,
    txt(`합  계: ${total.toLocaleString()}원`),
    CMD.FONT_NORMAL, CMD.BOLD_OFF, line(),
    CMD.ALIGN_CENTER, txt('감사합니다!'), CMD.FEED5, CMD.CUT);
  return Buffer.concat(bufs);
}

function buildKitchen(order) {
  const now = new Date().toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'});
  const bufs = [
    CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.FONT_LARGE,
    txt(`[주문] ${order.order_number}`),
    CMD.FONT_NORMAL,
    txt(`${order.table_number??'포장'} / ${now}`),
    CMD.BOLD_OFF, line('='), CMD.ALIGN_LEFT,
  ];
  for (const item of (order.items||[])) {
    bufs.push(CMD.BOLD_ON, CMD.FONT_LARGE,
      txt(`${item.quantity}x ${item.menu_name}`),
      CMD.FONT_NORMAL, CMD.BOLD_OFF);
    if (item.selected_options?.length)
      for (const o of item.selected_options) bufs.push(txt(`  [${o.name}]`));
  }
  if (order.request_note) bufs.push(line(), txt(`요청: ${order.request_note}`));
  bufs.push(CMD.FEED5, CMD.CUT);
  return Buffer.concat(bufs);
}

async function printTo(portName, baudRate, data) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({ path: portName, baudRate }, (err) => {
      if (err) { reject(err); return; }
      port.write(data, (e) => {
        if (e) { reject(e); return; }
        port.drain(() => { port.close(); resolve(); });
      });
    });
  });
}

let token = '';
let lastCheck = new Date(Date.now() - 10000).toISOString();
const printed = new Set();

async function login() {
  const res  = await fetch(`${CONFIG.API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CONFIG.EMAIL, password: CONFIG.PASSWORD }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error('로그인 실패: ' + data.message);
  token = data.data.accessToken;
  console.log('[AUTH] 로그인 완료');
}

async function poll() {
  try {
    const today = new Date().toISOString().slice(0,10);
    // status 조건 제거: 그날 전체 주문을 가져와서 printed Set으로 중복 출력만 방지
    const res = await fetch(
      `${CONFIG.API_URL}/api/dashboard/orders?storeId=${CONFIG.STORE_ID}&date=${today}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.status === 401) {
      console.log('[AUTH] 토큰 만료 - 재로그인');
      await login();
      return;
    }

    const data = await res.json();
    if (!data.ok) return;

    const orders = data.data.orders || [];
    for (const order of orders) {
      if (printed.has(order.id)) continue;
      printed.add(order.id);

      console.log(`[주문] ${order.order_number} 수신 - 프린트 시작`);

      try {
        await printTo(CONFIG.RECEIPT_PORT, CONFIG.RECEIPT_BAUD, buildReceipt(order));
        console.log(`[영수증] 출력 완료`);
      } catch(e) { console.error(`[영수증] 오류: ${e.message}`); }

      try {
        await printTo(CONFIG.KITCHEN_PORT, CONFIG.KITCHEN_BAUD, buildKitchen(order));
        console.log(`[주방] 출력 완료`);
      } catch(e) { console.error(`[주방] 오류: ${e.message}`); }
    }
  } catch(e) {
    console.error('[POLL] 오류:', e.message);
  }
}

async function main() {
  console.log('[ubpos 프린터 에이전트 (Polling)]');
  console.log(`영수증: ${CONFIG.RECEIPT_PORT} @ ${CONFIG.RECEIPT_BAUD}`);
  console.log(`주방:   ${CONFIG.KITCHEN_PORT} @ ${CONFIG.KITCHEN_BAUD}`);
  console.log(`폴링:   ${CONFIG.POLL_SEC}초마다`);

  await login();
  console.log('[시작] 주문 감시 중...');

  await poll();
  setInterval(poll, CONFIG.POLL_SEC * 1000);
}

main().catch(console.error);
