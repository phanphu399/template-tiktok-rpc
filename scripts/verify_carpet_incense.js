const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Launching headless Chrome for verification...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/?obs=1'
  ]);

  await sleep(3500);

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9224/json/list', (res) => {
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

  console.log('Chờ 5 giây khởi tạo chỗ ngồi và tự động giả lập...');
  await sleep(5000);

  // Kích hoạt dâng hương để khói bay nghi ngút
  console.log('Kích hoạt dâng hương để kiểm tra khói nghi ngút và người dâng hương bước đi...');
  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      window.templeWorshipperManager.dispatchInteraction({
        type: 'burnIncense',
        user: 'Tuệ Minh Cư Sĩ',
        uniqueId: 'tue_minh_cu_si',
        count: 5,
        merit: 25,
        wish: 'Cầu quốc thái dân an, toàn gia vạn sự cát tường như ý'
      });
    })()`
  });

  // Chờ 2.5 giây khi khói đang bốc nghi ngút nhất và người đang bước đi dọc thảm
  await sleep(2500);

  const stats = await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      const wm = window.templeWorshipperManager;
      const sm = wm.seatManager;
      const occupiedSeats = Array.from(sm.seats.values()).filter(s => s.isOccupied);
      return {
        totalControllers: wm.controllers.size,
        occupiedSeats: occupiedSeats.length,
        smokeParticles: window.templeParticleEngine ? window.templeParticleEngine.smokeParticles.length : 0,
        activeDais: wm.getActiveDaisCount(),
        walkers: wm.daisSlots.filter(s => s.occupiedBy).map(s => ({
          name: s.occupiedBy.viewer.name,
          state: s.occupiedBy.state,
          pose: s.occupiedBy.currentPose,
          x: Math.round(s.occupiedBy.currentX),
          y: Math.round(s.occupiedBy.currentY)
        }))
      };
    })()`,
    returnByValue: true
  });
  console.log('Thông số phòng trực tiếp:', JSON.stringify(stats.result.value, null, 2));

  const ss = await sendCdp('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/carpet_incense_verify.png';
  fs.writeFileSync(outPath, Buffer.from(ss.data, 'base64'));
  console.log('Đã lưu ảnh chụp toàn cảnh tại:', outPath);

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);
