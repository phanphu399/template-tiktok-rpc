const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function test() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9239',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9239/json/list', res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
  const tab = tabs.find(t => t.url.includes('localhost:3000'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (m, p = {}) => new Promise(res => {
    const curId = id++;
    const h = e => {
      const d = JSON.parse(e.data);
      if (d.id === curId) { ws.removeEventListener('message', h); res(d.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: curId, method: m, params: p }));
  });

  // Enable monk patrolling
  await send('Runtime.evaluate', {
    expression: `(() => {
      const m = window.templeMonkController;
      m.state = 'PATROLLING';
      m.currentX = 420;
      m.direction = 1;
      m.updateTransform();
    })()`
  });

  // Sample monk feet Y across 6 steps
  const samples = [];
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 340));
    const r = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const m = window.templeMonkController;
        const rect = m.spriteImg.getBoundingClientRect();
        return {
          step: ${i + 1},
          x: m.currentX.toFixed(1),
          y: m.currentY,
          pose: m.spriteImg.src.split('/').pop(),
          rectBottom: rect.bottom.toFixed(1)
        };
      })()`
    });
    samples.push(r.result.value);
  }

  console.log('PATROL SAMPLES:');
  console.table(samples);

  // Take a full screenshot of the monk on the wooden floor
  let snap = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 100, y: 950, width: 880, height: 450, scale: 1 }
  });
  fs.writeFileSync('monk_patrol_verified.png', Buffer.from(snap.data, 'base64'));
  console.log('Saved monk_patrol_verified.png');

  ws.close();
  chrome.kill();
}
test().catch(console.error);
