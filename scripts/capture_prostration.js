const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/?obs=1'
  ]);

  await sleep(3500);

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9223/json/list', (res) => {
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

  // Trigger ritual for 2 devotees at once
  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      window.templeWorshipperManager.dispatchInteraction({
        type: 'burnIncense',
        user: 'Phạm Thanh Hà',
        uniqueId: 'thanhha.lotus',
        count: 3,
        merit: 15,
        wish: 'Cầu gia đạo bình an hạnh phúc'
      });
      setTimeout(() => {
        window.templeWorshipperManager.dispatchInteraction({
          type: 'sendPrayer',
          user: 'Lê Hoàng Nam',
          uniqueId: 'hoangnam.dev',
          merit: 10,
          wish: 'Cầu công danh sự nghiệp hanh thông'
        });
      }, 500);
    })()`
  });

  // Chờ đến khi họ bước lên thềm gỗ và đang quỳ lạy (khoảng 3.8s)
  await sleep(3800);

  const probe = await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      const wm = window.templeWorshipperManager;
      return wm.daisSlots.filter(s => s.occupiedBy).map(s => ({
        id: s.id,
        name: s.occupiedBy.viewer.name,
        state: s.occupiedBy.state,
        pose: s.occupiedBy.currentPose,
        x: Math.round(s.occupiedBy.currentX),
        y: Math.round(s.occupiedBy.currentY)
      }));
    })()`,
    returnByValue: true
  });
  console.log('Đang quỳ lạy trên thềm:', JSON.stringify(probe.result.value));

  const ss = await sendCdp('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/dais_prostrating_verify.png';
  fs.writeFileSync(outPath, Buffer.from(ss.data, 'base64'));
  console.log('Đã lưu ảnh quỳ lạy tại:', outPath);

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);
