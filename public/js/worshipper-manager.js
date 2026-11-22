/**
 * WorshipperManager & Controller — Quản lý vòng đời và hoạt ảnh Phật tử dưới Sân Lễ & Trên Thềm Gỗ
 * 
 * Tính năng chuẩn mực:
 * - 7 VỊ TRÍ HÀNH LỄ TRÃI ĐỀU TRÊN BẬC THỀM GỖ (x: 180px -> 900px, y: 1180px)
 * - Tối đa 7 Phật tử cùng quỳ lạy dâng hương trên thềm gỗ cùng một thời điểm
 * - Người xem lên tuần tự theo hàng đợi, không cần lên 1 lượt cả 7 người
 * - Khi đi lên: quay mặt hướng lên bàn thờ (áo lam nhìn từ sau, bước đi tôn nghiêm)
 * - Khi quỳ lạy: thực hiện đầy đủ 8 khung hình Đảnh lễ Tam Bái trên thềm gỗ
 * - Khi lạy xong: đứng lên, QUAY MẶT RA PHÍA TRƯỚC (áo lam nhìn từ trước, chắp tay niệm Phật) đi xuôi thảm đỏ về ghế
 * - Về tới ghế: quay mặt hướng về bàn thờ và ngồi quỳ xuống đệm
 * - Tự động giải phóng vị trí trên thềm cho người tiếp theo trong hàng đợi
 */
