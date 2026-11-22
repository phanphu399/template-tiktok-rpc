const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\phanp\\.gemini\\antigravity-cli\\brain\\bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Khởi chạy headless Chrome để kiểm tra Bậc Thềm Gỗ được khôi phục...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9228',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/'
  ]);

  await sleep(3500);

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9228/json/list', (res) => {
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

  console.log('Chờ 3 giây để nạp giao diện...');
  await sleep(3000);

  // Chụp ảnh 1: Thầy Trụ Trì đang đi trên bậc thềm gỗ
  console.log('Chụp ảnh 1: Thầy Trụ Trì trên bậc thềm gỗ Chánh Điện...');
  let snap1 = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'monk_on_wooden_dais.png'), Buffer.from(snap1.data, 'base64'));

  // Kích hoạt 7 Phật tử lên dâng hương trên bậc thềm gỗ
  console.log('Kích hoạt 7 Phật tử dâng hương lên bậc thềm gỗ...');
  const devNames = [
    'Phật Tử Diệu Âm',
    'Thí Chủ Tâm An',
    'Cư Sĩ Tuệ Minh',
    'Thí Chủ Bảo Long',
    'Phật Tử Giác Huệ',
    'Thí Chủ Thanh Lương',
    'Cư Sĩ Trí Đức'
  ];

  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      const names = ${JSON.stringify(devNames)};
      names.forEach((name, i) => {
        setTimeout(() => {
          window.templeWorshipperManager.dispatchInteraction({
            type: 'burnIncense',
            user: name,
            uniqueId: 'pilgrim_slot_' + i,
            count: 3,
            wish: 'Cầu bình an, phước lộc slot ' + i
          });
        }, i * 200);
      });
    })()`
  });

  // Chờ 6.5s để cả 7 người lên tới bậc thềm gỗ quỳ lạy
  console.log('Chờ 6.5s để các vị lên quỳ lạy trang nghiêm trên thềm gỗ...');
  await sleep(6500);

  const daisStatus = await sendCdp('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const mgr = window.templeWorshipperManager;
      const monk = window.templeMonkController;
      return {
        activeDaisCount: mgr.getActiveDaisCount(),
        monkY: monk ? monk.currentY : null,
        monkState: monk ? monk.state : null,
        slots: mgr.daisSlots.map(s => ({
          id: s.id,
          x: s.x,
          y: s.y,
          occupiedBy: s.occupiedBy ? s.occupiedBy.viewer.name : null,
          state: s.occupiedBy ? s.occupiedBy.state : null
        }))
      };
    })()`
  });

  console.log('STATUS:', JSON.stringify(daisStatus.result.value, null, 2));

  // Chụp ảnh 2: 7 Phật tử quỳ lạy trên thềm gỗ
  console.log('Chụp ảnh 2: 7 Phật tử quỳ lạy trên bậc thềm gỗ Chánh Điện...');
  let snap2 = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'seven_devotees_praying_on_wooden_dais.png'), Buffer.from(snap2.data, 'base64'));

  ws.close();
  chromeProc.kill();
  console.log('Hoàn thành kiểm tra!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
