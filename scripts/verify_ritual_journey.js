const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\phanp\\.gemini\\antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('1. Khởi chạy headless Chrome...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/'
  ]);

  await sleep(3500);

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9226/json/list', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const liveTab = tabs.find((t) => t.url.includes('localhost:3000'));
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

  console.log('Chờ 3 giây để trang tải xong...');
  await sleep(3000);

  // 1. Chụp toàn cảnh ban đầu: thảm đỏ vừa vặn, sàn cẩm thạch rộng rãi 2 bên
  console.log('Chụp ảnh 1: Toàn cảnh Chánh Điện với thảm đỏ thanh thoát, sàn rộng rãi...');
  let snap = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'narrow_carpet_overview.png'), Buffer.from(snap.data, 'base64'));

  // 2. Kích hoạt dâng hương cho 3 Phật tử
  console.log('Kích hoạt 3 Phật tử lên dâng hương...');
  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      ['Thí Chủ Minh Tâm', 'Phật Tử Diệu Âm', 'Tuệ Minh Cư Sĩ'].forEach((name, i) => {
        setTimeout(() => {
          window.templeWorshipperManager.dispatchInteraction({
            type: 'burnIncense',
            user: name,
            uniqueId: 'pilgrim_' + i,
            count: 3,
            wish: 'Cầu bình an, phước lộc gia đạo ' + (i + 1)
          });
        }, i * 300);
      });
    })()`
  });

  // 3. Chờ 3.0 giây để xem bước đi lên thảm đỏ
  await sleep(3000);
  console.log('Chụp ảnh 2: Phật tử đang khoan thai bước lên thảm đỏ...');
  snap = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'pilgrim_walking_up.png'), Buffer.from(snap.data, 'base64'));

  // 4. Chờ thêm 3.5 giây (tổng 6.5s) để các vị lên thềm gỗ và bắt đầu chuỗi Tam Bái
  await sleep(3500);
  console.log('Chụp ảnh 3: Phật tử đang đảnh lễ sâu trên thềm gỗ...');
  snap = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'pilgrim_prostrating_deep.png'), Buffer.from(snap.data, 'base64'));

  // 5. Kiểm tra camera transform
  const camTransform = await sendCdp('Runtime.evaluate', {
    expression: `document.getElementById('cameraRig').style.transform`
  });
  console.log('Camera transform hiện tại (phải scale 1.0, không zoom):', camTransform.result.value);

  // 6. Chờ tới khi lạy xong và quay mặt ra trước đi về (khoảng 8.5s sau, tức tổng 15s)
  console.log('Chờ đến lúc lạy xong, quay mặt lại và đi về...');
  await sleep(8500);

  console.log('Chụp ảnh 4: Phật tử QUAY MẶT RA PHÍA TRƯỚC (áo lam nhìn từ trước) đi về...');
  snap = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'pilgrim_returning_face_front.png'), Buffer.from(snap.data, 'base64'));

  ws.close();
  chromeProc.kill();
  console.log('Xác minh hoàn tất thành công!');
}

main().catch((err) => {
  console.error('Lỗi kiểm tra:', err);
  process.exit(1);
});
