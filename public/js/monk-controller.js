/**
 * MonkController & NotificationQueue — Hệ thống Thầy Trụ Trì Chùa Linh Ứng (Phiên bản Chiều Sâu 2.5D)
 * 
 * Tính năng chuẩn mực:
 * - Thầy ở khu vực Chánh Điện phía trong (y: 880px, scale: 0.70) tạo cảm giác chiều sâu 2.5D chân thực
 * - Thầy từ tốn đi qua đi lại (kinh hành niệm Phật) ở hai bên tả hữu chánh điện (x: 330 -> 750px)
 * - KHI CÓ NGƯỜI LÊN DÂNG HƯƠNG / CÚNG QUÀ: Thầy tự động ĐỨNG LẠI DẠT ĐƯỜNG sang một bên, chắp tay xá chào nhường trọn lối đi chính giữa
 * - KHI CÓ THÔNG BÁO: Thầy đứng lại, thẻ thông báo hoàng kim mở ra NGAY PHÍA TRÊN ĐẦU (neo ở y=690px, mở rộng lên trên, KHÔNG BAO GIỜ CHE THẦY)
 * - Tự động ghi nhớ thí chủ vừa cúng dường / tặng quà gần nhất để gửi lời tri ân công đức đích danh trong lời chúc an lạc định kỳ
 */
