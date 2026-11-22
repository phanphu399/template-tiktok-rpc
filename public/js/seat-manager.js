/**
 * SeatManager — Quản lý vị trí ngồi của Phật tử dưới Sân Lễ Đạo Tràng
 * 
 * Thiết kế mới:
 * - ĐƯA TOÀN BỘ GHẾ XUỐNG DƯỚI SÂN CHÙA (y: 1290 -> 1660px), TRÁNH HOÀN TOÀN BẬC THANG
 * - Bậc thang trước điện được giữ thoáng đãng cho Thầy Trụ Trì đứng chúc phúc và Phật tử đảnh lễ
 * - Mỗi user mới tham gia đều được cấp ngay vị trí ngồi với thẻ tên và avatar sắc nét
 * - Tự động mở rộng hàng ghế khi lượng người xem tăng
 */
(function (global) {
  'use strict';

  class SeatManager {
    constructor(options = {}) {
      this.container = options.container || null;
      this.seats = new Map(); // seatId -> SeatInfo
      this.viewerToSeat = new Map(); // viewerKey -> seatId
      this.maxInitialRows = 6;
      this.colsPerSide = 4;
      this.initGrid();
    }

    /**
     * Khởi tạo tọa độ các vị trí ngồi HAI BÊN THẢM ĐỎ DƯỚI SÂN CHÙA
     * Cao độ: y = 1380px (hàng đầu sân) -> 1660px (hàng cuối sân gần HUD)
     * Tuyệt đối không trèo lên bậc thang phía trên điện (bậc thang kết thúc ở y=1250)!
     */
    initGrid(totalRows = this.maxInitialRows) {
      this.seats.clear();
      this.viewerToSeat.clear();

      for (let r = 0; r < totalRows; r++) {
        // progress: 0 (hàng đầu sân chùa y=1390) -> 1 (hàng cuối sân chùa y=1670)
        const progress = totalRows === 1 ? 0 : r / (totalRows - 1);
        const y = Math.round(1430 + progress * 260); // 1430 -> 1690px
        const scale = +(0.80 + progress * 0.22).toFixed(2); // 0.80 -> 1.02
        const zIndex = 22 + r * 3; // 22 -> 37 (HUD bắt đầu ở zIndex=40)

        // So le hình mắt lưới (checkerboard stagger) giữa các hàng chẵn/lẻ
        // để hàng sau không bị người hàng trước che chắn tầm nhìn hoặc thẻ tên
        const isOddRow = (r % 2 === 1);

        // Cánh Trái thảm đỏ (Left Wing)
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
        const rightOuterX = Math.round(1040 + (isOddRow ? -8 : 0));
        for (let c = 0; c < this.colsPerSide; c++) {
          const t = this.colsPerSide === 1 ? 0 : c / (this.colsPerSide - 1);
          const x = Math.round(rightInnerX + t * (rightOuterX - rightInnerX));
          const id = `seat_R_r${r}_c${c}`;
          this.seats.set(id, {
            id,
            side: 'R',
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
      }
    }

    /**
     * Danh sách chỗ ngồi theo thứ tự ưu tiên gán:
     * Cân bằng đối xứng 2 bên Tả Hữu, từ hàng trước ra sau, từ thảm đỏ ra ngoài
     */
    getPrioritizedSeatList() {
      const list = Array.from(this.seats.values());
      return list.sort((a, b) => {
        // 1. Ưu tiên hàng trước (r=0, r=1...)
        if (a.row !== b.row) return a.row - b.row;
        // 2. Ưu tiên cột gần thảm đỏ (c=0, c=1...)
        if (a.col !== b.col) return a.col - b.col;
        // 3. Đan xen Tả (L) và Hữu (R)
        if (a.side !== b.side) return a.side === 'L' ? -1 : 1;
        return 0;
      });
    }

    findExistingSeat(viewer) {
      if (!viewer) return null;
      const uid = viewer.uniqueId;
      const name = viewer.name || viewer.user;
      if (uid && this.viewerToSeat.has(uid)) {
        const s = this.seats.get(this.viewerToSeat.get(uid));
        if (s && s.isOccupied) return s;
      }
      if (name && this.viewerToSeat.has(name)) {
        const s = this.seats.get(this.viewerToSeat.get(name));
        if (s && s.isOccupied) return s;
      }
      for (const s of this.seats.values()) {
        if (!s.isOccupied || !s.viewer) continue;
        if (uid && s.viewer.uniqueId && s.viewer.uniqueId === uid) return s;
        if (name && s.viewer.name && s.viewer.name.toLowerCase() === name.toLowerCase()) return s;
      }
      return null;
    }

    /**
     * Tìm hoặc cấp chỗ ngồi cho người xem mới (Bảo đảm user mới luôn có vị trí rõ nét)
     */
    assignSeatForViewer(viewer) {
      if (!viewer) return null;
      const existingSeat = this.findExistingSeat(viewer);
      if (existingSeat) {
        existingSeat.viewer = { ...existingSeat.viewer, ...viewer };
        existingSeat.assignedAt = Date.now();
        if (viewer.uniqueId) this.viewerToSeat.set(viewer.uniqueId, existingSeat.id);
        if (viewer.name) this.viewerToSeat.set(viewer.name, existingSeat.id);
        return existingSeat;
      }
      if (!viewer) return null;
      const key = viewer.uniqueId || viewer.name;
      if (!key) return null;



      // Tìm chỗ trống theo thứ tự ưu tiên
      const prioritized = this.getPrioritizedSeatList();
      let freeSeat = prioritized.find((s) => !s.isOccupied);

      // Nếu hết chỗ: tái phân bổ ghế của thí chủ đã lâu nhất không hoạt động
      // TUYỆT ĐỐI KHÔNG CƯỚP GHẾ của người đang bước đi, quỳ lạy hoặc vừa có tương tác trong 15s
      // Nếu hết chỗ: tái phân bổ ghế của thí chủ đã lâu nhất không hoạt động
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

      if (freeSeat) {
        freeSeat.isOccupied = true;
        freeSeat.viewer = { ...viewer };
        freeSeat.assignedAt = Date.now();
        if (viewer.uniqueId) this.viewerToSeat.set(viewer.uniqueId, freeSeat.id);
        if (viewer.name) this.viewerToSeat.set(viewer.name, freeSeat.id);
        return freeSeat;
      }

      return null;
    }

    expandCapacity() {
      const currentRows = Math.max(...Array.from(this.seats.values()).map((s) => s.row)) + 1;
      if (currentRows >= 10) return;
      const newRow = currentRows;
      const progress = newRow / 9;
      const y = Math.round(1430 + progress * 260);
      const scale = +(0.80 + progress * 0.22).toFixed(2);
      const zIndex = 22 + newRow * 3;
      const isOddRow = (newRow % 2 === 1);

      const leftInnerX = Math.round((285 - progress * 20) + (isOddRow ? -14 : 0));
      const leftOuterX = Math.round(50 + (isOddRow ? 10 : 0));
      for (let c = 0; c < this.colsPerSide; c++) {
        const t = c / (this.colsPerSide - 1);
        const x = Math.round(leftInnerX - t * (leftInnerX - leftOuterX));
        const id = `seat_L_r${newRow}_c${c}`;
        this.seats.set(id, {
          id,
          side: 'L',
          row: newRow,
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

      const rightInnerX = Math.round((795 + progress * 20) + (isOddRow ? 14 : 0));
      const rightOuterX = Math.round(1030 + (isOddRow ? -10 : 0));
      for (let c = 0; c < this.colsPerSide; c++) {
        const t = c / (this.colsPerSide - 1);
        const x = Math.round(rightInnerX + t * (rightOuterX - rightInnerX));
        const id = `seat_R_r${newRow}_c${c}`;
        this.seats.set(id, {
          id,
          side: 'R',
          row: newRow,
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
    }

    releaseViewerSeat(viewerKey) {
      if (!viewerKey) return null;
      const seatId = this.viewerToSeat.get(viewerKey);
      if (!seatId) return null;

      const seat = this.seats.get(seatId);
      if (seat) {
        seat.isOccupied = false;
        seat.viewer = null;
        seat.assignedAt = 0;
      }
      this.viewerToSeat.delete(viewerKey);
      return seat;
    }

    getSeatForViewer(viewerKey) {
      if (!viewerKey) return null;
      const seatId = this.viewerToSeat.get(viewerKey);
      return seatId ? this.seats.get(seatId) : null;
    }

    getSeat(seatId) {
      return this.seats.get(seatId) || null;
    }

    getAllSeats() {
      return Array.from(this.seats.values());
    }

    getStats() {
      const total = this.seats.size;
      const occupied = Array.from(this.seats.values()).filter((s) => s.isOccupied).length;
      return { total, occupied, vacant: total - occupied };
    }
  }

  global.TempleSeatManager = SeatManager;
})(typeof window !== 'undefined' ? window : global);
