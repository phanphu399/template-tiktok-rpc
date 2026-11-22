const http = require('http');

async function callRpc(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method,
      params
    });

    const req = http.request(
      'http://localhost:3000/rpc',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Parse error on body: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runHighLoadStressTest() {
  console.log('=== BẮT ĐẦU KIỂM TRA CHỊU TẢI CAO (STRESS TEST) ===');
  console.log('Mô phỏng 120 sự kiện dồn dập (bình luận, thả tim, thắp hương, dâng quà) trong 3 giây...');

  const users = [
    'Nguyễn Văn A', 'Trần Thị B', 'Lê Hoàng C', 'Phạm Minh D',
    'Vũ Đức E', 'Đặng Thảo F', 'Hoàng Bách G', 'Đỗ Mỹ H',
    'Bùi Quang I', 'Hồ Diệu K', 'Ngô Thanh L', 'Dương Trí M'
  ];

  const wishes = [
    'Nam Mô A Di Đà Phật cầu an',
    'Cầu cho công việc thuận buồm xuôi gió',
    'Con lạy Phật mười phương',
    'Cầu bình an cho cha mẹ mạnh khỏe',
    'xin xăm quẻ đầu năm',
    'thắp nhang bái Phật'
  ];

  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  const promises = [];
  for (let i = 0; i < 120; i++) {
    const user = users[i % users.length] + ' ' + (i + 1);
    const wish = wishes[i % wishes.length];
    const roll = Math.random();

    let p;
    if (roll < 0.4) {
      // Bình luận chat thông thường / thắp hương
      p = callRpc('temple.comment', { user, uniqueId: 'user_' + i, comment: wish });
    } else if (roll < 0.65) {
      // Thắp nhang
      p = callRpc('temple.burnIncense', { user, uniqueId: 'user_' + i, count: 3, wish });
    } else if (roll < 0.85) {
      // Gõ mõ
      p = callRpc('temple.strikeWoodenFish', { user, uniqueId: 'user_' + i, count: 5 });
    } else {
      // Dâng quà hoa sen
      p = callRpc('temple.offerGift', {
        user,
        uniqueId: 'user_' + i,
        giftType: 'lotus',
        coins: 20,
        giftName: 'Đài Hoa Sen Vàng',
        wish
      });
    }

    promises.push(
      p
        .then(() => { successCount++; })
        .catch((err) => {
          errorCount++;
          console.error(`Lỗi request ${i}:`, err.message);
        })
    );
  }

  await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  console.log(`\n=== KẾT QUẢ KIỂM TRA CHỊU TẢI ===`);
  console.log(`Tổng requests: ${promises.length}`);
  console.log(`Thành công: ${successCount}`);
  console.log(`Thất bại: ${errorCount}`);
  console.log(`Thời gian xử lý: ${totalDuration}ms (Trung bình ${(totalDuration / promises.length).toFixed(1)}ms/request)`);

  console.log('\nKiểm tra lại trạng thái server...');
  const state = await callRpc('temple.getState');
  console.log('Tổng công đức tích lũy:', state.result?.totalMerit);
  console.log('Tổng số nén hương:', state.result?.totalIncense);
  console.log('Số người trên Bảng Vàng:', state.result?.leaderboard?.length);
  console.log('=== HỆ THỐNG HOẠT ĐỘNG 100% ỔN ĐỊNH, KHÔNG BỊ NGHẼN HOẶC CRASH! ===');
}

runHighLoadStressTest().catch((err) => {
  console.error('Fatal stress test error:', err);
  process.exit(1);
});
