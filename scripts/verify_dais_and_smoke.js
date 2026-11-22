const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\phanp\\.gemini\\antigravity-cli\\brain\\bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('1. Khởi chạy headless Chrome để kiểm tra 7 vị trí thềm gỗ & đài sen...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/'
  ]);

  await sleep(3500);

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9227/json/list', (res) => {
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

  console.log('Chờ 3 giây để trang nạp xong DOM và engine...');
  await sleep(3000);

  // 1. Kích hoạt đồng thời 7 Phật tử lên dâng hương
  console.log('2. Kích hoạt 7 Phật tử cùng lên dâng hương...');
  const devNames = [
    'Phật Tử Tâm An',
    'Thí Chủ Diệu Thiện',
    'Cư Sĩ Tuệ Quang',
    'Thí Chủ Minh Đức',
    'Phật Tử Giác Ngộ',
    'Thí Chủ Thanh Tịnh',
    'Cư Sĩ Như Ý'
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
            wish: 'Cầu bình an, phước lộc gia đạo slot ' + i
          });
        }, i * 200);
      });
    })()`
  });

  // Chờ 6.5s để cả 7 người bước lên tới thềm và bắt đầu quỳ lạy
  console.log('Chờ 6.5s để cả 7 vị lên tới thềm gỗ...');
  await sleep(6500);

  // Kiểm tra vị trí của 7 người trên thềm gỗ
  const daisStatus = await sendCdp('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const mgr = window.templeWorshipperManager;
      const slots = mgr.daisSlots.map(s => ({
        id: s.id,
        x: s.x,
        y: s.y,
        occupiedBy: s.occupiedBy ? (s.occupiedBy.viewer.name || s.occupiedBy.viewer.user) : null,
        state: s.occupiedBy ? s.occupiedBy.state : null,
        ctrlX: s.occupiedBy ? s.occupiedBy.currentX : null,
        ctrlY: s.occupiedBy ? s.occupiedBy.currentY : null
      }));

      // Kiểm tra xem có bất kỳ 2 người nào trùng vị trí x hoặc trùng slot không
      const activeControllers = Array.from(mgr.controllers.values()).filter(c => c.daisSlot !== null || c.state === 'PRAYING');
      const overlapping = [];
      for (let i = 0; i < activeControllers.length; i++) {
        for (let j = i + 1; j < activeControllers.length; j++) {
          const c1 = activeControllers[i];
          const c2 = activeControllers[j];
          const dist = Math.abs(c1.currentX - c2.currentX);
          if (dist < 80) {
            overlapping.push({
              user1: c1.viewer.name,
              user2: c2.viewer.name,
              x1: c1.currentX,
              x2: c2.currentX,
              dist
            });
          }
        }
      }

      // Kiểm tra khói có che đài sen không (đài sen ở y <= 750)
      const smoke = window.templeParticles ? window.templeParticles.smokeParticles : [];
      const smokeCoveringLotus = smoke.filter(p => p.y < 770);

      return {
        activeDaisCount: mgr.getActiveDaisCount(),
        slots,
        overlapping,
        hasOverlap: overlapping.length > 0,
        smokeCount: smoke.length,
        smokeCoveringLotusCount: smokeCoveringLotus.length
      };
    })()`
  });

  console.log('DAIS STATUS EVALUATION:', JSON.stringify(daisStatus.result.value, null, 2));

  // Chụp ảnh bằng chứng 7 người quỳ lạy trên thềm gỗ không chồng chéo
  console.log('Chụp ảnh 7 Phật tử trên thềm gỗ...');
  const snap1 = await sendCdp('Page.captureScreenshot', { format: 'png' });
  const snap1Path = path.join(ARTIFACT_DIR, 'seven_devotees_on_dais_no_overlap.png');
  fs.writeFileSync(snap1Path, Buffer.from(snap1.data, 'base64'));
  console.log('Saved:', snap1Path);

  // Kích hoạt thêm khói hương và chụp Đài Sen để chứng minh đài sen sáng rõ, khói mềm mại
  console.log('Kích hoạt thắp hương và kiểm tra Đài Sen...');
  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      if (window.templeParticles) {
        window.templeParticles.spawnIncenseBurst(540, 895);
      }
    })()`
  });

  await sleep(1500);

  const snap2 = await sendCdp('Page.captureScreenshot', { format: 'png' });
  const snap2Path = path.join(ARTIFACT_DIR, 'clear_lotus_throne_soft_smoke.png');
  fs.writeFileSync(snap2Path, Buffer.from(snap2.data, 'base64'));
  console.log('Saved:', snap2Path);

  ws.close();
  chromeProc.kill();
  console.log('Hoàn thành kiểm tra CDP!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
