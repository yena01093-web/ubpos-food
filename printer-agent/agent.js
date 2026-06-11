const { SerialPort } = require('serialport');
const { io }         = require('socket.io-client');

const CONFIG = {
  WS_URL:    'http://13.125.246.186:3001',
  API_URL:   'https://ubpos-food.vercel.app',
  STORE_ID:  'b0000000-0000-0000-0000-000000000001',
  EMAIL:     'yena01093@gmail.com',
  PASSWORD:  'password',  // 실제 비밀번호로 변경하세요

  RECEIPT_PORT: 'COM3',
  RECEIPT_BAUD: 38400,
  KITCHEN_PORT: 'COM12',
  KITCHEN_BAUD: 9600,
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

function line(char = '-', len = 32) { return txt(char.repeat(len)); }
function rpad(s, n) { return s.padEnd(n).substring(0, n); }
function lpad(s, n) { return s.padStart(n).substring(0, n); }

function buildReceipt(order) {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const bufs = [
    CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.FONT_LARGE,
    txt('슈퍼크리스피 제천점'),
    CMD.FONT_NORMAL, CMD.BOLD_OFF,
    txt('충북 제천시 의림대로 342 1층'),
    txt('TEL: 043-756-8077'),
    line(),
    CMD.ALIGN_LEFT, CMD.BOLD_ON,
    txt(`주문번호: ${order.order_number}`),
    CMD.BOLD_OFF,
    txt(`일시: ${now}`),
    txt(`테이블: ${order.table_number ?? '포장'}`),
    line(),
  ];
  let total = 0;
  for (const item of (order.items || [])) {
    bufs.push(txt(`${rpad(item.menu_name, 18)}x${item.quantity}${lpad(String(item.item_total.toLocaleString()), 8)}`));
    if (item.selected_options?.length) {
      for (const opt of item.selected_options) bufs.push(txt(`  └ ${opt.name}`));
    }
    total += item.item_total;
  }
  bufs.push(line('='), CMD.BOLD_ON, CMD.FONT_LARGE,
    txt(`합  계: ${total.toLocaleString()}원`),
    CMD.FONT_NORMAL, CMD.BOLD_OFF, line(),
    CMD.ALIGN_CENTER, txt('감사합니다!'), CMD.FEED5, CMD.CUT);
  return Buffer.concat(bufs);
}

function buildKitchen(order) {
  const now = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
  const bufs = [
    CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.FONT_LARGE,
    txt(`[주문] ${order.order_number}`),
    CMD.FONT_NORMAL,
    txt(`${order.table_number ?? '포장'} / ${now}`),
    CMD.BOLD_OFF, line('='), CMD.ALIGN_LEFT,
  ];
  for (const item of (order.items || [])) {
    bufs.push(CMD.BOLD_ON, CMD.FONT_LARGE, txt(`${item.quantity}x ${item.menu_name}`), CMD.FONT_NORMAL, CMD.BOLD_OFF);
    if (item.selected_options?.length) {
      for (const opt of item.selected_options) bufs.push(txt(`  [${opt.name}]`));
    }
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

async function getToken() {
  const res  = await fetch(`${CONFIG.API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CONFIG.EMAIL, password: CONFIG.PASSWORD }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error('로그인 실패: ' + data.message);
  console.log('[AUTH] 토큰 발급 완료');
  return data.data.accessToken;
}

async function main() {
  try { require('iconv-lite'); } catch { console.log('[!] npm install iconv-lite 권장'); }

  console.log('[ubpos 프린터 에이전트 시작]');

  const token = await getToken();

  const socket = io(CONFIG.WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
  });

  socket.on('connect', () => {
    console.log('[WS] 연결됨');
    socket.emit('join:store', CONFIG.STORE_ID);
    socket.emit('join:kds',   CONFIG.STORE_ID);
    console.log('[WS] 스토어 구독 완료');
  });

  socket.on('order:new', async (order) => {
    console.log(`[주문] ${order.order_number} 수신`);
    try {
      await printTo(CONFIG.RECEIPT_PORT, CONFIG.RECEIPT_BAUD, buildReceipt(order));
      console.log(`[영수증] 출력 완료`);
    } catch (e) { console.error(`[영수증] 오류:`, e.message); }
    try {
      await printTo(CONFIG.KITCHEN_PORT, CONFIG.KITCHEN_BAUD, buildKitchen(order));
      console.log(`[주방] 출력 완료`);
    } catch (e) { console.error(`[주방] 오류:`, e.message); }
  });

  socket.on('disconnect', () => console.log('[WS] 연결 끊김'));
  socket.on('connect_error', (e) => console.error('[WS] 오류:', e.message));
}

main().catch(console.error);
