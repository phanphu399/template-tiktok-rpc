# Update worshipper-manager.js
with open('public/js/worshipper-manager.js', 'r', encoding='utf-8') as f:
    wm_code = f.read()

# Lines 219 to 344 in worshipper-manager.js
start_marker = "    startPilgrimage(slot, action, onFinishedCallback) {"
end_marker = "    executePath(waypoints, onComplete) {"

idx_start = wm_code.find(start_marker)
idx_end = wm_code.find(end_marker)

assert idx_start != -1, 'start_marker not found'
assert idx_end != -1, 'end_marker not found'

new_pilgrimage_code = """    startPilgrimage(slot, action, onFinishedCallback) {
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
        { x: slot.x, y: 1285, scale: 0.82, duration: 3200, flip: false, facing: 'up' },
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

      // Khi bước từ thềm gỗ xuống thảm đỏ (sau 1000ms), giải phóng ngay slot thềm gỗ
      // để người tiếp theo trong hàng đợi có thể bước lên!
      setTimeout(() => {
        if (slot && this.manager) {
          this.manager.releaseDaisSlot(slot.id);
        }
      }, 1000);

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
        // 1. Khoan thai bước từ thềm gỗ xuống thảm đỏ (quay mặt ra trước): 1000ms
        { x: slot.x, y: 1285, scale: 0.82, duration: 1000, flip: false, facing: 'down' },
        // 2. Chắp tay niệm Phật đi xuôi theo thảm đỏ xuống ngang hàng ghế của mình: 3400ms
        { x: aisleX, y: targetY, scale: targetScale, duration: 3400, flip: false, facing: 'down' },
        // 3. Rẽ vào vị trí đệm ngồi của mình: 1200ms
        { x: targetX, y: targetY, scale: targetScale, duration: 1200, flip: turnIntoSeatFlip, facing: 'down' }
      ];

      this.executePath(returnWaypoints, () => {
        // Về tới ghế: Quay mặt hướng lên bàn thờ (flip=false), hạ gối quỳ xuống
        this.setPosition(targetX, targetY, targetScale, this.seat.zIndex, false);
        this.setPose('kneelDown');

        this.activeTimers.push(
          setTimeout(() => {
            this.setPose('kneel');
            this.state = 'IDLE';

            // Bảo đảm giải phóng slot
            if (slot && this.manager) {
              this.manager.releaseDaisSlot(slot.id);
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
"""

wm_code = wm_code[:idx_start] + new_pilgrimage_code + wm_code[idx_end:]

# Also update walkInterval in executePath from 240ms to 300ms
old_execute = """      let segIdx = 0;
      let walkStepToggle = false;
      let currentFacing = waypoints[0]?.facing || 'up';

      this.walkInterval = setInterval(() => {
        walkStepToggle = !walkStepToggle;
        if (currentFacing === 'down') {
          // Quay mặt ra phía trước khi đi xuống: dùng walkFront1 / walkFront2
          this.setPose(walkStepToggle ? 'walkFront1' : 'walkFront2');
        } else {
          // Quay mặt lên bàn thờ khi đi lên: dùng walk1 / walk2
          this.setPose(walkStepToggle ? 'walk1' : 'walk2');
        }
      }, 240);"""

new_execute = """      let segIdx = 0;
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
      }, 300);"""

assert old_execute in wm_code, 'old_execute not found in worshipper-manager.js'
wm_code = wm_code.replace(old_execute, new_execute)

with open('public/js/worshipper-manager.js', 'w', encoding='utf-8') as f:
    f.write(wm_code)
print('Successfully updated worshipper-manager.js')


# 3. Update seat-manager.js - Adjust seating for spacious floor & narrower carpet
with open('public/js/seat-manager.js', 'r', encoding='utf-8') as f:
    sm_code = f.read()

old_seat_calc = """        // Cánh Trái thảm đỏ (Left Wing)
        // Thảm đỏ bắt đầu ở x=340. Cột trong cùng cách mép thảm an toàn (x <= 285px)
        // Tuyệt đối không ngồi đè lên thảm đỏ!
        // Thảm đỏ hẹp vừa vặn ở giữa. Cánh trái rộng rãi từ x=45 đến x=305 (rộng 260px)
        const leftInnerX = Math.round((280 - progress * 25) + (isOddRow ? -14 : 0));
        const leftOuterX = Math.round(45 + (isOddRow ? 10 : 0));
        for (let c = 0; c < this.colsPerSide; c++) {
          const t = this.colsPerSide === 1 ? 0 : c / (this.colsPerSide - 1);
          const x = Math.round(leftInnerX - t * (leftInnerX - leftOuterX));
          const id = `seat_L_r${r}_c${c}`;
          this.seats.set(id, {
            id,
            side: 'L',
            row: r,
            col: c,
            x,
            y,
            scale,
            zIndex,
            isOccupied: false,
            viewer: null,
            assignedAt: 0
          });
        }

        // Cánh Phải thảm đỏ (Right Wing)
        // Thảm đỏ kết thúc ở x=740. Cột trong cùng cách mép thảm an toàn (x >= 795px)
        // Tuyệt đối không ngồi đè lên thảm đỏ!
        // Cánh phải rộng rãi từ x=775 đến x=1035 (rộng 260px)
        const rightInnerX = Math.round((800 + progress * 25) + (isOddRow ? 14 : 0));
        const rightOuterX = Math.round(1035 + (isOddRow ? -10 : 0));"""

new_seat_calc = """        // Cánh Trái thảm đỏ (Left Wing)
        // Thảm đỏ hẹp vừa vặn ở giữa (từ x=360 ở trên đến x=260 ở dưới)
        // Cánh trái rộng rãi thoáng đãng từ x=40 đến x=310 (rộng 270px)
        const leftInnerX = Math.round((310 - progress * 80) + (isOddRow ? -12 : 0));
        const leftOuterX = Math.round(40 + (isOddRow ? 8 : 0));
        for (let c = 0; c < this.colsPerSide; c++) {
          const t = this.colsPerSide === 1 ? 0 : c / (this.colsPerSide - 1);
          const x = Math.round(leftInnerX - t * (leftInnerX - leftOuterX));
          const id = `seat_L_r${r}_c${c}`;
          this.seats.set(id, {
            id,
            side: 'L',
            row: r,
            col: c,
            x,
            y,
            scale,
            zIndex,
            isOccupied: false,
            viewer: null,
            assignedAt: 0
          });
        }

        // Cánh Phải thảm đỏ (Right Wing)
        // Thảm đỏ kết thúc ở x=720 ở trên, x=820 ở dưới
        // Cánh phải rộng rãi thoáng đãng từ x=770 đến x=1040 (rộng 270px)
        const rightInnerX = Math.round((770 + progress * 80) + (isOddRow ? 12 : 0));
        const rightOuterX = Math.round(1040 + (isOddRow ? -8 : 0));"""

assert old_seat_calc in sm_code, 'old_seat_calc not found in seat-manager.js'
sm_code = sm_code.replace(old_seat_calc, new_seat_calc)

with open('public/js/seat-manager.js', 'w', encoding='utf-8') as f:
    f.write(sm_code)
print('Successfully updated seat-manager.js')
