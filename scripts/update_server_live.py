import re

# Update server.js
with open('server.js', 'r', encoding='utf-8') as f:
    server_content = f.read()

# Add temple.simulateWave
old_rpc_case = "    case 'temple.burnIncense':\n      return Rituals.burnIncense(params);"
new_rpc_case = """    case 'temple.simulateWave': {
      const count = Math.min(7, Math.max(1, parseInt(params.count || 7, 10)));
      const results = [];
      for (let i = 0; i < count; i++) {
        const d = getNextSimDevotee();
        const res = Rituals.burnIncense({
          user: d.user,
          uniqueId: d.uniqueId,
          count: 3,
          wish: d.wish
        });
        results.push(res);
      }
      return { success: true, count, results };
    }
    case 'temple.burnIncense':
      return Rituals.burnIncense(params);"""

assert old_rpc_case in server_content, 'old_rpc_case not found'
server_content = server_content.replace(old_rpc_case, new_rpc_case)

# Update runSingleSimulationStep for wave support
old_sim = """function runSingleSimulationStep() {
  const pick = getNextSimDevotee();
  const roll = Math.random();
  if (roll < 0.35) {
    Rituals.burnIncense({ user: pick.user, uniqueId: pick.uniqueId, count: 3, wish: pick.wish });
  } else if (roll < 0.60) {
    Rituals.sendPrayer({ user: pick.user, uniqueId: pick.uniqueId, wish: pick.wish });
  } else if (roll < 0.78) {
    Rituals.drawFortune({ user: pick.user, uniqueId: pick.uniqueId, topic: pick.wish });
  } else if (roll < 0.90) {
    Rituals.offerGift({ user: pick.user, uniqueId: pick.uniqueId, giftType: 'lotus', coins: 15, giftName: 'Hoa Sen Vàng Tinh Khiết' });
  } else {
    Rituals.ringBell({ user: pick.user, uniqueId: pick.uniqueId, count: 1, wish: pick.wish, readTts: true });
  }
}"""

new_sim = """function runSingleSimulationStep() {
  const pick = getNextSimDevotee();
  const roll = Math.random();
  // 30% xác suất xuất hiện làn sóng dâng hương đồng thời (2 đến 5 người)
  if (roll < 0.30) {
    const waveCount = 2 + Math.floor(Math.random() * 4); // 2, 3, 4 hoặc 5 người
    for (let w = 0; w < waveCount; w++) {
      setTimeout(() => {
        const d = getNextSimDevotee();
        Rituals.burnIncense({ user: d.user, uniqueId: d.uniqueId, count: 3, wish: d.wish });
      }, w * 280);
    }
    return;
  }
  if (roll < 0.60) {
    Rituals.burnIncense({ user: pick.user, uniqueId: pick.uniqueId, count: 3, wish: pick.wish });
  } else if (roll < 0.75) {
    Rituals.sendPrayer({ user: pick.user, uniqueId: pick.uniqueId, wish: pick.wish });
  } else if (roll < 0.88) {
    Rituals.drawFortune({ user: pick.user, uniqueId: pick.uniqueId, topic: pick.wish });
  } else if (roll < 0.95) {
    Rituals.offerGift({ user: pick.user, uniqueId: pick.uniqueId, giftType: 'lotus', coins: 15, giftName: 'Hoa Sen Vàng Tinh Khiết' });
  } else {
    Rituals.ringBell({ user: pick.user, uniqueId: pick.uniqueId, count: 1, wish: pick.wish, readTts: true });
  }
}"""
assert old_sim in server_content, 'old_sim not found'
server_content = server_content.replace(old_sim, new_sim)

# Update auto sim interval
old_interval = "autoSimTimer = setInterval(runSingleSimulationStep, state.settings.autoSimIntervalMs || 9500);"
new_interval = "autoSimTimer = setInterval(runSingleSimulationStep, state.settings.autoSimIntervalMs || 6500);"
assert old_interval in server_content, 'old_interval not found'
server_content = server_content.replace(old_interval, new_interval)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(server_content)
print('Successfully updated server.js')

# Update public/js/live.js
with open('public/js/live.js', 'r', encoding='utf-8') as f:
    live_content = f.read()

# Add modal listeners and wave button
old_live_dock = """  document.getElementById('btnRpcGrandCeremony')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.grandCeremony', {
      user,
      coins: 299,
      giftName: 'Đại Lễ Kim Long Chầu Phật',
      wish
    });
  });"""

new_live_dock = """  document.getElementById('btnRpcGrandCeremony')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.grandCeremony', {
      user,
      coins: 299,
      giftName: 'Đại Lễ Kim Long Chầu Phật',
      wish
    });
  });

  document.getElementById('btnRpcWave7')?.addEventListener('click', () => {
    callRpc('temple.simulateWave', { count: 7 });
  });

  // Modal Giới Thiệu & Thể Lệ Đạo Tràng
  const guideModal = document.getElementById('templeGuideModal');
  const btnOpenGuide = document.getElementById('btnOpenTempleGuide');
  const btnCloseGuide = document.getElementById('btnCloseTempleGuide');
  const btnUnderstood = document.getElementById('btnGuideUnderstood');
  const marqueeBanner = document.getElementById('templeScrollMarquee');

  function openTempleGuide() {
    guideModal?.classList.add('active');
  }
  function closeTempleGuide() {
    guideModal?.classList.remove('active');
  }

  btnOpenGuide?.addEventListener('click', (e) => {
    e.stopPropagation();
    openTempleGuide();
  });
  marqueeBanner?.addEventListener('click', (e) => {
    e.stopPropagation();
    openTempleGuide();
  });
  btnCloseGuide?.addEventListener('click', closeTempleGuide);
  btnUnderstood?.addEventListener('click', closeTempleGuide);
  guideModal?.addEventListener('click', (e) => {
    if (e.target === guideModal) closeTempleGuide();
  });"""

assert old_live_dock in live_content, 'old_live_dock not found'
live_content = live_content.replace(old_live_dock, new_live_dock)

with open('public/js/live.js', 'w', encoding='utf-8') as f:
    f.write(live_content)
print('Successfully updated public/js/live.js')
