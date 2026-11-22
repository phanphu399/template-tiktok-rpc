/**
 * Live 9:16 Client Controller — Chánh Điện Đức Phật A Di Đà & Đạo Tràng Phật Tử Quỳ Lễ
 * - Hiển thị 6 Đệm Quỳ VIP (Top 6 Bảng Vàng Công Đức)
 * - Hiển thị 40 Phật Tử mặc áo lam quỳ hai bên thảm đỏ + thẻ tên người xem
 * - Hiệu ứng người xem bước dọc thảm đỏ lên trước Lư Hương Đồng dâng hương
 * - Giọng đọc ZeroTTS (Mai Chi) + Pháp khí Web Audio
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('obs') === '1') {
    document.body.classList.add('obs-mode');
  }

  // 1. Tự động co giãn khung 1080x1920 vừa khít Stage Wrapper (9:16)
  const stageWrapper = document.getElementById('stageWrapper');
  const stage9x16 = document.getElementById('stage9x16');

  function fitStage() {
    if (!stageWrapper || !stage9x16) return;
    const rect = stageWrapper.getBoundingClientRect();
    const scale = rect.width / 1080;
    // Khi kích thước chuẩn 1080x1920 (scale xấp xỉ 1.0), bỏ transform scale để Chromium render 1:1 pixel-perfect không bị mờ
    if (Math.abs(scale - 1) < 0.005) {
      stage9x16.style.transform = 'none';
    } else {
      stage9x16.style.transform = `scale(${scale})`;
    }
  }
  window.addEventListener('resize', fitStage);
  fitStage();

  // 2. Khởi tạo Particle Engine & Audio Engine (ZeroTTS Gia Huy / Nam Trầm Ấm)
  const canvas = document.getElementById('templeCanvas');
  const particles = new window.TempleParticleEngine(canvas);
  const audio = new window.TempleAudioEngine();
  window.templeAudio = audio;

  // Khởi tạo Hệ thống Quản lý Chỗ Ngồi Sân Lễ & Phật Tử Di Chuyển
  const congregationHall = document.getElementById('congregationHall');
  const seatManager = new window.TempleSeatManager({ container: congregationHall });
  const worshipperManager = new window.TempleWorshipperManager(congregationHall, seatManager);

  // Khởi tạo Thầy Trụ Trì Chùa Linh Ứng & Hàng Đợi Thông Báo
  const monkZone = document.getElementById('abbotMonkZone') || stage9x16;
  const monkController = new window.TempleMonkController(monkZone, { audio });

  // Khởi tạo Hệ thống Camera 2.5D Chống Rung Lắc & Chống Co Giãn Liên Tục
  const cameraRig = document.getElementById('cameraRig');
  // Camera cố định toàn cảnh Chánh Điện trang nghiêm (KHÔNG zoom, KHÔNG lia cam)
  class CameraController {
    constructor(element) {
      this.el = element;
      if (this.el) {
        this.el.style.transform = 'none';
        this.el.style.transition = 'none';
      }
    }

    focusAltar() {
      // Giữ góc nhìn cố định vững vàng, không zoom hay lia cam
      if (this.el) {
        this.el.style.transform = 'none';
      }
    }

    resetCamera() {
      if (this.el) {
        this.el.style.transform = 'none';
      }
    }
  }
  const cameraController = new CameraController(cameraRig);
  window.templeCameraController = cameraController;
  window.templeMonkController = monkController;
  window.templeSeatManager = seatManager;
  window.templeWorshipperManager = worshipperManager;
  window.templeAudio = audio;

  function unlockAudioOnce() {
    audio.ensureContext();
    const btnUnlock = document.getElementById('btnUnlockAudio');
    if (btnUnlock) {
      btnUnlock.textContent = '✅ Âm Thanh Chùa Đã Sẵn Sàng';
      btnUnlock.classList.remove('gold');
      btnUnlock.classList.add('active-toggle');
    }
  }
  window.addEventListener('pointerdown', unlockAudioOnce, { once: true });
  window.addEventListener('click', unlockAudioOnce, { once: true });
  window.addEventListener('keydown', unlockAudioOnce, { once: true });
  // Thử tự động kích hoạt AudioContext khi trang vừa tải
  setTimeout(unlockAudioOnce, 800);

  // 3. Vẽ các nén nhang đang cháy trong Lư Hương Đỉnh Đồng (x=540, y=895)
  const incenseHolder = document.getElementById('incenseSticksHolder');
  let renderedStickCount = 0;

  function renderIncenseSticks(count) {
    const target = Math.max(3, Math.min(27, Number(count) || 9));
    if (target === renderedStickCount && incenseHolder.children.length > 0) return;
    renderedStickCount = target;
    incenseHolder.innerHTML = '';

    const tips = [];
    for (let i = 0; i < target; i++) {
      const stick = document.createElement('div');
      stick.className = 'incense-stick';

      const spread = target === 1 ? 0 : (i / (target - 1) - 0.5) * 2;
      const leftPx = 65 + spread * 25 + Math.sin(i * 2.3) * 1.5;
      const angleDeg = spread * 10 + Math.cos(i * 1.7) * 1.2;
      const heightPx = 74 + (i % 5) * 3 + Math.sin(i * 1.2) * 2;

      stick.style.left = `${leftPx}px`;
      stick.style.height = `${heightPx}px`;
      stick.style.transform = `rotate(${angleDeg}deg)`;

      const ember = document.createElement('div');
      ember.className = 'incense-ember';
      ember.style.animationDelay = `${(i * 0.28) % 2.4}s`;
      stick.appendChild(ember);
      incenseHolder.appendChild(stick);

      const rad = (angleDeg * Math.PI) / 180;
      const tipX = 540 + (leftPx - 65) + Math.sin(rad) * heightPx;
      const tipY = 895 - Math.cos(rad) * heightPx;
      tips.push({ x: tipX, y: tipY });
    }
    particles.setIncenseTips(tips);
  }

  // 4. Dựng Hàng 6 Đệm Quỳ VIP (Top 6 Thí Chủ trên bục gỗ y=1188)
  const VIP_CUSHION_COORDS = [
    { x: 140, y: 1188, rank: 1 },
    { x: 268, y: 1188, rank: 2 },
    { x: 392, y: 1188, rank: 3 },
    { x: 688, y: 1188, rank: 4 },
    { x: 812, y: 1188, rank: 5 },
    { x: 940, y: 1188, rank: 6 }
  ];

  function renderVipCushions(leaderboard = []) {
    // Đã được tích hợp toàn diện vào SeatManager động (các vị trí hàng đầu) để tránh chồng lấn
    const layer = document.getElementById('vipCushionsLayer');
    if (layer) layer.innerHTML = '';
  }

  // 5. Dựng Đạo Tràng 40 Phật Tử Quỳ Lễ Hai Bên Thảm Đỏ (5 Hàng x 4 Cột mỗi bên)
  const HALL_SEAT_COORDS = [];

  (function buildHallGrid() {
    const rows = 5;
    const colsPerSide = 4;
    for (let r = 0; r < rows; r++) {
      const progress = r / (rows - 1); // 0 (xa) -> 1 (gần)
      const y = Math.round(1290 + progress * 355); // 1290 -> 1645
      const scale = +(0.76 + progress * 0.28).toFixed(2);

      // Cánh trái thảm đỏ
      const leftInnerX = Math.round(335 - progress * 48); // mép thảm mở rộng dần
      const leftOuterX = 48;
      for (let c = 0; c < colsPerSide; c++) {
        const t = c / (colsPerSide - 1);
        const x = Math.round(leftOuterX + t * (leftInnerX - leftOuterX));
        HALL_SEAT_COORDS.push({ side: 'L', row: r, col: c, x, y, scale });
      }

      // Cánh phải thảm đỏ
      const rightInnerX = Math.round(745 + progress * 48);
      const rightOuterX = 1032;
      for (let c = 0; c < colsPerSide; c++) {
        const t = c / (colsPerSide - 1);
        const x = Math.round(rightInnerX + t * (rightOuterX - rightInnerX));
        HALL_SEAT_COORDS.push({ side: 'R', row: r, col: c, x, y, scale });
      }
    }
  })();

  let lastRenderedLeaderboardJson = '';

  function renderCongregationHall(leaderboard = [], recentDevotees = []) {
    if (!congregationHall) return;
    worshipperManager.syncViewers(leaderboard);
    if (Array.isArray(recentDevotees)) {
      worshipperManager.syncViewers(recentDevotees);
    }
  }

  // Preload toàn bộ 8 frame nhân vật Phật tử + 4 frame Trụ Trì vào bộ nhớ để chuyển frame mượt 0ms
  const SPRITE_FRAMES = {
    walk1: '/assets/devotee_walk.png',
    walk2: '/assets/devotee_walk_2.png',
    kneelDown: '/assets/devotee_kneel_down.png',
    kneel: '/assets/devotee.png',
    forehead: '/assets/devotee_bow.png',
    bowMid: '/assets/devotee_bow_mid.png',
    prostrate: '/assets/devotee_prostrate.png',
    prostrateDeep: '/assets/devotee_prostrate_deep.png',
    monkStand: '/assets/monk_stand.png',
    monkWalk1: '/assets/monk_walk_1.png',
    monkWalk2: '/assets/monk_walk_2.png',
    monkBow: '/assets/monk_bow.png'
  };
  Object.values(SPRITE_FRAMES).forEach((url) => {
    const img = new Image();
    img.src = url;
  });

  function pulseHallBowing() {
    if (worshipperManager) {
      worshipperManager.pulseHallBowing();
    }
  }

  let prostrationTimers = [];
  function clearProstrationTimers() {
    while (prostrationTimers.length > 0) {
      clearTimeout(prostrationTimers.pop());
    }
  }

  // Chuyển đổi tức thời giữa 8 khung hình đã giải mã sẵn trên GPU (KHÔNG BAO GIỜ BỊ MẤT HÌNH)
  function setCentralPose(poseKey) {
    const stack = document.getElementById('centralSpriteStack');
    if (!stack) return;
    const frames = stack.querySelectorAll('.pose-frame');
    frames.forEach((img) => {
      img.classList.toggle('active', img.getAttribute('data-pose') === poseKey);
    });
  }

  function schedulePose(ms, poseKey) {
    prostrationTimers.push(
      setTimeout(() => {
        setCentralPose(poseKey);
      }, ms)
    );
  }

  // Chuỗi 8 khung hình Đảnh lễ Tam Bái mượt mà (Hạ gối -> Chắp tay ngực -> Đưa lên trán -> Nghiêng 45° -> Chống tay -> Lạy sát đất -> Ngẩng lên)
  function playThreeBowsSequence(startDelayMs = 0, bowCount = 3, onComplete = null) {
    schedulePose(startDelayMs, 'kneelDown');
    schedulePose(startDelayMs + 160, 'kneel');

    const singleBowDuration = 1450;
    const count = Math.max(1, Math.min(3, bowCount));
    let lastT = startDelayMs + 300;

    for (let b = 0; b < count; b++) {
      const t0 = startDelayMs + 300 + b * singleBowDuration;
      schedulePose(t0, 'forehead');            // 1. Chắp tay đưa lên trán
      schedulePose(t0 + 170, 'bowMid');        // 2. Cúi gập lưng 45°
      schedulePose(t0 + 330, 'prostrate');     // 3. Vươn hai tay chống xuống đệm
      schedulePose(t0 + 500, 'prostrateDeep'); // 4. Lạy sát đất (Ngũ thể đầu địa)
      schedulePose(t0 + 840, 'prostrate');     // 5. Bắt đầu nâng đầu lên
      schedulePose(t0 + 1020, 'bowMid');       // 6. Nâng lưng lên góc 45°
      schedulePose(t0 + 1180, 'kneel');        // 7. Ngồi quỳ thẳng lưng
      lastT = t0 + 1180;
    }

    schedulePose(lastT + 400, 'forehead');
    schedulePose(lastT + 800, 'kneel');

    if (onComplete) {
      prostrationTimers.push(
        setTimeout(onComplete, lastT + 950)
      );
    }
  }

  // =========================================================================
  // HỆ THỐNG HÀNG ĐỢI HÀNH LỄ ĐỘC QUYỀN (PILGRIMAGE QUEUE & LOCK)
  // - Khi nhiều người dâng hương: xếp hàng tuần tự, KHÔNG BAO GIỜ BỊ HUỶ ĐỘNG TÁC QUỲ LẠY
  // - Camera giữ vững vàng không co giãn, chỉ zoom nhẹ 1 lần rồi giữ yên
  // - Trụ Trì dạt đường trong suốt thời gian có người hành lễ
  // =========================================================================
  const carpetPilgrimageQueue = [];
  let isCarpetPilgrimageRunning = false;
  let carpetIdleTimer = null;

  function animateWalkerOnCarpet(user, avatar, actionLabel, wish, originSeat = null, isPriority = false) {
    if (!user) return;

    // Đẩy vào hàng đợi (tối đa 25 người để tránh quá tải)
    if (carpetPilgrimageQueue.length < 25) {
      const item = { user, avatar, actionLabel, wish, originSeat, isPriority };
      if (isPriority) {
        const insertIdx = carpetPilgrimageQueue.findIndex(p => !p.isPriority);
        if (insertIdx >= 0) carpetPilgrimageQueue.splice(insertIdx, 0, item);
        else carpetPilgrimageQueue.push(item);
      } else {
        carpetPilgrimageQueue.push(item);
      }
    }

    if (!isCarpetPilgrimageRunning) {
      processNextCarpetPilgrim();
    }
  }

  function processNextCarpetPilgrim() {
    if (carpetPilgrimageQueue.length === 0) {
      isCarpetPilgrimageRunning = false;
      // Khi hàng đợi đã hết, chờ 2.5s tĩnh lặng rồi mới trả góc máy và cho Trụ Trì tiếp tục bách bộ
      if (carpetIdleTimer) clearTimeout(carpetIdleTimer);
      carpetIdleTimer = setTimeout(() => {
        if (!isCarpetPilgrimageRunning && carpetPilgrimageQueue.length === 0) {
          if (cameraController) cameraController.resetCamera(0);
          if (monkController && typeof monkController.resumePatrol === 'function') {
            monkController.resumePatrol();
          }
        }
      }, 2500);
      return;
    }

    if (carpetIdleTimer) {
      clearTimeout(carpetIdleTimer);
      carpetIdleTimer = null;
    }

    isCarpetPilgrimageRunning = true;
    const pilgrim = carpetPilgrimageQueue.shift();
    const isCrowded = carpetPilgrimageQueue.length >= 2;

    executePilgrimRun(pilgrim, isCrowded, () => {
      // Khi thí chủ hiện tại hoàn thành trọn vẹn chuỗi quỳ lạy -> Chuyển ngay thí chủ tiếp theo
      processNextCarpetPilgrim();
    });
  }

  function executePilgrimRun(pilgrim, isCrowded, onComplete) {
    const centralEl = document.getElementById('centralWorshipper');
    if (!centralEl) {
      if (onComplete) onComplete();
      return;
    }

    clearProstrationTimers();

    // 1. Cập nhật thẻ tên, avatar, lời nguyện của thí chủ hành lễ
    updateCentralWorshipper(pilgrim.user, pilgrim.avatar, pilgrim.actionLabel, pilgrim.wish, false);

    // 2. Thầy Trụ Trì dạt đường sang một bên đứng niệm Phật nhường lối
    if (monkController && typeof monkController.yieldWay === 'function') {
      monkController.yieldWay();
    }

    // 3. Camera ổn định: Giữ vững góc nhìn Chánh Điện trang nghiêm (KHÔNG CO GIÃN LIÊN TỤC)
    if (cameraController) {
      cameraController.focusAltar();
    }

    // 4. Khởi động bước đi trên thảm đỏ (Tự động điều chỉnh nhịp bước khi đông người)
    const walkDuration = isCrowded ? 1200 : 1700;
    centralEl.classList.remove('walking-up');
    void centralEl.offsetWidth;
    centralEl.style.animationDuration = `${walkDuration}ms`;
    centralEl.classList.add('walking-up');

    setCentralPose('walk1');
    const stepInterval = 170;
    const totalSteps = Math.floor(walkDuration / stepInterval);
    for (let step = 1; step <= totalSteps; step++) {
      schedulePose(step * stepInterval, step % 2 === 0 ? 'walk1' : 'walk2');
    }

    // 5. Dừng bước trước bậc thềm, hạ gối quỳ xuống và thực hiện ĐẦY ĐỦ chuỗi Đảnh lễ Tam Bái
    prostrationTimers.push(
      setTimeout(() => {
        centralEl.classList.remove('walking-up');
        centralEl.style.animationDuration = '';
      }, walkDuration)
    );

    // Khi đông người: thực hiện 1 lạy ngũ thể đầu địa trang nghiêm (~2.8s)
    // Khi vắng người: thực hiện 2 lạy tam bái đại lễ (~4.2s)
    const bowCount = isCrowded ? 1 : 2;
    playThreeBowsSequence(walkDuration + 40, bowCount, () => {
      setTimeout(onComplete, 350);
    });
  }

  function updateCentralWorshipper(user, avatar, actionLabel, wish, doThreeBows = true) {
    const nameEl = document.getElementById('centralName');
    const actEl = document.getElementById('centralAction');
    const wishEl = document.getElementById('centralWishBubble');
    const avatarEl = document.getElementById('centralAvatar');
    const beam = document.getElementById('sacredLightBeam');

    if (nameEl) nameEl.textContent = user || 'Thí Chủ Hữu Duyên';
    if (actEl) actEl.textContent = actionLabel || '✨ Dâng hương cầu an';
    if (wishEl) wishEl.textContent = `“${wish || 'Nam Mô A Di Đà Phật, cầu bình an cát tường'}”`;

    if (avatarEl) {
      if (avatar) {
        avatarEl.innerHTML = `<img src="${escapeHtml(avatar)}" alt="" />`;
      } else {
        avatarEl.textContent = String(user || '🙏').trim().charAt(0).toUpperCase();
      }
    }

    if (doThreeBows) {
      clearProstrationTimers();
      const centralEl = document.getElementById('centralWorshipper');
      if (centralEl) centralEl.classList.remove('walking-up');
      playThreeBowsSequence(0);
    }
    if (beam) {
      beam.classList.add('intense');
      setTimeout(() => beam.classList.remove('intense'), 4500);
    }

    const haloSys = document.getElementById('buddhaHaloSystem');
    const lotusHand = document.getElementById('lotusHandHalo');
    if (haloSys) {
      haloSys.classList.add('flare');
      setTimeout(() => haloSys.classList.remove('flare'), 3600);
    }
    if (lotusHand) {
      lotusHand.classList.add('flare');
      setTimeout(() => lotusHand.classList.remove('flare'), 3600);
    }
    particles.spawnBellWave(540, 260, 2);

    // Cập nhật dòng thông báo dưới thanh HUD
    const hudName = document.getElementById('devoteeNameLine');
    const hudAct = document.getElementById('devoteeActionTag');
    if (hudName) hudName.textContent = user || 'Thí Chủ';
    if (hudAct) hudAct.textContent = actionLabel || 'Dâng hương';
  }

  // 6. Cập nhật toàn bộ giao diện theo State từ Server
  let hasInitializedRealLeader = false;

  function updateUIState(st) {
    if (!st) return;

    document.getElementById('statIncense').textContent = Number(st.totalIncense || 0).toLocaleString('vi-VN');
    document.getElementById('statMerit').textContent = Number(st.totalMerit || 0).toLocaleString('vi-VN');
    document.getElementById('statWoodenFish').textContent = Number(st.woodenFishHits || 0).toLocaleString('vi-VN');

    renderIncenseSticks(st.activeIncenseSticks || 9);

    const lb = Array.isArray(st.leaderboard) ? st.leaderboard : [];
    renderVipCushions(lb);

    // Đồng bộ số lượng Phật tử quỳ dưới sân chuẩn xác theo lượt view thực tế của phiên Live
    const sessionList = Array.isArray(st.sessionDevotees) ? st.sessionDevotees : [];
    const viewerCount = Number(st.tiktok?.viewerCount || 0);
    const isLiveConnected = Boolean(st.tiktok?.connected);
    const isAutoSim = Boolean(st.settings?.autoSim);

    if (worshipperManager && typeof worshipperManager.syncLiveAudience === 'function') {
      worshipperManager.syncLiveAudience(sessionList, viewerCount, isLiveConnected, isAutoSim);
    } else {
      renderCongregationHall(lb, rec);
    }

    // Đồng bộ tên Chủ Lễ mặc định theo người dẫn đầu thực tế nếu chưa có sự kiện mới
    if (!hasInitializedRealLeader && lb.length > 0) {
      hasInitializedRealLeader = true;
      const topDev = lb[0];
      updateCentralWorshipper(
        topDev.name,
        topDev.avatar,
        `✨ Công đức: ${Number(topDev.merit).toLocaleString('vi-VN')} CĐ`,
        topDev.lastWish || 'Nam Mô A Di Đà Phật, cầu bình an cát tường',
        false
      );
    }

    // Cập nhật Bảng TẤM LÒNG THÀNH ở góc dưới phải (Top 4)
    const lbList = document.getElementById('leaderboardList');
    if (lbList) {
      lbList.innerHTML = lb
        .slice(0, 4)
        .map(
          (item) => `
          <div class="leader-item">
            <span class="leader-rank">${item.rank}</span>
            <span class="leader-name">${escapeHtml(shortenName(item.name, 14))}</span>
            <span class="leader-merit">${Number(item.merit).toLocaleString('vi-VN')}</span>
          </div>
        `
        )
        .join('');
    }

    // Trạng thái kết nối TikTok Live
    const liveDot = document.getElementById('liveDot');
    const liveText = document.getElementById('liveStatusText');
    if (st.tiktok?.connected) {
      liveDot.classList.add('connected');
      liveText.textContent = `LIVE @${st.tiktok.username} • ${st.tiktok.viewerCount || 0} mắt`;
    } else if (st.tiktok?.connecting) {
      liveDot.classList.remove('connected');
      liveText.textContent = `Đang kết nối @${st.tiktok.username}...`;
    } else {
      liveDot.classList.remove('connected');
      liveText.textContent = st.settings?.autoSim
        ? 'CHÙA LINH ỨNG • TỰ ĐỘNG GIẢ LẬP ĐÔNG NGƯỜI'
        : 'CHÙA LINH ỨNG • ĐỨC PHẬT A DI ĐÀ';
    }

    const btnAutoSim = document.getElementById('btnToggleAutoSim');
    if (btnAutoSim && st.settings) {
      btnAutoSim.textContent = st.settings.autoSim
        ? '🤖 Tự động Giả lập Người Xem: ĐANG BẬT'
        : '🤖 Tự động Giả lập Người Xem: TẮT';
      btnAutoSim.classList.toggle('active-toggle', Boolean(st.settings.autoSim));
    }
    if (st.settings) {
      if (typeof st.settings.musicVolume === 'number') {
        audio.setMusicVolume(st.settings.musicVolume);
        const sMus = document.getElementById('sliderMusicVol');
        const vMus = document.getElementById('valMusicVol');
        const pct = Math.round(st.settings.musicVolume * 100);
        if (sMus) sMus.value = String(pct);
        if (vMus) vMus.textContent = `${pct}%`;
      }
      if (typeof st.settings.ttsVolume === 'number') {
        audio.setTtsVolume(st.settings.ttsVolume);
        const sTts = document.getElementById('sliderTtsVol');
        const vTts = document.getElementById('valTtsVol');
        const pct = Math.round(st.settings.ttsVolume * 100);
        if (sTts) sTts.value = String(pct);
        if (vTts) vTts.textContent = `${pct}%`;
      }
    }


    const feed = document.getElementById('eventFeed');
    if (feed && Array.isArray(st.recentEvents)) {
      feed.innerHTML = st.recentEvents
        .slice(0, 8)
        .map((ev) => `<div class="event-feed-item">${formatEventSummary(ev)}</div>`)
        .join('');
    }
  }

  function formatEventSummary(ev) {
    switch (ev.type) {
      case 'burnIncense':
        return `🔥 <strong>${escapeHtml(ev.user)}</strong> dâng ${ev.count} nén nhang (+${ev.merit} CĐ)`;
      case 'strikeWoodenFish':
        return `🪵 <strong>${escapeHtml(ev.user)}</strong> gõ mõ ${ev.count} nhịp (+${ev.merit} CĐ)`;
      case 'ringBell':
        return `🔔 <strong>${escapeHtml(ev.user)}</strong> thỉnh Đại Hồng Chung (+${ev.merit} CĐ)`;
      case 'sendPrayer':
        return `🏮 <strong>${escapeHtml(ev.user)}</strong> cầu phúc: “${escapeHtml(ev.wish)}”`;
      case 'offerGift':
      case 'grandCeremony':
        return `🪷 <strong>${escapeHtml(ev.user)}</strong> dâng <em>${escapeHtml(ev.giftName)}</em> (+${ev.merit} CĐ)`;
      case 'drawFortune':
        return `🎋 <strong>${escapeHtml(ev.user)}</strong> gieo được Quẻ số ${ev.fortune?.number} (${ev.fortune?.rank})`;
      default:
        return `✨ <strong>${escapeHtml(ev.user || 'Thí chủ')}</strong> tương tác`;
    }
  }

  // 7. Xử lý hiệu ứng khi có Nghi Thức mới
  let fortuneTimer = null;
  let grandTimer = null;

  function triggerRitualVisuals(ev) {
    if (!ev) return;

    if (ev.ttsText && ev.type !== 'drawFortune' && ev.type !== 'adminNotice') {
      const priority = ev.ttsPriority != null ? Number(ev.ttsPriority) : ((ev.type === 'offerGift' || ev.type === 'grandCeremony') ? 0 : 1);
      audio.enqueueTts(ev.ttsText, { voice: ev.ttsVoice || 'giahuy', priority });
    }

    switch (ev.type) {
      case 'likeBow': {
        // Mute sound on likes to prevent chaotic noise clutter, only spawn visual merits & bow
        particles.spawnFloatingMerit(`+${ev.merit} Công Đức`, 540, 890, '#ff80ab');
        updateCentralWorshipper(ev.user, ev.avatar, `❤️ Thả tim bái Phật (+${ev.merit} CĐ)`, ev.wish, false);
        if (worshipperManager) worshipperManager.dispatchInteraction(ev);
        break;
      }

      case 'newcomerBow': {
        audio.playIncenseChime();
        particles.spawnFloatingMerit(`+${ev.merit} Duyên Lành`, 540, 890, '#81d4fa');
        updateCentralWorshipper(ev.user, ev.avatar, `✨ Vào Chánh Điện bái Phật`, ev.wish, false);
        if (worshipperManager) worshipperManager.dispatchInteraction(ev);
        break;
      }

      case 'adminNotice': {
        audio.playTempleBell(0.9);
        if (monkController) {
          monkController.receiveNotice(ev);
        }
        break;
      }

      case 'burnIncense': {
        audio.playIncenseChime();
        particles.spawnIncenseBurst(540, 895);
        particles.spawnFloatingMerit(`+${ev.merit} Công Đức`, 540, 860, '#ffe082');
        updateCentralWorshipper(ev.user, ev.avatar, `🔥 Dâng ${ev.count} nén hương (+${ev.merit} CĐ)`, ev.wish, false);
        if (worshipperManager) worshipperManager.dispatchInteraction(ev);
        break;
      }

      case 'strikeWoodenFish': {
        // Tiếng khánh thanh tao thay thế tiếng gõ mõ
        audio.playIncenseChime();
        pulseHallBowing();
        particles.spawnFloatingMerit(`+${ev.merit} Công Đức`, 890, 935, '#ffd54f');
        break;
      }

      case 'ringBell': {
        audio.playTempleBell(1.0);
        pulseHallBowing();
        particles.spawnBellWave(540, 510, 4);
        particles.spawnFloatingMerit(`+${ev.merit} Công Đức`, 190, 935, '#fff3b0');
        updateCentralWorshipper(ev.user, ev.avatar, `🔔 Thỉnh Đại Hồng Chung (+${ev.merit} CĐ)`, ev.wish, false);
        break;
      }

      case 'sendPrayer': {
        audio.playIncenseChime();
        spawnSkyLantern(ev.user, ev.wish);
        particles.spawnFloatingMerit(`+${ev.merit} Công Đức`, 540, 920, '#ffb74d');
        updateCentralWorshipper(ev.user, ev.avatar, `🏮 Cầu phúc (+${ev.merit} CĐ)`, ev.wish, false);
        if (worshipperManager) worshipperManager.dispatchInteraction(ev);
        break;
      }

      case 'offerGift': {
        audio.playIncenseChime();
        audio.playTempleBell(0.85);
        particles.spawnIncenseBurst(540, 895);
        particles.spawnFloatingMerit(`+${ev.merit} Công Đức`, 540, 840, '#fff3b0');
        if (monkController && ev.user) monkController.recordDonor(ev.user);
        updateCentralWorshipper(ev.user, ev.avatar, `🪷 Dâng ${ev.giftName} (+${ev.merit} CĐ)`, ev.wish, false);
        if (worshipperManager) worshipperManager.dispatchInteraction(ev);
        break;
      }

      case 'grandCeremony': {
        audio.playTempleBell(1.2);
        setTimeout(() => audio.playTempleBell(1.1), 900);
        particles.spawnGrandCeremonyRain();
        pulseHallBowing();
        showGrandCeremonyBanner(ev.user, ev.giftName, ev.merit);
        if (monkController && ev.user) monkController.recordDonor(ev.user);
        updateCentralWorshipper(ev.user, ev.avatar, `🐉 ${ev.giftName} (+${ev.merit} CĐ)`, ev.wish, false);
        if (worshipperManager) worshipperManager.dispatchInteraction(ev);
        break;
      }

      case 'drawFortune': {
        audio.playFortuneShake();
        updateCentralWorshipper(
          ev.user,
          ev.avatar,
          `🎋 Đang xin xăm...`,
          `Thí chủ ${ev.user} đang thành tâm xin quẻ...`,
          false
        );
        // Chỉ hiển thị tờ Quẻ Xăm đúng thời điểm giọng đọc bắt đầu vang lên!
        audio.enqueueTts(ev.ttsText || '', {
          voice: ev.ttsVoice || 'giahuy',
          onStart: () => {
            audio.playIncenseChime();
            showFortuneModal(ev.user, ev.fortune);
            updateCentralWorshipper(
              ev.user,
              ev.avatar,
              `🎋 Quẻ số ${ev.fortune?.number} (${ev.fortune?.rank})`,
              ev.fortune?.meaning || '',
              true
            );
          },
          onEnd: () => {
            clearTimeout(fortuneTimer);
            // Giữ hiển thị 12 giây sau khi đọc để người xem trên điện thoại kịp đọc & chụp màn hình
            fortuneTimer = setTimeout(() => {
              document.getElementById('fortuneModal')?.classList.remove('visible');
            }, 12000);
          }
        });
        break;
      }
    }
  }

  function spawnSkyLantern(user, wish) {
    const layer = document.getElementById('skyLanternsLayer');
    if (!layer) return;
    const lantern = document.createElement('div');
    lantern.className = 'sky-lantern';
    const leftPos = 80 + Math.floor(Math.random() * 640);
    lantern.style.left = `${leftPos}px`;
    lantern.innerHTML = `
      <div class="sky-lantern-user">🙏 ${escapeHtml(user)}</div>
      <div class="sky-lantern-wish">“${escapeHtml(wish)}”</div>
    `;
    layer.appendChild(lantern);
    setTimeout(() => {
      lantern.remove();
    }, 10600);
  }

  function showFortuneModal(user, fortune) {
    if (!fortune) return;
    const modal = document.getElementById('fortuneModal');
    document.getElementById('fortuneRankBadge').textContent = fortune.rank.toUpperCase();
    document.getElementById('fortuneTitle').textContent = `Quẻ Số ${fortune.number} — ${fortune.title}`;
    document.getElementById('fortuneDevotee').textContent = `Thí chủ cầu quẻ: ${user}`;
    document.getElementById('fortunePoem').textContent = fortune.poem;
    document.getElementById('fortuneMeaning').textContent = `Lời bàn: ${fortune.meaning}`;

    modal.classList.add('visible');
    clearTimeout(fortuneTimer);
    fortuneTimer = setTimeout(() => {
      modal.classList.remove('visible');
    }, 18000);
  }

  document.getElementById('fortuneModal')?.addEventListener('click', () => {
    document.getElementById('fortuneModal').classList.remove('visible');
  });

  function showGrandCeremonyBanner(user, giftName, merit) {
    const banner = document.getElementById('grandCeremonyBanner');
    document.getElementById('grandTitle').textContent = `🐉 ${giftName.toUpperCase()} 🐉`;
    document.getElementById('grandSub').textContent = `Đại Thí Chủ ${user} • Công Đức Vô Lượng (+${merit} CĐ)`;
    banner.classList.add('visible');
    clearTimeout(grandTimer);
    grandTimer = setTimeout(() => {
      banner.classList.remove('visible');
    }, 6800);
  }

  // 8. Kết nối JSON-RPC 2.0 WebSocket & Gửi Lệnh RPC
  let ws = null;
  let rpcId = 1;

  function connectWebSocket() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.method === 'temple.state') {
          updateUIState(msg.params);
        } else if (msg.method === 'temple.memberJoin') {
          if (worshipperManager && msg.params) {
            worshipperManager.registerActiveViewer(msg.params);
          }
        } else if (msg.method === 'temple.chat') {
          if (worshipperManager && msg.params) {
            worshipperManager.showViewerChat(
              msg.params.user,
              msg.params.uniqueId,
              msg.params.text,
              msg.params.avatar
            );
          }
        } else if (msg.method === 'temple.event') {
          if (msg.params?.state) updateUIState(msg.params.state);
          if (msg.params?.event) triggerRitualVisuals(msg.params.event);
        } else if (msg.method === 'tts.play' || msg.method === 'temple.speak') {
          const text = msg.params?.text || 'Nam mô A Di Đà Phật';
          const voice = msg.params?.voice || 'giahuy';
          const priority = msg.params?.priority != null ? Number(msg.params.priority) : 0;
          if (msg.params?.url) {
            audio.enqueueTts(text, { voice, url: msg.params.url, priority });
          } else {
            audio.enqueueTts(text, { voice, priority });
          }
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      setTimeout(connectWebSocket, 2000);
    };
  }
  connectWebSocket();

  async function callRpc(method, params = {}) {
    audio.ensureContext();
    const payload = {
      jsonrpc: '2.0',
      id: rpcId++,
      method,
      params
    };
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return;
    }
    const res = await fetch('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data?.result?.state) updateUIState(data.result.state);
    if (data?.result?.event) triggerRitualVisuals(data.result.event);
    return data;
  }

  function getFormInput() {
    const user = document.getElementById('inputDevoteeName')?.value.trim() || 'Quỳnh_Finn';
    const wish =
      document.getElementById('inputDevoteeWish')?.value.trim() ||
      'Cầu cho gia đình bình an, tài lộc hanh thông';
    return { user, wish };
  }

  // Gắn sự kiện tương tác trực tiếp trên màn hình 9:16 & Thanh HUD dưới đáy
  document.getElementById('incenseBurnerZone')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.burnIncense', { user, count: 3, wish });
  });

  // 4 Ô Tương Tác / Quy Đổi Coin Dưới Đáy HUD
  document.getElementById('cardFortune')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.drawFortune', { user, topic: wish });
  });

  document.getElementById('cardIncense')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.burnIncense', { user, count: 3, wish });
  });

  document.getElementById('cardBell')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.ringBell', { user, count: 1, wish, readTts: true });
  });

  document.getElementById('cardBlessing')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.sendPrayer', { user, wish });
  });

  document.getElementById('cardLotus')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.offerGift', {
      user,
      giftType: 'lotus',
      coins: 20,
      giftName: 'Đài Hoa Sen Vàng',
      wish
    });
  });

  document.getElementById('woodenFishStation')?.addEventListener('click', () => {
    const { user } = getFormInput();
    callRpc('temple.strikeWoodenFish', { user, count: 1 });
  });

  document.getElementById('bellStation')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.ringBell', { user, count: 1, wish, readTts: true });
  });

  document.getElementById('fortuneCylinder')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.drawFortune', { user, topic: wish });
  });

  // Các nút trên Quick RPC Dock bên phải
  document.getElementById('btnRpcIncense')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.burnIncense', { user, count: 3, wish });
  });

  document.getElementById('btnRpcLantern')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.sendPrayer', { user, wish });
  });

  document.getElementById('btnRpcWoodenFish')?.addEventListener('click', () => {
    const { user } = getFormInput();
    callRpc('temple.strikeWoodenFish', { user, count: 5 });
  });

  document.getElementById('btnRpcBell')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.ringBell', { user, count: 1, wish, readTts: true });
  });

  document.getElementById('btnRpcFortune')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.drawFortune', { user, topic: wish });
  });

  document.getElementById('btnRpcGiftLotus')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.offerGift', {
      user,
      giftType: 'lotus',
      coins: 20,
      giftName: 'Đài Hoa Sen Vàng',
      wish
    });
  });

  document.getElementById('btnRpcGrandCeremony')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('temple.grandCeremony', {
      user,
      coins: 299,
      giftName: 'Đại Lễ Kim Long Chầu Phật',
      wish
    });
  });

  document.getElementById('btnConnectTikTok')?.addEventListener('click', () => {
    const username = document.getElementById('inputTikTokUser')?.value.trim();
    if (!username) return;
    callRpc('live.connect', { username });
  });

  let autoSimState = false;
  document.getElementById('btnToggleAutoSim')?.addEventListener('click', () => {
    autoSimState = !autoSimState;
    callRpc('live.setAutoSim', { enabled: autoSimState });
  });

  document.getElementById('btnToggleTts')?.addEventListener('click', (e) => {
    audio.ttsEnabled = !audio.ttsEnabled;
    const btn = e.currentTarget;
    btn.textContent = `🎙️ Giọng Đọc: ${audio.ttsEnabled ? 'BẬT' : 'TẮT'}`;
    btn.classList.toggle('active-toggle', audio.ttsEnabled);
  });

  document.getElementById('btnToggleMusic')?.addEventListener('click', (e) => {
    audio.bgMusicEnabled = !audio.bgMusicEnabled;
    if (audio.bgMusicEnabled) {
      audio.startZenAmbience();
    } else {
      audio.stopZenAmbience();
    }
    const btn = e.currentTarget;
    btn.textContent = `🎵 Nhạc Nền: ${audio.bgMusicEnabled ? 'BẬT' : 'TẮT'}`;
    btn.classList.toggle('active-toggle', audio.bgMusicEnabled);
  });

  // Khởi tạo và gắn sự kiện thanh trượt chỉnh âm lượng Nhạc nền & Giọng đọc
  const sliderMusicVol = document.getElementById('sliderMusicVol');
  const valMusicVol = document.getElementById('valMusicVol');
  if (sliderMusicVol && valMusicVol) {
    const initMusPct = Math.round(audio.bgBaseVolume * 100);
    sliderMusicVol.value = String(initMusPct);
    valMusicVol.textContent = `${initMusPct}%`;
    sliderMusicVol.addEventListener('input', (e) => {
      const pct = Number(e.target.value);
      valMusicVol.textContent = `${pct}%`;
      audio.ensureContext();
      audio.setMusicVolume(pct / 100);
    });
    sliderMusicVol.addEventListener('change', (e) => {
      const pct = Number(e.target.value);
      callRpc('temple.updateSettings', { musicVolume: +(pct / 100).toFixed(2) });
    });
  }

  const sliderTtsVol = document.getElementById('sliderTtsVol');
  const valTtsVol = document.getElementById('valTtsVol');
  if (sliderTtsVol && valTtsVol) {
    const initTtsPct = Math.round(audio.ttsVolume * 100);
    sliderTtsVol.value = String(initTtsPct);
    valTtsVol.textContent = `${initTtsPct}%`;
    sliderTtsVol.addEventListener('input', (e) => {
      const pct = Number(e.target.value);
      valTtsVol.textContent = `${pct}%`;
      audio.setTtsVolume(pct / 100);
    });
    sliderTtsVol.addEventListener('change', (e) => {
      const pct = Number(e.target.value);
      callRpc('temple.updateSettings', { ttsVolume: +(pct / 100).toFixed(2) });
    });
  }

  document.getElementById('btnRpcAdminNotice')?.addEventListener('click', () => {
    const title = document.getElementById('inputNoticeTitle')?.value.trim() || 'LỜI CHÚC TỪ THẦY TRỤ TRÌ';
    const message = document.getElementById('inputNoticeBody')?.value.trim();
    if (!message) return;
    callRpc('temple.adminNotice', { title, message, priority: 'normal', readTts: true });
  });

  function shortenName(name, maxLen = 13) {
    const str = String(name || '');
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
