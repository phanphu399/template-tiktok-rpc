const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\phanp\\.gemini\\antigravity-cli\\brain\\bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callRpc(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });

    const req = http.request(
      'http://localhost:3000/rpc',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve(JSON.parse(body)));
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('1. Kiểm tra JSON-RPC temple.simulateWave (7 người)...');
  const rpcRes = await callRpc('temple.simulateWave', { count: 7 });
  console.log('RPC result:', JSON.stringify(rpcRes));

  console.log('2. Khởi chạy headless Chrome để kiểm tra giao diện & hoạt ảnh...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/'
  ]);

  await sleep(3500);

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9225/json/list', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const liveTab = tabs.find((t) => t.url.includes('localhost:3000'));
  if (!liveTab) {
    throw new Error('Không tìm thấy tab localhost:3000');
  }

  const ws = new WebSocket(liveTab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let msgId = 1;
  function sendCdp(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  console.log('Chờ 3 giây để trang tải hoàn tất...');
  await sleep(3000);

  // 1. Chụp màn hình với Marquee Ticker
  console.log('Chụp ảnh 1: Marquee ticker & Bậc thềm Chánh Điện...');
  let snap = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'marquee_ticker_verify.png'), Buffer.from(snap.data, 'base64'));

  // 2. Mở Modal Cẩm Nang & Thể Lệ
  console.log('Mở Modal Cẩm Nang & Thể Lệ Đạo Tràng...');
  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('btnOpenTempleGuide')?.click();
    })()`
  });
  await sleep(600);

  console.log('Chụp ảnh 2: Modal Cẩm Nang & Tuyên Bố Pháp Lý & Thể Lệ...');
  snap = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'temple_guide_modal_verify.png'), Buffer.from(snap.data, 'base64'));

  // 3. Đóng modal
  console.log('Đóng modal...');
  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('btnGuideUnderstood')?.click();
    })()`
  });
  await sleep(500);

  // 4. Kích hoạt Làn sóng 7 Phật tử cùng dâng hương
  console.log('Kích hoạt làn sóng 7 Phật tử cùng bước lên Bậc thềm gỗ...');
  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      const names = [
        'Đại Thí Chủ Minh Tâm', 'Phật Tử Diệu Âm', 'Tuệ Minh Cư Sĩ',
        'Thanh Trúc Thiện Duyên', 'Đức Trọng Tâm Lành', 'Nguyên An Tịnh Độ', 'Bảo Trâm Cầu An'
      ];
      names.forEach((name, idx) => {
        setTimeout(() => {
          window.templeWorshipperManager.dispatchInteraction({
            type: 'burnIncense',
            user: name,
            uniqueId: 'sim_wave_' + idx,
            count: 3,
            wish: 'Cầu bình an, phước lộc cho gia đạo ' + (idx + 1)
          });
        }, idx * 100);
      });
    })()`
  });

  // Chờ 3.8s để cả 7 Phật tử bước lên Bậc thềm gỗ Chánh Điện và cùng quỳ lạy
  console.log('Chờ 3.8 giây để cả 7 vị cùng tiến lên bậc thềm gỗ và quỳ lạy...');
  await sleep(3800);

  console.log('Chụp ảnh 3: 7 Phật tử cùng quỳ lạy trên bậc thềm gỗ...');
  snap = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'multi_devotees_dais_verify.png'), Buffer.from(snap.data, 'base64'));

  console.log('Kiểm tra trạng thái hoạt ảnh và số lượng người trên thềm...');
  const daisStatus = await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      const mgr = window.templeWorshipperManager;
      return {
        activeDaisCount: mgr.getActiveDaisCount(),
        daisSlots: mgr.daisSlots.map(s => ({ id: s.id, x: s.x, y: s.y, user: s.occupiedBy?.viewer?.name, state: s.occupiedBy?.state })),
        queueLength: mgr.pilgrimageQueue.length
      };
    })()`,
    returnByValue: true
  });
  console.log('Dais Status:', JSON.stringify(daisStatus.result.value, null, 2));

  // Chờ thêm 2.2s xem họ lạy nhịp tiếp theo
  await sleep(2200);
  snap = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'multi_devotees_dais_deep_bow.png'), Buffer.from(snap.data, 'base64'));

  ws.close();
  chromeProc.kill();
  console.log('Hoàn thành kiểm tra thành công!');
}

main().catch((err) => {
  console.error('Lỗi kiểm tra:', err);
  process.exit(1);
});
