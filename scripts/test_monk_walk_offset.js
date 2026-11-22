const { spawn } = require('child_process');
const http = require('http');

async function test() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9238',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9238/json/list', res => {
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

  // Wait 1.5s for monk controller to initialize
  await new Promise(r => setTimeout(r, 1500));

  const checkPose = async (pose) => {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const m = window.templeMonkController;
        m.state = 'PAUSED';
        m.currentX = 500;
        m.setPose('${pose}');
        m.updateTransform();
      })()`
    });
    await new Promise(r => setTimeout(r, 150));

    const r = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const m = window.templeMonkController;
        const rect = m.spriteImg.getBoundingClientRect();
        return {
          pose: '${pose}',
          naturalWidth: m.spriteImg.naturalWidth,
          naturalHeight: m.spriteImg.naturalHeight,
          styleWidth: m.spriteImg.style.width,
          styleHeight: m.spriteImg.style.height,
          renderedWidth: m.spriteImg.offsetWidth,
          renderedHeight: m.spriteImg.offsetHeight,
          rectX: rect.x.toFixed(1),
          rectY: rect.y.toFixed(1),
          rectWidth: rect.width.toFixed(1),
          rectHeight: rect.height.toFixed(1),
          rectBottom: rect.bottom.toFixed(1)
        };
      })()`
    });
    return r.result.value;
  };

  console.log('STAND:', JSON.stringify(await checkPose('stand')));
  console.log('WALK1:', JSON.stringify(await checkPose('walk1')));
  console.log('WALK2:', JSON.stringify(await checkPose('walk2')));
  console.log('BOW:  ', JSON.stringify(await checkPose('bow')));

  ws.close();
  chrome.kill();
}
test().catch(console.error);
