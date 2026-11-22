const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\phanp\\.gemini\\antigravity-cli\\brain\\340900c4-8a74-4ceb-94f4-8c113db645c7';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Testing full pilgrimage lifecycle in headless Chrome...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9249',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/'
  ]);

  await sleep(3000);

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9249/json/list', (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const tab = tabs.find((t) => t.url.includes('localhost:3000'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 1;
  const send = (m, p = {}) =>
    new Promise((res) => {
      const curId = id++;
      const h = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === curId) {
          ws.removeEventListener('message', h);
          res(d.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id: curId, method: m, params: p }));
    });

  // Chờ nạp xong UI
  await sleep(2500);

  // 1. Kiểm tra vị trí Thầy Trụ Trì ban đầu
  const initMonk = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const m = window.templeMonkController;
      return {
        x: m ? m.currentX : null,
        y: m ? m.currentY : null,
        state: m ? m.state : null,
        pose: m && m.spriteImg ? m.spriteImg.src.split('/').pop() : null
      };
    })()`
  });
  console.log('1. Initial Monk state:', initMonk.result.value);

  // Chụp ảnh stage ban đầu
  let snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'step1_initial_stage.png'), Buffer.from(snap.data, 'base64'));

  // 2. Kích hoạt dâng hương qua WebSocket / RPC
  console.log('2. Dispatching burnIncense via RPC...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      fetch('/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 101,
          method: 'temple.burnIncense',
          params: {
            user: 'Phật Tử Diệu Hạnh',
            count: 3,
            wish: 'Nam mô A Di Đà Phật cầu gia đạo bình an'
          }
        })
      });
    })()`
  });

  // Chờ 2.5s: Phật tử đang bước lên thảm đỏ
  await sleep(2500);
  const walkingState = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const mgr = window.templeWorshipperManager;
      const monk = window.templeMonkController;
      const ctrl = mgr.findController({ name: 'Phật Tử Diệu Hạnh' });
      return {
        ctrlState: ctrl ? ctrl.state : null,
        ctrlX: ctrl ? ctrl.currentX : null,
        ctrlY: ctrl ? ctrl.currentY : null,
        ctrlPose: ctrl ? ctrl.currentPose : null,
        monkX: monk ? monk.currentX : null,
        monkY: monk ? monk.currentY : null,
        monkState: monk ? monk.state : null,
        activeDaisCount: mgr.getActiveDaisCount()
      };
    })()`
  });
  console.log('2. Walking state (after 2.5s):', walkingState.result.value);

  snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'step2_walking_up_carpet.png'), Buffer.from(snap.data, 'base64'));

  // Chờ thêm 4s (tổng cộng 6.5s): Phật tử đã lên tới bậc thềm gỗ và đang quỳ lạy (PRAYING)
  await sleep(4000);
  const prayingState = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const mgr = window.templeWorshipperManager;
      const monk = window.templeMonkController;
      const ctrl = mgr.findController({ name: 'Phật Tử Diệu Hạnh' });
      return {
        ctrlState: ctrl ? ctrl.state : null,
        ctrlX: ctrl ? ctrl.currentX : null,
        ctrlY: ctrl ? ctrl.currentY : null,
        ctrlPose: ctrl ? ctrl.currentPose : null,
        daisSlot: ctrl && ctrl.daisSlot ? ctrl.daisSlot.id : null,
        monkX: monk ? monk.currentX : null,
        monkY: monk ? monk.currentY : null,
        monkState: monk ? monk.state : null,
        activeDaisCount: mgr.getActiveDaisCount()
      };
    })()`
  });
  console.log('3. Praying state on Dais (after 6.5s):', prayingState.result.value);

  snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'step3_praying_on_dais.png'), Buffer.from(snap.data, 'base64'));

  ws.close();
  chrome.kill();
  console.log('Finished pilgrimage verification test successfully!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
