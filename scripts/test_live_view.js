const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\phanp\\.gemini\\antigravity-cli\\brain\\340900c4-8a74-4ceb-94f4-8c113db645c7';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Starting headless Chrome on port 9245...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9245',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/'
  ]);

  await sleep(3000);

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9245/json/list', (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const tab = tabs.find((t) => t.url.includes('localhost:3000'));
  if (!tab) {
    console.error('Tab localhost:3000 not found!');
    chrome.kill();
    return;
  }

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

  // Enable console & log collection
  await send('Console.enable');
  await send('Runtime.enable');

  const logs = [];
  ws.addEventListener('message', (e) => {
    const d = JSON.parse(e.data);
    if (d.method === 'Console.messageAdded') {
      logs.push(d.params.message.text);
    }
  });

  await sleep(2000);

  // Inspect DOM and globals
  const checkState = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const monkNode = document.getElementById('abbotMonkNode');
      const monkImg = monkNode ? monkNode.querySelector('img') : null;
      const congregation = document.getElementById('congregationHall');
      const worshippers = congregation ? congregation.querySelectorAll('.worshipper-avatar-node') : [];

      return {
        hasMonkNode: Boolean(monkNode),
        monkVisible: monkNode ? window.getComputedStyle(monkNode).display !== 'none' && window.getComputedStyle(monkNode).opacity !== '0' : false,
        monkTransform: monkNode ? monkNode.style.transform : null,
        monkLeft: monkNode ? monkNode.style.left : null,
        monkTop: monkNode ? monkNode.style.top : null,
        monkSrc: monkImg ? monkImg.src : null,
        worshippersCount: worshippers.length,
        hasTempleWorshipperManager: typeof window.templeWorshipperManager !== 'undefined',
        hasTempleMonkController: typeof window.templeMonkController !== 'undefined',
        tiktokStatusText: document.getElementById('liveStatusText')?.textContent
      };
    })()`
  });

  console.log('DOM State:', JSON.stringify(checkState.result.value, null, 2));

  // Chụp ảnh hiện tại
  console.log('Taking screenshot before interaction...');
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'live_stage_initial.png'), Buffer.from(snap1.data, 'base64'));

  // Test triggering a burnIncense ritual
  console.log('Dispatching test burnIncense ritual...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      fetch('/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 999,
          method: 'temple.burnIncense',
          params: {
            user: 'Test Phật Tử',
            count: 3,
            wish: 'Nam mô A Di Đà Phật cầu an'
          }
        })
      });
    })()`
  });

  // Chờ 3 giây xem bước lên quỳ lạy
  await sleep(3500);

  const afterRitual = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const congregation = document.getElementById('congregationHall');
      const worshippers = congregation ? congregation.querySelectorAll('.worshipper-avatar-node') : [];
      const states = [];
      worshippers.forEach(w => {
        const id = w.id;
        const name = w.querySelector('.seat-username')?.textContent;
        const left = w.style.left;
        const top = w.style.top;
        const transform = w.style.transform;
        const img = w.querySelector('.devotee-sprite')?.src.split('/').pop();
        states.push({ id, name, left, top, transform, img });
      });
      return {
        worshippersCount: worshippers.length,
        states
      };
    })()`
  });

  console.log('After Ritual State:', JSON.stringify(afterRitual.result.value, null, 2));

  // Chụp ảnh sau khi dâng hương
  const snap2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'live_stage_after_incense.png'), Buffer.from(snap2.data, 'base64'));

  ws.close();
  chrome.kill();
  console.log('Logs captured:', logs);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
