const fs = require('fs');
const path = require('path');

// 1. Update public/js/seat-manager.js
const seatPath = path.join(__dirname, '../public/js/seat-manager.js');
let seatContent = fs.readFileSync(seatPath, 'utf8');

const sStart = seatContent.indexOf('      if (!freeSeat) {');
const sEnd = seatContent.indexOf('      if (freeSeat) {', sStart);

if (sStart !== -1 && sEnd !== -1) {
  const newSeatLogic = `      // Nếu hết chỗ: tái phân bổ ghế của thí chủ đã lâu nhất không hoạt động
      // TUYỆT ĐỐI KHÔNG CƯỚP GHẾ của người đang bước đi, quỳ lạy hoặc đang có daisSlot
      if (!freeSeat) {
        let oldestSeat = null;
        let oldestTime = Infinity;
        let fallbackIdleSeat = null;
        let fallbackOldestTime = Infinity;
        const now = Date.now();
        for (const s of prioritized) {
          const ctrl = window.templeWorshipperManager?.seatToController?.get(s.id);
          // Bỏ qua người đang bước đi, quỳ lạy, chờ trên thềm hoặc có daisSlot
          if (ctrl && (ctrl.state !== 'IDLE' || ctrl.daisSlot != null || ctrl.walkInterval != null)) {
            continue;
          }
          const t = Number(s.assignedAt) || 0;
          if (t < fallbackOldestTime) {
            fallbackOldestTime = t;
            fallbackIdleSeat = s;
          }
          // Ưu tiên người đã ngồi lâu hơn 15 giây
          if (t && (now - t < 15000)) {
            continue;
          }
          if (t < oldestTime) {
            oldestTime = t;
            oldestSeat = s;
          }
        }
        const seatToTake = oldestSeat || fallbackIdleSeat;
        if (seatToTake && seatToTake.viewer) {
          if (seatToTake.viewer.uniqueId) this.viewerToSeat.delete(seatToTake.viewer.uniqueId);
          if (seatToTake.viewer.name) this.viewerToSeat.delete(seatToTake.viewer.name);
          freeSeat = seatToTake;
        }
      }

`;
  seatContent = seatContent.slice(0, sStart) + newSeatLogic + seatContent.slice(sEnd);
  fs.writeFileSync(seatPath, seatContent, 'utf8');
  console.log('✅ Updated public/js/seat-manager.js successfully!');
} else {
  console.error('❌ Could not find seat indices in seat-manager.js');
}

// 2. Update public/js/worshipper-manager.js
const wPath = path.join(__dirname, '../public/js/worshipper-manager.js');
let wContent = fs.readFileSync(wPath, 'utf8');

// A. Update registerActiveViewer
const regStart = wContent.indexOf('    registerActiveViewer(viewer) {');
const regEnd = wContent.indexOf('    syncViewers(leaderboard = []) {');

if (regStart !== -1 && regEnd !== -1) {
  const newReg = `    registerActiveViewer(viewer, isActive = false) {
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
          if (nameSpan) nameSpan.textContent = ctrl.shortenName(ctrl.viewer.name, 11);
        }
      }
      return ctrl;
    }

`;
  wContent = wContent.slice(0, regStart) + newReg + wContent.slice(regEnd);
  console.log('✅ Updated registerActiveViewer successfully!');
}

// B. Update syncViewers
const syncStart = wContent.indexOf('    syncViewers(leaderboard = []) {');
const syncEnd = wContent.indexOf('    showViewerChat(user, uniqueId, commentText, avatar) {');

if (syncStart !== -1 && syncEnd !== -1) {
  const newSync = `    syncViewers(leaderboard = []) {
      if (!Array.isArray(leaderboard)) return;
      leaderboard.forEach((devotee) => {
        this.registerActiveViewer(devotee, false);
      });
    }

`;
  wContent = wContent.slice(0, syncStart) + newSync + wContent.slice(syncEnd);
  console.log('✅ Updated syncViewers successfully!');
}

// C. Update dispatchInteraction
const dispStart = wContent.indexOf('    dispatchInteraction(event) {');
const dispEnd = wContent.indexOf('    pulseHallBowing() {');

if (dispStart !== -1 && dispEnd !== -1) {
  const newDisp = `    dispatchInteraction(event) {
      if (!event) return;
      let ctrl = this.findController({ uniqueId: event.uniqueId, name: event.user });

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
          id: \`temp_carpet_\${Date.now()}_\${Math.random().toString(36).slice(2, 6)}\`,
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
        // Nếu là sự kiện dâng hương, cúng quà, cầu phúc: BƯỚC LÊN BẬC THỀM GỖ HÀNH LỄ!
        const isOffering = ['burnIncense', 'offerGift', 'grandCeremony', 'sendPrayer'].includes(event.type);
        if (isOffering) {
          this.requestPilgrimage(ctrl, event);
        } else {
          ctrl.receiveInteraction(event);
        }
      }
    }

`;
  wContent = wContent.slice(0, dispStart) + newDisp + wContent.slice(dispEnd);
  console.log('✅ Updated dispatchInteraction successfully!');
}

fs.writeFileSync(wPath, wContent, 'utf8');

// 3. Update public/js/monk-controller.js
const mPath = path.join(__dirname, '../public/js/monk-controller.js');
let mContent = fs.readFileSync(mPath, 'utf8');

const yieldStart = mContent.indexOf('    yieldWay() {');
const yieldEnd = mContent.indexOf('    resumePatrol() {');

if (yieldStart !== -1 && yieldEnd !== -1) {
  const newYield = `    yieldWay() {
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

`;
  mContent = mContent.slice(0, yieldStart) + newYield + mContent.slice(yieldEnd);
  fs.writeFileSync(mPath, mContent, 'utf8');
  console.log('✅ Updated monk-controller.js yieldWay successfully!');
}

console.log('ALL UPDATES FINISHED!');
