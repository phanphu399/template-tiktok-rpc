const { spawn } = require('child_process');
const http = require('http');

async function main() {
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/?obs=1'
  ]);

  await new Promise((r) => setTimeout(r, 3500));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9225/json/list', (res) => {
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

  await new Promise((r) => setTimeout(r, 2000));

  const probe = await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      const holder = document.getElementById('incenseSticksHolder');
      if (!holder) return { error: 'No holder' };
      const zone = document.getElementById('incenseBurnerZone');
      const rectH = holder.getBoundingClientRect();
      const rectZ = zone ? zone.getBoundingClientRect() : null;
      const sticks = Array.from(holder.querySelectorAll('.incense-stick')).map(s => {
        const rect = s.getBoundingClientRect();
        const ember = s.querySelector('.incense-ember');
        const rectE = ember ? ember.getBoundingClientRect() : null;
        return {
          left: s.style.left,
          height: s.style.height,
          transform: s.style.transform,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          emberRect: rectE ? { x: Math.round(rectE.x), y: Math.round(rectE.y), w: Math.round(rectE.width), h: Math.round(rectE.height) } : null
        };
      });
      return {
        holderCount: holder.children.length,
        rectH: { x: Math.round(rectH.x), y: Math.round(rectH.y), w: Math.round(rectH.width), h: Math.round(rectH.height) },
        rectZ: rectZ ? { x: Math.round(rectZ.x), y: Math.round(rectZ.y), w: Math.round(rectZ.width), h: Math.round(rectZ.height) } : null,
        sticks: sticks.slice(0, 3)
      };
    })()`,
    returnByValue: true
  });

  console.log('Probe Result:', JSON.stringify(probe.result.value, null, 2));
  ws.close();
  chromeProc.kill();
}

main().catch(console.error);