(function (global) {
  'use strict';

  const MONK_SPRITES = {
    stand: '/assets/monk_stand.png',
    walk1: '/assets/monk_walk_1.png',
    walk2: '/assets/monk_walk_2.png',
    bow: '/assets/monk_bow.png'
  };

  // Vị trí Trụ Trì trên sàn gỗ Chánh Điện PHÍA TRONG (y: 1140px, scale: 0.72)
  // Đi phía trong, sâu hơn hàng Phật tử lạy (y=1185) để tạo chiều sâu 2.5D chân thực
  const MONK_DEPTH_CONFIG = {
    y: 1200, // Đi trên mặt sàn gỗ Chánh Điện nhưng đi phía trong (y=1200px vững chãi trên sàn gỗ)
    scale: 0.70,
    minX: 240,
    maxX: 840,
    walkSpeed: 38 // pixel mỗi giây
  };

  const PERIODIC_BLESSINGS = [
    {
      title: 'TÂM AN VẠN SỰ AN',
      message: 'Tâm an thì vạn sự an. Khi lòng mình tĩnh lặng, mọi giông bão ngoài kia tự khắc dừng lại. Thầy kính chúc quý vị luôn an nhiên tự tại, cuộc sống nhẹ nhàng thảnh thơi.'
    },
    {
      title: 'BUÔNG BỎ PHIỀN MUỘN',
      message: 'Chuyện đã qua hãy để gió cuốn đi, việc chưa tới chớ vội nhọc lòng. Thầy chúc quý vị biết buông bỏ những ưu tư, mỗi ngày sống trọn vẹn trong niềm hỷ lạc bình an.'
    },
    {
      title: 'TÂM THIỆN PHƯỚC DÀY',
      message: 'Tâm thiện lành chính là phong thủy tốt nhất của đời người. Người mang lòng hướng thiện đi đâu cũng có quý nhân che chở, việc gì cũng đơm hoa kết trái cát tường.'
    },
    {
      title: 'SỨC KHỎE KHANG KIỆN',
      message: 'Thân thể an khang là phước báu vô giá. Nguyện hồng ân Tam Bảo gia hộ cho quý thiện nam tín nữ thân tâm tráng kiện, bệnh tật tiêu trừ, tinh thần luôn minh mẫn an vui.'
    },
    {
      title: 'GIA ĐẠO BÌNH AN',
      message: 'Nhà là nơi bão dừng sau cánh cửa. Kính chúc gia đình quý vị luôn trong ấm ngoài êm, trên thuận dưới hòa, con cháu thảo hiền, phúc lộc vững bền theo năm tháng.'
    },
    {
      title: 'CÔNG VIỆC & TÀI LỘC',
      message: 'Cầu chúc cho công việc của quý vị luôn thuận buồm xuôi gió, gặp người tốt nâng đỡ, tài lộc hanh thông, mưu cầu việc gì cũng xuôi chèo mát mái như ý.'
    },
    {
      title: 'GIẤC NGỦ AN LÀNH',
      message: 'Sau một ngày dài bận rộn giữa dòng đời mưu sinh, hãy gác lại mọi âu lo ngoài cánh cửa. Chúc quý đạo hữu tối nay ngủ một giấc thật sâu, thân tâm thư thái nhẹ nhàng.'
    },
    {
      title: 'BÁO HIẾU SINH THÀNH',
      message: 'Ân đức cha mẹ tựa biển trời mênh mông. Thầy cầu xin mười phương chư Phật gia hộ cho các bậc song thân luôn mạnh khỏe, bình an, trường thọ, sống đời vui vầy cùng con cháu.'
    },
    {
      title: 'CHỮA LÀNH TÂM HỒN',
      message: 'Hít vào tâm tĩnh lặng, thở ra miệng mỉm cười. Nơi cửa Phật thanh tịnh, chúc tâm hồn quý vị luôn nhẹ nhàng, xua tan áp lực muộn phiền, đón trọn năng lượng thiện lành.'
    },
    {
      title: 'VƯỢT QUA KHÓ KHĂN',
      message: 'Khó khăn nào rồi cũng sẽ qua, sau cơn mưa trời lại sáng. Hãy kiên tâm và giữ vững niềm tin, quý nhân và duyên lành sẽ đưa đường chỉ lối cho quý vị vượt qua mọi thử thách.'
    },
    {
      title: 'LÒNG BAO DUNG TỰ TẠI',
      message: 'Bớt một phần giận là thêm một phần an, tha thứ cho người là cởi trói cho chính mình. Chúc quý vị luôn giữ nụ cười trên môi, mở rộng lòng thương để cuộc đời rạng rỡ.'
    },
    {
      title: 'TRÍ TUỆ SÁNG SUỐT',
      message: 'Trí tuệ là ngọn đèn soi sáng màn đêm. Thầy chúc quý vị tâm trí luôn sáng suốt, học sâu hiểu rộng, tư duy minh mẫn, đưa ra những quyết định đúng đắn và thành công.'
    },
    {
      title: 'DUYÊN LÀNH HỘI TỤ',
      message: 'Vạn sự trên đời đều do duyên khởi. Cầu chúc cho quý vị luôn gặp được những người chân thành, đồng lòng sẻ chia buồn vui, cùng nhau xây đắp tương lai bình yên hạnh phúc.'
    },
    {
      title: 'BIẾT ƠN & HẠNH PHÚC',
      message: 'Biết ơn những gì mình đang có chính là cội nguồn của hạnh phúc. Chúc quý vị luôn tìm thấy niềm vui từ những điều bình dị, mỗi sớm mai thức dậy đều thấy lòng an vui.'
    },
    {
      title: 'Ý CHÍ VƯƠN LÊN',
      message: 'Mỗi thử thách là một bài học giúp ta trưởng thành hơn. Thầy chúc quý vị luôn kiên định, tự tin vững bước trên con đường mình đã chọn, gặt hái thành quả tốt đẹp.'
    },
    {
      title: 'TAI QUA NẠN KHỎI',
      message: 'Nguyện cầu ánh từ quang mười phương chư Phật che chở cho toàn thể đạo tràng tai ách hóa cát tường, dữ hóa lành, đi lại bình an, vạn sự thuận hòa suôn sẻ.'
    },
    {
      title: 'TÂM AN PHÚC LỘC ĐẦY',
      message: 'Khi tâm thanh tịnh, phúc khí tự khắc tìm về. Thầy kính chúc quý vị bốn mùa tài lộc tấn tới, công việc phát đạt, gia đạo luôn đong đầy niềm vui và tiếng cười.'
    },
    {
      title: 'VẠN SỰ VIÊN THÀNH',
      message: 'Nam Mô A Di Đà Phật. Thầy kính chúc toàn thể đạo tràng một phiên Live tràn đầy hỷ lạc, vạn sự hanh thông, sở cầu như ý, sở nguyện tòng tâm, phước báu vô lượng.'
    }
  ];

  // Các mẫu lời tri ân đa dạng khi có thí chủ vừa tặng quà cúng dường
  const DONOR_THANKS_TEMPLATES = [
    (donor) => `Công đức vô lượng! Tri ân tấm lòng thơm thảo của ${donor} đã phát tâm cúng dường Tam Bảo. Thầy kính chúc thí chủ thân tâm an lạc, tài lộc hanh thông, vạn sự như ý!`,
    (donor) => `Lành thay tâm thiện của ${donor}! Nguyện hồng ân Tam Bảo che chở cho thí chủ tâm an trí sáng, gia đạo thuận hòa, sự nghiệp thăng hoa, phúc lộc dồi dào!`,
    (donor) => `Cảm tạ ${donor} đã gieo duyên lành nơi Chùa Online. Kính chúc thí chủ quý nhân phù trợ, tai qua nạn khỏi, mưu cầu việc gì cũng viên thành cát tường!`,
    (donor) => `Nam Mô Hoan Hỷ Tạng Bồ Tát. Tri ân thiện niệm của ${donor}. Thầy chúc thí chủ bốn mùa an khang, cuộc sống luôn nhẹ nhàng thanh thản, ngập tràn niềm vui!`,
    (donor) => `Một phần phát tâm, muôn phần phước báu! Cầu chúc cho ${donor} cùng gia quyến luôn mạnh khỏe bình an, phúc đức sâu dày, vinh hoa thịnh vượng!`,
    (donor) => `Lòng thành hướng Phật, phước đức trường tồn. Kính chúc ${donor} sở cầu như ý, sở nguyện tòng tâm, mọi sự mưu cầu đều đơm hoa kết trái viên mãn!`
  ];

  class NotificationQueue {
    constructor(options = {}) {
      this.queue = [];
      this.isProcessing = false;
      this.currentNotice = null;
      this.maxQueueSize = 10;
      this.recentHashes = new Map();
      this.onDisplay = options.onDisplay || null;
      this.onDismiss = options.onDismiss || null;
    }

    enqueue(notice) {
      if (!notice || !notice.message) return;
      const hash = `${notice.title || ''}::${notice.message}`;
      const now = Date.now();

      if (this.recentHashes.has(hash) && now - this.recentHashes.get(hash) < 6000) {
        return;
      }
      this.recentHashes.set(hash, now);

      const priorityVal = notice.priority === 'urgent' ? 0 : notice.priority === 'high' ? 1 : 2;
      const item = { ...notice, priorityVal, queuedAt: now };

      let insertIdx = this.queue.length;
      for (let i = 0; i < this.queue.length; i++) {
        if (item.priorityVal < this.queue[i].priorityVal) {
          insertIdx = i;
          break;
        }
      }
      this.queue.splice(insertIdx, 0, item);

      if (this.queue.length > this.maxQueueSize) {
        this.queue.pop();
      }

      if (!this.isProcessing) {
        this.processNext();
      }
    }

    processNext() {
      if (this.queue.length === 0) {
        this.isProcessing = false;
        this.currentNotice = null;
        if (this.onDismiss) this.onDismiss();
        return;
      }

      this.isProcessing = true;
      const notice = this.queue.shift();
      this.currentNotice = notice;

      if (this.onDisplay) {
        this.onDisplay(notice, () => {
          this.processNext();
        });
      }
    }
  }

  class MonkController {
    constructor(container, options = {}) {
      this.container = container;
      this.audio = options.audio || (typeof window !== 'undefined' ? window.templeAudio : null);
      this.element = null;
      this.spriteImg = null;
      this.speechBubble = null;

      this.currentX = 400; // Khởi đầu bên mép trái chánh điện
      this.currentY = MONK_DEPTH_CONFIG.y;
      this.currentScale = MONK_DEPTH_CONFIG.scale;
      this.direction = 1; // 1: đi sang phải, -1: đi sang trái

      this.state = 'PATROLLING'; // PATROLLING, PAUSED, YIELDING (dạt đường), ANNOUNCING
      this.activeTimers = [];
      this.walkInterval = null;
      this.blessingTimer = null;
      this.lastRecentDonor = null;

      this.queue = new NotificationQueue({
        onDisplay: (notice, done) => this.handleNoticeDisplay(notice, done),
        onDismiss: () => this.handleNoticeDismiss()
      });

      this.initDom();
      this.startPatrolLoop();
      this.scheduleNextBlessing(50000);
    }

    initDom() {
      // 1. Thẻ Nhân vật Trụ Trì (Tuyệt đối KHÔNG có bảng tên "Sư Trụ Trì" gây rối mắt)
      const el = document.createElement('div');
      el.className = 'abbot-monk-node';
      el.id = 'abbotMonkNode';
      el.style.left = `${this.currentX}px`;
      el.style.top = `${this.currentY}px`;
      el.style.transform = `translate(-50%, -100%) scale(${this.currentScale})`;
      el.style.zIndex = 10; // Phía trong chánh điện, dưới đài dâng hương trung tâm (z-index 20)

      const img = document.createElement('img');
      img.src = MONK_SPRITES.stand;
      img.alt = 'Trụ Trì';
      img.className = 'monk-sprite';
      img.style.width = '128px';
      img.style.height = '240px';
      img.onerror = () => {
        if (!img.src.includes('devotee')) {
          img.src = '/assets/devotee_walk.png';
        }
      };
      el.appendChild(img);
      this.spriteImg = img;
      this.element = el;

      // 2. Thẻ Thông Báo Hoàng Kim Độc Lập Nổi Trên Đầu Thầy (Neo đáy ở y=960, không bao giờ che Thầy)
      const bubble = document.createElement('div');
      bubble.className = 'abbot-standalone-card';
      bubble.id = 'abbotStandaloneCard';
      bubble.style.left = `${this.currentX}px`;
      bubble.style.top = '960px';
      bubble.innerHTML = `
        <div class="abbot-card-inner">
          <div class="abbot-card-header">
            <span class="abbot-card-badge">🪷 LỜI DẠY CỦA THẦY TRỤ TRÌ</span>
            <h3 class="abbot-card-title" id="abbotNoticeTitle">THÔNG BÁO</h3>
          </div>
          <div class="abbot-card-divider"></div>
          <div class="abbot-card-body" id="abbotNoticeBody">
            Nam Mô A Di Đà Phật.
          </div>
        </div>
      `;

      if (this.container) {
        this.container.appendChild(el);
        this.container.appendChild(bubble);
      }
      this.speechBubble = bubble;
    }

    setPose(poseKey) {
      if (!this.spriteImg) return;
      const url = MONK_SPRITES[poseKey] || MONK_SPRITES.stand;
      this.spriteImg.src = url;
    }

    updateTransform() {
      if (!this.element) return;
      this.element.style.left = Math.round(this.currentX) + "px";
      this.element.style.top = this.currentY + "px";
      this.element.style.transform = "translate(-50%, -100%) scale(" + this.currentScale + ")";
      if (this.spriteImg) {
        const flipX = this.direction > 0 ? 1 : -1;
        this.spriteImg.style.transform = "scaleX(" + flipX + ")";
      }
    }

    clearTimers() {
      while (this.activeTimers.length > 0) {
        clearTimeout(this.activeTimers.pop());
      }
    }

    recordDonor(name) {
      if (name && name !== 'Thí Chủ Hữu Duyên' && name !== 'Thí Chủ Minh Tâm') {
        this.lastRecentDonor = name;
      }
    }

    /**
     * Vòng lặp Thầy từ tốn đi qua đi lại trong Chánh Điện
     */
    startPatrolLoop() {
      if (this.walkInterval) clearInterval(this.walkInterval);

      let stepToggle = false;
      const stepIntervalMs = 320;
      const pixelsPerStep = (MONK_DEPTH_CONFIG.walkSpeed * (stepIntervalMs / 1000));

      this.walkInterval = setInterval(() => {
        if (this.state !== 'PATROLLING') return;

        this.currentX += this.direction * pixelsPerStep;
        stepToggle = !stepToggle;
        this.setPose(stepToggle ? 'walk1' : 'walk2');
        this.updateTransform();

        // Chạm biên phải -> dừng lại tĩnh tâm 4s rồi quay sang trái
        if (this.currentX >= MONK_DEPTH_CONFIG.maxX) {
          this.currentX = MONK_DEPTH_CONFIG.maxX;
          this.pauseAndTurn(-1);
        }
        // Chạm biên trái -> dừng lại tĩnh tâm 4s rồi quay sang phải
        else if (this.currentX <= MONK_DEPTH_CONFIG.minX) {
          this.currentX = MONK_DEPTH_CONFIG.minX;
          this.pauseAndTurn(1);
        }
      }, stepIntervalMs);
    }

    pauseAndTurn(newDirection) {
      this.state = 'PAUSED';
      this.setPose('stand');
      this.updateTransform();

      // Thỉnh thoảng xá chào nhẹ nhàng khi đứng yên
      if (Math.random() < 0.5) {
        setTimeout(() => {
          if (this.state === 'PAUSED') this.setPose('bow');
        }, 800);
        setTimeout(() => {
          if (this.state === 'PAUSED') this.setPose('stand');
        }, 2200);
      }

      this.activeTimers.push(
        setTimeout(() => {
          if (this.state === 'PAUSED') {
            this.direction = newDirection;
            this.state = 'PATROLLING';
            this.updateTransform();
          }
        }, 4200)
      );
    }

    /**
     * Khi có Phật tử lên dâng hương / cúng dường:
     * THẦY ĐỨNG LẠI DẠT ĐƯỜNG SANG MỘT BÊN, CHẮP TAY XÁ CHÀO NHƯỜNG LỐI
     */
    yieldWay() {
      if (this.state === 'ANNOUNCING') return;
      this.state = 'YIELDING';
      this.clearTimers();

      // DẠT SANG TẢ HOẶC HỮU CHÁNH ĐIỆN (x: 240px hoặc 840px)
      // Vẫn đứng trên thềm gỗ Chánh Điện trang nghiêm, hướng vào trung tâm niệm Phật chúc phúc
      const targetSideX = this.currentX < 540 ? 240 : 840;
      this.direction = this.currentX < 540 ? 1 : -1; // Quay mặt hướng vào giữa điện
      this.currentX = targetSideX;
      this.currentY = MONK_DEPTH_CONFIG.y;
      this.updateTransform();

      // Thầy đứng chắp tay cung kính hướng về đạo tràng
      this.setPose('bow');
      this.activeTimers.push(
        setTimeout(() => {
          if (this.state === 'YIELDING') {
            this.setPose('stand');
          }
        }, 1800),
        // Sau 8 giây tĩnh tâm niệm Phật chúc phúc, nếu không có ai chiếm lối thì Thầy tiếp tục bách bộ
        setTimeout(() => {
          if (this.state === 'YIELDING') {
            this.resumePatrol();
          }
        }, 8000)
      );
    }

    resumePatrol() {
      if (this.state === 'ANNOUNCING') return;
      this.state = 'PAUSED';
      this.setPose('stand');
      this.updateTransform();

      this.activeTimers.push(
        setTimeout(() => {
          if (this.state === 'PAUSED') {
            // Quay mặt hướng vào trong để tiếp tục kinh hành
            this.direction = this.currentX < 540 ? 1 : -1;
            this.state = 'PATROLLING';
            this.updateTransform();
          }
        }, 1500)
      );
    }

    scheduleNextBlessing(delayMs = 55000) {
      if (this.blessingTimer) clearTimeout(this.blessingTimer);
      this.blessingTimer = setTimeout(() => {
        if ((this.state === 'PATROLLING' || this.state === 'PAUSED') && !this.queue.isProcessing) {
          this.triggerPeriodicBlessing();
        } else {
          this.scheduleNextBlessing(25000);
        }
      }, delayMs);
    }

    /**
     * Thầy tự động chúc phúc an lành hoặc cảm tạ người tặng quà gần nhất
     */
    triggerPeriodicBlessing() {
      let title = 'LỜI CHÚC AN LẠC';
      let message = '';

      if (this.lastRecentDonor) {
        title = 'TRI ÂN CÔNG ĐỨC';
        const tpl = DONOR_THANKS_TEMPLATES[Math.floor(Math.random() * DONOR_THANKS_TEMPLATES.length)];
        message = tpl(this.lastRecentDonor);
        this.lastRecentDonor = null;
      } else {
        // Tránh lặp lại câu vừa đọc gần nhất bằng danh sách chỉ mục xáo trộn
        if (!this.blessingIndexPool || this.blessingIndexPool.length === 0) {
          this.blessingIndexPool = Array.from({ length: PERIODIC_BLESSINGS.length }, (_, i) => i);
          // Shuffle mảng
          for (let i = this.blessingIndexPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.blessingIndexPool[i], this.blessingIndexPool[j]] = [this.blessingIndexPool[j], this.blessingIndexPool[i]];
          }
        }
        const pickIdx = this.blessingIndexPool.pop();
        const blessing = PERIODIC_BLESSINGS[pickIdx];
        title = blessing.title;
        message = blessing.message;
      }

      this.receiveNotice({
        title,
        message,
        isBlessing: true,
        readTts: true
      });
    }

    receiveNotice(notice) {
      this.queue.enqueue(notice);
    }

    handleNoticeDisplay(notice, onFinish) {
      this.presentAnnouncement(notice, onFinish);
    }

    /**
     * Quy trình Thầy đứng lại -> Xá chào -> Mở thẻ thông báo trên đầu -> Xong tiếp tục tuần tra
     */
    presentAnnouncement(notice, onFinishedCallback) {
      this.clearTimers();
      this.state = 'ANNOUNCING';

      const title = notice.title || 'THÔNG BÁO TỪ CHÙA LINH ỨNG';
      const message = notice.message || notice.content || '';

      // Tính toán thời gian đọc kỹ lưỡng: 130ms/ký tự + 7s đệm, tối thiểu 16 giây để người xem đọc kịp
      const calculatedDuration = Math.max(16000, Number(notice.duration) || (message.length * 130 + 7000));

      // Khởi động nạp âm thanh ZeroTTS ngay lập tức (0ms) để không bị trễ
      const audioRef = this.audio || window.templeAudio;
      const ttsText = notice.ttsText || (notice.readTts !== false ? message : '');

      let ttsFinished = false;
      let minTimeFinished = false;

      const checkDone = () => {
        if (ttsFinished && minTimeFinished) {
          this.dismissAnnouncement(onFinishedCallback);
        }
      };

      if (audioRef && ttsText && typeof audioRef.enqueueTts === 'function') {
        audioRef.enqueueTts(ttsText, {
          voice: notice.ttsVoice || 'giahuy',
          priority: 0,
          onEnd: () => {
            setTimeout(() => {
              ttsFinished = true;
              checkDone();
            }, 1000);
          }
        });
      } else {
        ttsFinished = true;
      }

      // Thầy đứng lại, quay mặt về phía đại chúng và xá chào
      this.setPose('bow');
      this.updateTransform();

      this.activeTimers.push(
        setTimeout(() => {
          this.setPose('stand');

          // Đặt thẻ thông báo tại y=840px (cao hơn đỉnh đầu Thầy y=967px tới 127px, tuyệt đối không che Thầy)
          if (this.speechBubble) {
            this.speechBubble.style.left = '540px';
            this.speechBubble.style.top = '840px';
          }
          this.showBubble(title, message);


          this.activeTimers.push(
            setTimeout(() => {
              minTimeFinished = true;
              checkDone();
            }, calculatedDuration)
          );
        }, 1200)
      );
    }

    showBubble(title, message) {
      const titleEl = document.getElementById('abbotNoticeTitle');
      const bodyEl = document.getElementById('abbotNoticeBody');
      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.textContent = message;

      if (this.speechBubble) {
        this.speechBubble.classList.add('visible');
      }
    }

    dismissAnnouncement(onDone) {
      if (this.speechBubble) {
        this.speechBubble.classList.remove('visible');
      }

      this.setPose('bow');
      this.activeTimers.push(
        setTimeout(() => {
          this.setPose('stand');
          this.state = 'PAUSED';
          if (onDone) onDone();
          this.scheduleNextBlessing(55000 + Math.floor(Math.random() * 10000));

          // Thầy tiếp tục đi lại niệm Phật
          setTimeout(() => {
            if (this.state === 'PAUSED') {
              this.direction = this.currentX < 540 ? 1 : -1;
              this.state = 'PATROLLING';
              this.updateTransform();
            }
          }, 1500);
        }, 1400)
      );
    }

    handleNoticeDismiss() {
      if (this.state === 'ANNOUNCING') {
        this.dismissAnnouncement();
      }
    }
  }

  global.TempleMonkController = MonkController;
  global.TempleNotificationQueue = NotificationQueue;
})(typeof window !== 'undefined' ? window : global);
