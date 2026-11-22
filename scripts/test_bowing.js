const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Launching headless Chrome...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=1080,1920',
    '--mute-audio',
    'http://localhost:3000/?obs=1'
  ]);

  await sleep(3500);

  // Lấy WebSocket URL của tab live
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const liveTab = tabs.find((t) => t.url.includes('localhost:3000'));
  if (!liveTab) {
    console.error('Không tìm thấy tab live:', tabs);
    chromeProc.kill();
    return;
  }
  console.log('Đã kết nối tab live:', liveTab.title, liveTab.webSocketDebuggerUrl);

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

  // Đợi 5 giây để xem autoSim và khởi tạo chỗ ngồi
  console.log('Chờ 5 giây kiểm tra tự động giả lập (autoSim) và quản lý chỗ ngồi...');
  await sleep(5000);

  let evalRes = await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      const wm = window.templeWorshipperManager;
      if (!wm) return { error: 'Chưa có window.templeWorshipperManager' };
      const states = {};
      wm.controllers.forEach((ctrl) => {
        states[ctrl.state] = (states[ctrl.state] || 0) + 1;
      });
      return {
        totalControllers: wm.controllers.size,
        states,
        activeDaisCount: wm.getActiveDaisCount(),
        queueLength: wm.pilgrimageQueue.length,
        daisOccupants: wm.daisSlots.filter(s => s.occupiedBy).map(s => ({
          id: s.id,
          name: s.occupiedBy.viewer.name,
          state: s.occupiedBy.state,
          pose: s.occupiedBy.currentPose
        }))
      };
    })()`,
    returnByValue: true
  });
  console.log('Trạng thái phòng sau 5s:', JSON.stringify(evalRes.result.value, null, 2));

  // Kích hoạt tương tác dâng hương để kiểm tra bước lên lạy và quay mặt về
  console.log('Gửi sự kiện dâng hương thử nghiệm cho Đại Thí Chủ Minh Tâm...');
  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      window.templeWorshipperManager.dispatchInteraction({
        type: 'burnIncense',
        user: 'Đại Thí Chủ Minh Tâm',
        uniqueId: 'đạithíchủminhtâm',
        count: 3,
        merit: 15,
        wish: 'Cầu quốc thái dân an, gia quyến bình an cát tường'
      });
    })()`
  });

  // Quan sát quá trình: Đi ra thảm -> Tiến lên thềm -> Quỳ lạy 3 lạy -> Quay mặt lại -> Đi về ghế
  for (let i = 1; i <= 9; i++) {
    await sleep(1000);
    const probe = await sendCdp('Runtime.evaluate', {
      expression: `(() => {
        const wm = window.templeWorshipperManager;
        return {
          activeDais: wm.getActiveDaisCount(),
          queue: wm.pilgrimageQueue.length,
          dais: wm.daisSlots.filter(s => s.occupiedBy).map(s => ({
            id: s.id,
            name: s.occupiedBy.viewer.name,
            state: s.occupiedBy.state,
            pose: s.occupiedBy.currentPose,
            x: Math.round(s.occupiedBy.currentX),
            y: Math.round(s.occupiedBy.currentY),
            flip: s.occupiedBy.isFlipped
          }))
        };
      })()`,
      returnByValue: true
    });
    console.log(`T+${i}s:`, JSON.stringify(probe.result.value));
  }

  // Chụp ảnh lại màn hình để xác minh
  const ss = await sendCdp('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/test_bowing_verify.png';
  fs.writeFileSync(outPath, Buffer.from(ss.data, 'base64'));
  console.log('Đã lưu ảnh chụp xác minh tại:', outPath);

  ws.close();
  chromeProc.kill();
  console.log('Hoàn thành kiểm tra thực tế!');
}

main().catch((err) => {
  console.error('Lỗi kiểm tra:', err);
  process.exit(1);
});
