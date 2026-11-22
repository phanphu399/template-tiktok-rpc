const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9248',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9248/json/list', res => {
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

  await send('Console.enable');
  await send('Runtime.enable');

  const logs = [];
  ws.addEventListener('message', e => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      logs.push(d.params.args.map(a => a.value || a.description).join(' '));
    }
  });

  await new Promise(r => setTimeout(r, 1500));

  const diag = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const mgr = window.templeWorshipperManager;
      if (!mgr) return { error: 'No templeWorshipperManager' };

      const ev = {
        type: 'burnIncense',
        user: 'Phật Tử Thử Nghiệm',
        uniqueId: 'test_uid_999',
        count: 3,
        wish: 'Cầu bình an'
      };

      try {
        mgr.dispatchInteraction(ev);
        const ctrl = mgr.findController({ uniqueId: ev.uniqueId, name: ev.user });
        return {
          foundCtrl: Boolean(ctrl),
          ctrlDetails: ctrl ? {
            name: ctrl.viewer.name,
            state: ctrl.state,
            seatId: ctrl.seat ? ctrl.seat.id : null,
            x: ctrl.currentX,
            y: ctrl.currentY,
            daisSlot: ctrl.daisSlot ? ctrl.daisSlot.id : null
          } : null,
          queueLength: mgr.pilgrimageQueue.length,
          activeDaisCount: mgr.getActiveDaisCount()
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()`
  });

  console.log('Diagnostic result:', JSON.stringify(diag.result.value, null, 2));
  console.log('Console logs:', logs);

  ws.close();
  chrome.kill();
}

run().catch(console.error);