(function (global) {
  'use strict';

  const SPRITE_FRAMES = {
    walk1: '/assets/devotee_walk.png',
    walk2: '/assets/devotee_walk_2.png',
    walkFront1: '/assets/devotee_walk_front.png',
    walkFront2: '/assets/devotee_walk_front_2.png',
    kneelDown: '/assets/devotee_kneel_down.png',
    kneel: '/assets/devotee.png',
    forehead: '/assets/devotee_bow.png',
    bowMid: '/assets/devotee_bow_mid.png',
    prostrate: '/assets/devotee_prostrate.png',
    prostrateDeep: '/assets/devotee_prostrate_deep.png'
  };

  // Preload toàn bộ các frame vào bộ nhớ trình duyệt
  Object.values(SPRITE_FRAMES).forEach((url) => {
    const img = new Image();
    img.src = url;
  });

  // 7 Vị trí dàn đều chuẩn xác trên mặt sàn gỗ thềm Chánh Điện (y = 1228px, scale = 0.78)
  // Đặt chân/gối ngay giữa sàn gỗ gụ, vững chãi, không bị đẩy lên vách rồng và không lọt ra khỏi thềm
  const DAIS_SLOTS = [
    { id: 0, x: 140, y: 1228, scale: 0.78 },
    { id: 1, x: 270, y: 1228, scale: 0.78 },
    { id: 2, x: 400, y: 1228, scale: 0.78 },
    { id: 3, x: 540, y: 1228, scale: 0.78 }, // Trung tâm thềm gỗ Chánh Điện
    { id: 4, x: 680, y: 1228, scale: 0.78 },
    { id: 5, x: 810, y: 1228, scale: 0.78 },
    { id: 6, x: 940, y: 1228, scale: 0.78 }
  ];
  // Ưu tiên gán slot: Trung tâm -> Tả Hữu đối xứng dần ra ngoài
  const DAIS_PRIORITY = [3, 2, 4, 1, 5, 0, 6];

  class WorshipperController {
    constructor(viewer, seat, manager) {
      this.viewer = { ...viewer };
      this.seat = seat;
      this.manager = manager;
      this.element = null;
      this.spriteImg = null;
      this.badgeEl = null;
      this.wishBubbleEl = null;

      this.currentX = seat.x;
      this.currentY = seat.y;
      this.currentScale = seat.scale;
      this.currentPose = 'kneel';
      this.isFlipped = false;
      this.daisSlot = null;

      this.state = 'IDLE'; // IDLE, QUEUED, WALKING_TO_DAIS, PRAYING, RETURNING, LEAVING
      this.actionQueue = [];
      this.activeTimers = [];
      this.walkInterval = null;

      this.createElement();
    }

    createElement() {
      const el = document.createElement('div');
      el.className = 'worshipper-avatar-node';
      el.id = `worshipper_${this.viewer.uniqueId || this.viewer.name}`;
      el.style.left = `${this.currentX}px`;
      el.style.top = `${this.currentY}px`;
      el.style.zIndex = this.seat.zIndex;
      el.style.transform = `translate(-50%, -100%) scale(${this.currentScale})`;

      const wishBubble = document.createElement('div');
      wishBubble.className = 'worshipper-wish-mini-bubble';
      wishBubble.textContent = '';
      wishBubble.style.display = 'none'; // Luôn ẩn mặc định để không che kín nhân vật! Chỉ hiện khi có chat/hành lễ
      el.appendChild(wishBubble);
      this.wishBubbleEl = wishBubble;

      // THẺ TÊN CÓ AVATAR ĐẶT TRÊN ĐẦU NHÂN VẬT (không bao giờ bị che khuất bởi hàng ghế phía trước)
      const badge = document.createElement('div');
      badge.className = 'seat-badge';
      const initial = String(this.viewer.name || 'P').trim().charAt(0).toUpperCase();
      badge.innerHTML = `
        <span class="seat-avatar">${
          this.viewer.avatar
            ? `<img src="${this.escapeHtml(this.viewer.avatar)}" alt="" />`
            : initial
        }</span>
        <span class="seat-username">${this.escapeHtml(this.shortenName(this.viewer.name, 18))}</span>
      `;
      el.appendChild(badge);
      this.badgeEl = badge;

      // HÌNH ẢNH NHÂN VẬT PHẬT TỬ (chân đế tiếp xúc mặt sàn tại toạ độ y)
      const img = document.createElement('img');
      img.src = SPRITE_FRAMES.kneel;
      img.alt = this.viewer.name || 'Phật tử';
      img.className = 'devotee-sprite';
      img.onerror = () => {
        if (!img.src.includes('devotee.png')) {
          img.src = SPRITE_FRAMES.kneel;
        }
      };
      el.appendChild(img);
      this.spriteImg = img;

      this.element = el;
      if (this.manager.container) {
        this.manager.container.appendChild(el);
      }
    }

    setPose(poseKey) {
      if (!this.spriteImg || !SPRITE_FRAMES[poseKey]) return;
      this.currentPose = poseKey;
      this.spriteImg.src = SPRITE_FRAMES[poseKey];
    }

    setPosition(x, y, scale = this.currentScale, zIndex = this.seat.zIndex, flip = false) {
      this.currentX = x;
      this.currentY = y;
      this.currentScale = scale;
      this.isFlipped = flip;
      if (this.element) {
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.style.zIndex = zIndex;
        this.element.style.transform = `translate(-50%, -100%) scale(${scale})`;
      }
      if (this.spriteImg) {
        const flipX = flip ? -1 : 1;
        this.spriteImg.style.transform = `scaleX(${flipX})`;
      }
    }

    showWish(text) {
      if (!this.wishBubbleEl || !text) return;
      this.wishBubbleEl.textContent = `“${text}”`;
      this.wishBubbleEl.style.display = 'block';
      this.wishBubbleEl.classList.remove('fade');
      void this.wishBubbleEl.offsetWidth;
      this.wishBubbleEl.classList.add('fade');
      if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
      this.bubbleTimer = setTimeout(() => {
        if (this.wishBubbleEl) {
          this.wishBubbleEl.style.display = 'none';
          this.wishBubbleEl.classList.remove('fade');
        }
      }, 5500);
    }

    /**
     * Hiển thị bình luận trò chuyện nhẹ nhàng mà KHÔNG bắt quỳ lạy hay di chuyển
     */
    showChatBubble(text) {
      if (!this.wishBubbleEl || !text) return;
      // Thu ngắn nội dung bong bóng chat tối đa 40 ký tự để không choán màn hình
      const shortText = text.length > 40 ? text.slice(0, 39) + '…' : text;
      this.wishBubbleEl.textContent = `“${shortText}”`;
      this.wishBubbleEl.style.display = 'block';
      this.wishBubbleEl.classList.remove('fade');
      void this.wishBubbleEl.offsetWidth;
      this.wishBubbleEl.classList.add('fade');
      if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
      this.bubbleTimer = setTimeout(() => {
        if (this.wishBubbleEl) {
          this.wishBubbleEl.style.display = 'none';
          this.wishBubbleEl.classList.remove('fade');
        }
        if (this.manager && this.manager.activeBubbles) {
          this.manager.activeBubbles.delete(this);
        }
      }, 2800);

      if (this.manager) {
        if (!this.manager.activeBubbles) this.manager.activeBubbles = new Set();
        this.manager.activeBubbles.add(this);
      }

      // Khẽ chắp tay niệm Phật tại chỗ ngồi rồi hạ tay xuống
      if (this.state === 'IDLE') {
        this.setPose('forehead');
        this.activeTimers.push(
          setTimeout(() => {
            if (this.state === 'IDLE') this.setPose('kneel');
          }, 1000)
        );
      }
    }

    clearTimers() {
      while (this.activeTimers.length > 0) {
        clearTimeout(this.activeTimers.pop());
      }
      if (this.walkInterval) {
        clearInterval(this.walkInterval);
        this.walkInterval = null;
      }
    }

    receiveInteraction(event) {
      if (event && event.wish) {
        this.showWish(event.wish);
      }
      this.setPose('bowMid');
      this.activeTimers.push(
        setTimeout(() => {
          this.setPose('kneel');
        }, 2200)
      );
    }

    /**
     * BƯỚC 1: ĐỨNG LÊN TỪ GHẾ VÀ ĐI LÊN BẬC THỀM GỖ
     * Hướng mặt lên bàn thờ (áo lam nhìn từ sau)
     */
    startPilgrimage(slot, action, onFinishedCallback) {
      this.daisSlot = slot;
      this.state = 'WALKING_TO_DAIS';
      this.clearTimers();

      const isLeftSide = this.seat.side === 'L';
      const aisleX = isLeftSide ? 490 : 590;
      const startX = this.seat.x;
      const startY = this.seat.y;
      const startScale = this.seat.scale;

      // Khi bước ra thảm đỏ: bên trái quay sang phải (flip=true), bên phải quay sang trái (flip=false)
      const toAisleFlip = isLeftSide;

      // Đặt ngay dáng bước đi hướng lên bàn thờ
      this.setPose('walk1');

      const waypoints = [
        { x: startX, y: startY, scale: startScale, flip: toAisleFlip, facing: 'up' },
        // 1. Khoan thai bước ra thảm đỏ: 1200ms
        { x: aisleX, y: startY, scale: startScale, duration: 1200, flip: toAisleFlip, facing: 'up' },
        // 2. Chậm rãi bước dọc thảm đỏ tiến lên trước bậc thềm: 3200ms
        { x: slot.x, y: 1265, scale: 0.82, duration: 3200, flip: false, facing: 'up' },
        // 3. Bước trang nghiêm lên bậc thềm gỗ Chánh Điện: 1100ms
        { x: slot.x, y: slot.y, scale: slot.scale, duration: 1100, flip: false, facing: 'up' }
      ];

      this.executePath(waypoints, () => {
        this.performProstrationRitual(slot, action, onFinishedCallback);
      });
    }

    /**
     * BƯỚC 2: QUỲ LẠY TRANG NGHIÊM TRÊN BẬC THỀM GỖ (ĐẢNH LỄ TAM BÁI 8 FRAME - ĐỦ ĐỘ LÂU VÀ TÔN KÍNH)
     */
    performProstrationRitual(slot, action, onFinishedCallback) {
      this.state = 'PRAYING';
      this.setPosition(slot.x, slot.y, slot.scale, 35 + slot.id, false);
      this.setPose('kneelDown');

      if (action && action.wish) {
        this.showWish(action.wish);
      }

      this.activeTimers.push(
        setTimeout(() => {
          this.setPose('kneel');
        }, 300)
      );

      // Chuỗi 3 lạy trang nghiêm, khoan thai trên thềm gỗ (mỗi lạy khoảng 2.8s)
      const bowStarts = [600, 3600, 6600];
      bowStarts.forEach((t0) => {
        this.activeTimers.push(
          setTimeout(() => this.setPose('forehead'), t0),
          setTimeout(() => this.setPose('bowMid'), t0 + 350),
          setTimeout(() => this.setPose('prostrate'), t0 + 750),
          setTimeout(() => this.setPose('prostrateDeep'), t0 + 1150),
          setTimeout(() => this.setPose('prostrate'), t0 + 1900),
          setTimeout(() => this.setPose('bowMid'), t0 + 2300),
          setTimeout(() => this.setPose('kneel'), t0 + 2700)
        );
      });

      // Lạy xong: Sau 9.8s thành tâm, đứng lên, QUAY MẶT RA PHÍA TRƯỚC và đi về lại chỗ ngồi
      this.activeTimers.push(
        setTimeout(() => {
          this.returnToSeat(slot, onFinishedCallback);
        }, 9800)
      );
    }

    /**
     * BƯỚC 3: QUAY MẶT RA PHÍA TRƯỚC VÀ ĐI XUÔI THẢM ĐỎ VỀ GHẾ
     * Lưu ý: QUAY MẶT LẠI (áo lam nhìn từ trước, chắp tay niệm Phật, bước đi khoan thai)
     */
    returnToSeat(slot, onFinishedCallback) {
      this.state = 'RETURNING';
      this.clearTimers();

      // ĐỨNG LÊN VÀ QUAY MẶT RA PHÍA TRƯỚC NGAY LẬP TỨC:
      this.setPose('walkFront1');
      if (this.spriteImg) {
        this.spriteImg.style.transform = 'scaleX(1)';
      }

      const isLeftSide = this.seat.side === 'L';
      const aisleX = isLeftSide ? 490 : 590;
      const targetX = this.seat.x;
      const targetY = this.seat.y;
      const targetScale = this.seat.scale;

      // QUAY MẶT RA PHÍA TRƯỚC (facing: 'down', flip: false khi đi dọc thảm):
      // Khi rẽ vào ghế: bên trái xoay trái (flip=false), bên phải xoay phải (flip=true)
      const turnIntoSeatFlip = !isLeftSide;

      const returnWaypoints = [
        { x: slot.x, y: slot.y, scale: slot.scale, flip: false, facing: 'down' },
        // 1. Khoan thai bước từ thềm gỗ xuống thảm đỏ (quay mặt ra trước): 1200ms
        { x: slot.x, y: 1265, scale: 0.82, duration: 1200, flip: false, facing: 'down' },
        // 2. Chắp tay niệm Phật đi xuôi theo thảm đỏ xuống ngang hàng ghế của mình: 3400ms
        { x: aisleX, y: targetY, scale: targetScale, duration: 3400, flip: false, facing: 'down' },
        // 3. Rẽ vào vị trí đệm ngồi của mình: 1200ms
        { x: targetX, y: targetY, scale: targetScale, duration: 1200, flip: turnIntoSeatFlip, facing: 'down' }
      ];

      // Giải phóng slot thềm gỗ CHỈ SAU KHI thí chủ đã bước hẳn xuống thảm đỏ xa bậc thềm (3800ms)
      this.activeTimers.push(
        setTimeout(() => {
          if (slot && this.manager) {
            this.manager.releaseDaisSlot(slot.id, this);
          }
        }, 3800)
      );

      this.executePath(returnWaypoints, () => {
        // Về tới ghế: Quay mặt hướng lên bàn thờ (flip=false), hạ gối quỳ xuống
        this.setPosition(targetX, targetY, targetScale, this.seat.zIndex, false);
        this.setPose('kneelDown');

        this.activeTimers.push(
          setTimeout(() => {
            this.setPose('kneel');
            this.state = 'IDLE';

            // Bảo đảm giải phóng slot khi đã an tọa tại ghế
            if (slot && this.manager) {
              this.manager.releaseDaisSlot(slot.id, this);
            }

            if (onFinishedCallback) {
              onFinishedCallback();
            }
          }, 400)
        );
      });
    }

    /**
     * Di chuyển từng đoạn đường mượt mà (hỗ trợ chuyển đổi hướng mặt đi lên / đi xuống)
     */
    executePath(waypoints, onComplete) {
      if (!waypoints || waypoints.length < 2) {
        if (onComplete) onComplete();
        return;
      }

      let segIdx = 0;
      let walkStepToggle = false;
      let currentFacing = waypoints[0]?.facing || 'up';

      // Đặt ngay tư thế khởi đầu theo hướng mặt
      if (currentFacing === 'down') {
        this.setPose('walkFront1');
      } else {
        this.setPose('walk1');
      }

      this.walkInterval = setInterval(() => {
        walkStepToggle = !walkStepToggle;
        if (currentFacing === 'down') {
          // Quay mặt ra phía trước khi đi xuống: dùng walkFront1 / walkFront2
          this.setPose(walkStepToggle ? 'walkFront1' : 'walkFront2');
        } else {
          // Quay mặt lên bàn thờ khi đi lên: dùng walk1 / walk2
          this.setPose(walkStepToggle ? 'walk1' : 'walk2');
        }
      }, 300);

      const runNextSegment = () => {
        if (segIdx >= waypoints.length - 1) {
          if (this.walkInterval) {
            clearInterval(this.walkInterval);
            this.walkInterval = null;
          }
          if (this.element) {
            this.element.style.transition = 'none';
          }
          if (onComplete) onComplete();
          return;
        }

        const pStart = waypoints[segIdx];
        const pEnd = waypoints[segIdx + 1];
        currentFacing = pEnd.facing || pStart.facing || 'up';
        const duration = pEnd.duration || 1200;
        const currentFlip = pEnd.flip !== undefined ? pEnd.flip : pStart.flip;
        const dynamicZIndex = Math.round(20 + ((pEnd.y - 1000) / 700) * 20);

        if (this.element) {
          this.element.style.transition = `left ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1), top ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1), transform ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
        }
        this.setPosition(pEnd.x, pEnd.y, pEnd.scale, dynamicZIndex, currentFlip);

        segIdx++;
        this.activeTimers.push(
          setTimeout(runNextSegment, duration)
        );
      };

      // Đặt vị trí xuất phát cho waypoint đầu tiên
      const p0 = waypoints[0];
      if (this.element) {
        this.element.style.transition = 'none';
      }
      this.setPosition(p0.x, p0.y, p0.scale, this.seat.zIndex, p0.flip);

      setTimeout(runNextSegment, 50);
    }

    leave(onDone) {
      if (this.daisSlot) {
        this.manager.releaseDaisSlot(this.daisSlot.id);
        this.daisSlot = null;
      }
      this.manager.pilgrimageQueue = this.manager.pilgrimageQueue.filter(item => item.controller !== this);
      this.state = 'LEAVING';
      this.clearTimers();
      if (!this.element) {
        if (onDone) onDone();
        return;
      }
      this.element.style.transition = 'opacity 1.2s ease, transform 1.2s ease';
      this.element.style.opacity = '0';
      this.element.style.transform = `translate(-50%, -85%) scale(${this.currentScale * 0.9})`;

      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
        }
        if (onDone) onDone();
      }, 1250);
    }

    shortenName(name, maxLen = 18) {
      const str = String(name || '');
      return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
    }

    escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  class WorshipperManager {
    constructor(container, seatManager) {
      this.container = container;
      this.seatManager = seatManager;
      this.controllers = new Map(); // viewerKey -> WorshipperController
      this.seatToController = new Map();
      this.pilgrimageQueue = [];
      this.daisSlots = DAIS_SLOTS.map((s) => ({ ...s, occupiedBy: null }));
      this.idleCameraTimer = null;
    }

    allocateDaisSlot(controller) {
      for (const slotId of DAIS_PRIORITY) {
        const slot = this.daisSlots[slotId];
        // 1. Kiểm tra occupiedBy: slot chỉ rảnh nếu không ai chiếm giữ hoặc người chiếm đã về IDLE/LEAVING
        if (slot.occupiedBy) {
          const occ = slot.occupiedBy;
          const isDead = !occ || !occ.element || !occ.element.parentNode || occ.state === 'IDLE' || occ.state === 'LEAVING';
          if (isDead) {
            if (occ && occ.daisSlot === slot) occ.daisSlot = null;
            slot.occupiedBy = null;
          } else {
            // ĐANG CÓ NGƯỜI QUỲ LẠY HOẶC ĐI LÊN/ĐI XUỐNG: TUYỆT ĐỐI BỎ QUA SLOT NÀY
            continue;
          }
        }

        // 2. KIỂM TRA KHÔNG GIAN VẬT LÝ: Bất kỳ controller nào đang ở trên thềm gỗ (y <= 1270) gần vị trí slot này (dx < 75)
        let physicallyOccupied = false;
        for (const c of this.controllers.values()) {
          if (!c || c === controller || !c.element || !c.element.parentNode) continue;
          if (c.state === 'IDLE' || c.state === 'LEAVING') continue;
          if (c.daisSlot && c.daisSlot.id === slot.id) {
            physicallyOccupied = true;
            break;
          }
          if (c.currentY <= 1270 && Math.abs(c.currentX - slot.x) < 75) {
            physicallyOccupied = true;
            break;
          }
        }
        if (physicallyOccupied) continue;

        // Slot hoàn toàn trống và an toàn!
        if (controller) {
          slot.occupiedBy = controller;
          controller.daisSlot = slot;
        }
        return slot;
      }
      return null;
    }

    releaseDaisSlot(slotId, expectedController = null) {
      const slot = this.daisSlots[slotId];
      if (slot) {
        if (expectedController && slot.occupiedBy && slot.occupiedBy !== expectedController) {
          return;
        }
        if (slot.occupiedBy && slot.occupiedBy.daisSlot === slot) {
          slot.occupiedBy.daisSlot = null;
        }
        slot.occupiedBy = null;
      }
      this.processPilgrimageQueue();
    }

    getActiveDaisCount() {
      return this.daisSlots.filter((s) => s.occupiedBy !== null).length;
    }

    /**
     * Yêu cầu lên bậc thềm gỗ dâng hương (hỗ trợ tối đa 7 người cùng lúc, mỗi vị trí đúng 1 người)
     */
    requestPilgrimage(controller, action = {}) {
      if (!controller) return;

      // 1. Đang quỳ lạy trên thềm: tiếp tục hiện lời chúc và lạy thêm tại chỗ
      if (controller.state === 'PRAYING') {
        controller.receiveInteraction(action);
        return;
      }

      // 2. Đang đi lên thềm: cập nhật lời chúc đang mang theo
      if (controller.state === 'WALKING_TO_DAIS') {
        if (action && action.wish) controller.showWish(action.wish);
        return;
      }

      // 3. Đang quay mặt đi về: hiện bong bóng chat trò chuyện, không ngắt quãng bước đi khoan thai
      if (controller.state === 'RETURNING') {
        if (action && action.wish) controller.showChatBubble(action.wish);
        return;
      }

      // 4. Đang trong hàng đợi: cập nhật nội dung lời chúc
      if (controller.state === 'QUEUED') {
        const existing = this.pilgrimageQueue.find((item) => item.controller === controller);
        if (existing && action) existing.action = action;
        return;
      }

      // 5. Đang ngồi quỳ IDLE tại đệm: vào hàng đợi trang nghiêm theo thứ tự ưu tiên
      if (controller.state === 'IDLE') {
        if (!this.pilgrimageQueue.some((item) => item.controller === controller)) {
          controller.state = 'QUEUED';
          const isGift = ['offerGift', 'grandCeremony'].includes(action && action.type);
          const isNewcomer = action && action.type === 'newcomerBow';
          const priority = isGift ? 2 : (isNewcomer ? 1 : 0);
          const queueItem = { controller, action, priority };

          if (isGift) {
            // Quà tặng ưu tiên lên đầu hàng đợi
            const idx = this.pilgrimageQueue.findIndex((p) => (p.priority || 0) < 2);
            if (idx >= 0) this.pilgrimageQueue.splice(idx, 0, queueItem);
            else this.pilgrimageQueue.push(queueItem);
          } else if (isNewcomer) {
            // Người mới vào ưu tiên trước thả tim
            const idx = this.pilgrimageQueue.findIndex((p) => (p.priority || 0) < 1);
            if (idx >= 0) this.pilgrimageQueue.splice(idx, 0, queueItem);
            else this.pilgrimageQueue.push(queueItem);
          } else {
            this.pilgrimageQueue.push(queueItem);
          }
        }
      }

      this.processPilgrimageQueue();
    }

    processPilgrimageQueue() {
      // Dọn sạch controller đã chết khỏi hàng đợi
      this.pilgrimageQueue = this.pilgrimageQueue.filter(
        item => item.controller && item.controller.element && item.controller.element.parentNode && (item.controller.state === 'QUEUED' || item.controller.state === 'IDLE')
      );

      // Cắt bớt hàng đợi nếu quá đông (> 45 người) để chống giật lag khi bão quà/cmt
      if (this.pilgrimageQueue.length > 45) {
        this.pilgrimageQueue = this.pilgrimageQueue.slice(-45);
      }

      if (this.pilgrimageQueue.length === 0) {
        if (this.getActiveDaisCount() === 0) {
          if (this.idleCameraTimer) clearTimeout(this.idleCameraTimer);
          this.idleCameraTimer = setTimeout(() => {
            if (this.getActiveDaisCount() === 0 && this.pilgrimageQueue.length === 0) {
              if (window.templeCameraController) window.templeCameraController.resetCamera(0);
              if (window.templeMonkController) window.templeMonkController.resumePatrol();
            }
          }, 2800);
        }
        return;
      }

      if (this.idleCameraTimer) {
        clearTimeout(this.idleCameraTimer);
        this.idleCameraTimer = null;
      }

      // Thầy Trụ Trì dạt đường và Camera cố định góc Chánh Điện
      if (window.templeMonkController) window.templeMonkController.yieldWay();
      if (window.templeCameraController) window.templeCameraController.focusAltar();

      // Cho phép lên đồng thời hoặc tuần tự từ 1 đến 7 vị Phật tử (theo hàng đợi)
      // MỖI VỊ TRÍ TRÊN THỀM ĐƯỢC BẢO ĐẢM TUYỆT ĐỐI CHỈ CÓ ĐÚNG 1 VỊ QUỲ LẠY, KHÔNG CHỒNG CHÉO!
      let launchDelay = 0;
      while (this.pilgrimageQueue.length > 0 && this.getActiveDaisCount() < 7) {
        const freeSlot = this.allocateDaisSlot(null);
        if (!freeSlot) break; // Đã kín 7 chỗ trên thềm gỗ

        const nextItem = this.pilgrimageQueue.shift();
        const ctrl = nextItem.controller;
        if (!ctrl || !ctrl.element || !ctrl.element.parentNode) continue;
        if (ctrl.daisSlot || ctrl.state === 'WALKING_TO_DAIS' || ctrl.state === 'PRAYING' || ctrl.state === 'RETURNING') {
          continue;
        }

        const slot = this.allocateDaisSlot(ctrl);
        if (!slot) {
          this.pilgrimageQueue.unshift(nextItem);
          break;
        }

        // Khóa ngay trạng thái để không bị gán trùng lặp trong thời gian chờ launch
        ctrl.state = 'WALKING_TO_DAIS';
        const delay = launchDelay;
        setTimeout(() => {
          if (ctrl.element && ctrl.element.parentNode && ctrl.state === 'WALKING_TO_DAIS') {
            ctrl.startPilgrimage(slot, nextItem.action, () => {
              this.processPilgrimageQueue();
            });
          }
        }, delay);

        // Giãn cách 350ms giữa mỗi người bước lên thảm đỏ để tạo dòng người trang nghiêm, mềm mại
        launchDelay += 350;
      }
    }

    /**
     * Đăng ký ngay vị trí cho user mới (bảo đảm mọi user mới đều thấy tên mình)
     */
    findController(viewer) {
      if (!viewer) return null;
      const uid = viewer.uniqueId;
      const name = viewer.name || viewer.user;
      const isValid = (c) => c && c.element && c.element.parentNode && c.state !== 'LEAVING';

      if (uid && this.controllers.has(uid)) {
        const c = this.controllers.get(uid);
        if (isValid(c)) return c;
        this.controllers.delete(uid);
      }
      if (name && this.controllers.has(name)) {
        const c = this.controllers.get(name);
        if (isValid(c)) return c;
        this.controllers.delete(name);
      }
      for (const ctrl of this.controllers.values()) {
        if (!isValid(ctrl)) continue;
        if (uid && ctrl.viewer.uniqueId && ctrl.viewer.uniqueId === uid) return ctrl;
        if (name && ctrl.viewer.name && ctrl.viewer.name.toLowerCase() === name.toLowerCase()) return ctrl;
      }
      return null;
    }

    getUniqueControllers() {
      const set = new Set();
      for (const ctrl of this.controllers.values()) {
        if (ctrl && ctrl.element && ctrl.element.parentNode && ctrl.state !== 'LEAVING') {
          set.add(ctrl);
        }
      }
      return Array.from(set);
    }

    registerActiveViewer(viewer, isActive = false) {
      if (!viewer) return null;
      let ctrl = this.findController(viewer);
      if (!ctrl) {
        const seat = this.seatManager.assignSeatForViewer(viewer);
        if (seat) {
          if (this.seatToController.has(seat.id)) {
            const oldCtrl = this.seatToController.get(seat.id);
            if (oldCtrl) {
              if (oldCtrl.daisSlot) {
                this.releaseDaisSlot(oldCtrl.daisSlot.id);
                oldCtrl.daisSlot = null;
              }
              this.pilgrimageQueue = this.pilgrimageQueue.filter(item => item.controller !== oldCtrl);
              if (oldCtrl.viewer.uniqueId) this.controllers.delete(oldCtrl.viewer.uniqueId);
              if (oldCtrl.viewer.name) this.controllers.delete(oldCtrl.viewer.name);
              oldCtrl.clearTimers();
              if (oldCtrl.element && oldCtrl.element.parentNode) {
                oldCtrl.element.parentNode.removeChild(oldCtrl.element);
              }
            }
          }

          ctrl = new WorshipperController(viewer, seat, this);
          if (viewer.uniqueId) this.controllers.set(viewer.uniqueId, ctrl);
          if (viewer.name) this.controllers.set(viewer.name, ctrl);
          this.seatToController.set(seat.id, ctrl);
        }
      } else {
        ctrl.viewer = { ...ctrl.viewer, ...viewer };
        if (viewer.uniqueId) this.controllers.set(viewer.uniqueId, ctrl);
        if (viewer.name) this.controllers.set(viewer.name, ctrl);
        if (isActive && ctrl.seat) {
          ctrl.seat.assignedAt = Date.now();
        }
        if (ctrl.badgeEl) {
          const nameSpan = ctrl.badgeEl.querySelector('.seat-username');
          if (nameSpan) nameSpan.textContent = ctrl.shortenName(ctrl.viewer.name, 18);
        }
      }
      return ctrl;
    }

    syncViewers(leaderboard = []) {
      if (!Array.isArray(leaderboard)) return;
      leaderboard.forEach((devotee) => {
        this.registerActiveViewer(devotee, false);
      });
    }

    /**
     * Đồng bộ Đạo Tràng Phật Tử theo lượt view thực tế của phiên Live:
     * - Nếu đang Live: hiển thị toàn bộ Phật tử trong session (tối đa 48 ghế), không xóa khi viewerCount = 0.
     * - Nếu không Live & có bật AutoSim: hiển thị theo lượt giả lập.
     */
    syncLiveAudience(sessionDevotees = [], viewerCount = 0, isLiveConnected = false, isAutoSim = false) {
      if (isLiveConnected) {
        const liveViewers = Math.max(0, Number(viewerCount) || 0);
        const devoteesList = Array.isArray(sessionDevotees) ? sessionDevotees : [];

        // 1. KHI LIVE 0 MẮT XEM VÀ CHƯA CÓ AI VÀO PHÒNG:
        // Chánh Điện hoàn toàn thanh tịnh, 0 Phật tử quỳ (tuyệt đối không hiện người ảo khi 0 view)
        if (liveViewers === 0 && devoteesList.length === 0) {
          const allControllers = this.getUniqueControllers();
          for (const ctrl of allControllers) {
            if (ctrl.state === 'IDLE' && !ctrl.daisSlot) {
              this.removeViewer(ctrl.viewer.uniqueId || ctrl.viewer.name);
            }
          }
          return;
        }

        // 2. KHI ĐANG CÓ NGƯỜI XEM (liveViewers > 0 hoặc vừa có người vào phòng):
        // Sức chứa tối đa bằng đúng số mắt xem thực tế (tối đa 48 ghế).
        // Nếu TikTok chưa kịp cập nhật viewerCount (>0), cho phép hiển thị những người thực sự đã vào phòng
        const targetCapacity = liveViewers > 0
          ? Math.min(48, liveViewers)
          : Math.min(48, devoteesList.length);

        // Lấy đúng số lượng người tương ứng với targetCapacity (ưu tiên người mới tương tác)
        const activeList = devoteesList.slice(0, targetCapacity);
        const activeKeys = new Set();
        activeList.forEach((d) => {
          if (d.uniqueId) activeKeys.add(d.uniqueId);
          if (d.name) activeKeys.add(d.name.toLowerCase());
          this.registerActiveViewer(d, false);
        });

        // Cắt giảm bớt người ngồi dư thừa để số lượng Phật tử quỳ luôn bám sát số mắt xem thực tế
        const currentControllers = this.getUniqueControllers();
        if (currentControllers.length > targetCapacity) {
          for (const ctrl of currentControllers) {
            if (this.getUniqueControllers().length <= targetCapacity) break;
            const uid = ctrl.viewer.uniqueId;
            const nm = (ctrl.viewer.name || '').toLowerCase();
            const isActiveInWindow = (uid && activeKeys.has(uid)) || (nm && activeKeys.has(nm));

            if (ctrl.state === 'IDLE' && !ctrl.daisSlot && !isActiveInWindow) {
              this.removeViewer(uid || ctrl.viewer.name);
            }
          }
        }
      } else if (isAutoSim) {
        if (Array.isArray(sessionDevotees)) {
          sessionDevotees.slice(0, 12).forEach((d) => {
            this.registerActiveViewer(d, false);
          });
        }
      } else {
        // KHI KHÔNG LIVE VÀ TẮT AUTO-SIM: Chánh Điện thanh tịnh, 0 Phật tử ảo
        const current = this.getUniqueControllers();
        for (const ctrl of current) {
          if (ctrl.state === 'IDLE' && !ctrl.daisSlot) {
            this.removeViewer(ctrl.viewer.uniqueId || ctrl.viewer.name);
          }
        }
      }
    }

    showViewerChat(user, uniqueId, commentText, avatar) {
      if (!user && !uniqueId) return;

      // Giới hạn tối đa 4 bong bóng chat đồng thời trên màn hình để giữ Chánh Điện trang nghiêm
      if (!this.activeBubbles) this.activeBubbles = new Set();
      if (this.activeBubbles.size >= 4) {
        const oldestCtrl = this.activeBubbles.values().next().value;
        if (oldestCtrl && oldestCtrl.wishBubbleEl) {
          oldestCtrl.wishBubbleEl.style.display = 'none';
          oldestCtrl.wishBubbleEl.classList.remove('fade');
          this.activeBubbles.delete(oldestCtrl);
        }
      }

      let ctrl = this.findController({ uniqueId, name: user });
      if (!ctrl) {
        ctrl = this.registerActiveViewer({
          name: user,
          uniqueId,
          avatar,
          lastWish: commentText,
          merit: 1
        });
      }
      if (ctrl) {
        ctrl.showChatBubble(commentText);
      }
    }

    dispatchInteraction(event) {
      if (!event) return;
      let ctrl = this.findController({ uniqueId: event.uniqueId, name: event.user });

      // Nếu controller đang ở trạng thái LEAVING hoặc không hợp lệ, xóa tham chiếu và cấp mới
      if (ctrl && (ctrl.state === 'LEAVING' || !ctrl.element || !ctrl.element.parentNode)) {
        ctrl = null;
      }

      if (!ctrl) {
        ctrl = this.registerActiveViewer({
          name: event.user,
          uniqueId: event.uniqueId,
          avatar: event.avatar,
          lastWish: event.wish,
          merit: event.merit || 10
        }, true);
      } else if (ctrl.seat) {
        ctrl.seat.assignedAt = Date.now();
      }

      // NẾU VẪN CHƯA CÓ GHẾ TRONG ĐẠO TRÀNG (do 48 ghế đang có người bận):
      // Vẫn tạo ngay 1 Controller xuất phát từ chân thảm đỏ (x=540, y=1690) để bước lên dâng hương!
      if (!ctrl) {
        const tempSeat = {
          id: `temp_carpet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          side: 'L',
          x: 540,
          y: 1690,
          scale: 1.0,
          zIndex: 38
        };
        ctrl = new WorshipperController({
          name: event.user,
          uniqueId: event.uniqueId,
          avatar: event.avatar,
          lastWish: event.wish,
          merit: event.merit || 10
        }, tempSeat, this);
        if (event.uniqueId) this.controllers.set(event.uniqueId, ctrl);
        if (event.user) this.controllers.set(event.user, ctrl);
      }

      if (ctrl) {
        // Nếu là sự kiện dâng hương, cúng quà, cầu phúc, thả tim, người mới: BƯỚC LÊN BẬC THỀM GỖ HÀNH LỄ!
        const isOffering = ['burnIncense', 'offerGift', 'grandCeremony', 'sendPrayer', 'likeBow', 'newcomerBow'].includes(event.type);
        if (isOffering) {
          this.requestPilgrimage(ctrl, event);
        } else {
          ctrl.receiveInteraction(event);
        }
      }
    }

    pulseHallBowing() {
      let delay = 0;
      this.controllers.forEach((ctrl) => {
        if (ctrl.state === 'IDLE') {
          setTimeout(() => {
            ctrl.setPose('bowMid');
            setTimeout(() => ctrl.setPose('prostrateDeep'), 250);
            setTimeout(() => ctrl.setPose('bowMid'), 600);
            setTimeout(() => ctrl.setPose('kneel'), 900);
          }, delay);
          delay = (delay + 60) % 400;
        }
      });
    }

    removeViewer(viewerKey) {
      const ctrl = this.controllers.get(viewerKey);
      if (ctrl) {
        if (ctrl.viewer.uniqueId) this.controllers.delete(ctrl.viewer.uniqueId);
        if (ctrl.viewer.name) this.controllers.delete(ctrl.viewer.name);
        ctrl.leave(() => {
          if (ctrl.seat) {
            this.seatToController.delete(ctrl.seat.id);
          }
          this.seatManager.releaseViewerSeat(viewerKey);
        });
      }
    }
  }

  global.TempleWorshipperManager = WorshipperManager;
  global.TempleWorshipperController = WorshipperController;
})(typeof window !== 'undefined' ? window : global);
