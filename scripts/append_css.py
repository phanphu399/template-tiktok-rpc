with open('public/css/live.css', 'r', encoding='utf-8') as f:
    content = f.read()

css_rules = '''

/* ============================================================================
   15. TOP GUIDE BUTTON & CONTINUOUS TEMPLE SCROLL MARQUEE
   ============================================================================ */
.top-guide-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(82, 38, 12, 0.95), rgba(138, 74, 18, 0.92));
  border: 1.5px solid rgba(255, 215, 0, 0.75);
  color: #fff4bd;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 240, 160, 0.4);
  transition: all 0.22s ease;
  user-select: none;
}

.top-guide-btn:hover {
  background: linear-gradient(135deg, rgba(110, 52, 16, 0.98), rgba(175, 96, 24, 0.96));
  border-color: #ffe680;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(255, 200, 50, 0.35);
}

.temple-scroll-marquee {
  position: absolute;
  top: 72px;
  left: 20px;
  right: 20px;
  height: 38px;
  z-index: 25;
  background: linear-gradient(90deg, rgba(18, 7, 4, 0.94), rgba(42, 16, 7, 0.92), rgba(18, 7, 4, 0.94));
  border: 1.2px solid rgba(244, 193, 80, 0.55);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7), inset 0 0 14px rgba(255, 180, 50, 0.12);
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  backdrop-filter: blur(8px);
  transition: border-color 0.25s, box-shadow 0.25s;
}

.temple-scroll-marquee:hover {
  border-color: rgba(255, 230, 100, 0.9);
  box-shadow: 0 6px 24px rgba(255, 190, 40, 0.38);
}

.marquee-badge {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 15px;
  height: 100%;
  background: linear-gradient(135deg, #b88628, #73450e);
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.6px;
  border-radius: 999px 0 0 999px;
  box-shadow: 3px 0 10px rgba(0, 0, 0, 0.45);
}

.marquee-badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #73f78a;
  box-shadow: 0 0 8px #73f78a;
  animation: badgeDotBreathe 1.8s infinite alternate;
}

@keyframes badgeDotBreathe {
  0% { transform: scale(0.85); opacity: 0.7; }
  100% { transform: scale(1.25); opacity: 1; }
}

.marquee-track-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
}

.marquee-track {
  display: inline-flex;
  white-space: nowrap;
  animation: marqueeScroll 45s linear infinite;
  will-change: transform;
}

.temple-scroll-marquee:hover .marquee-track {
  animation-play-state: paused;
}

@keyframes marqueeScroll {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}

.marquee-item {
  font-size: 13px;
  font-weight: 600;
  color: #fff2b8;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.marquee-item strong {
  color: #ffe066;
  font-weight: 800;
}

.marquee-item em {
  color: #ff9f43;
  font-style: normal;
  font-weight: 700;
}

.marquee-item .highlight-gift {
  color: #ff7675;
  font-weight: 800;
  text-shadow: 0 0 8px rgba(255, 118, 117, 0.6);
}

.marquee-sep {
  color: rgba(255, 215, 0, 0.45);
  font-size: 14px;
}

/* ============================================================================
   16. TEMPLE GUIDE & LEGAL DISCLAIMER MODAL
   ============================================================================ */
.temple-guide-modal-overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: rgba(10, 3, 2, 0.84);
  backdrop-filter: blur(12px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  animation: guideFadeIn 0.28s ease-out;
}

.temple-guide-modal-overlay.active {
  display: flex;
}

@keyframes guideFadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.temple-guide-card {
  position: relative;
  width: 100%;
  max-width: 980px;
  max-height: 90vh;
  background: linear-gradient(180deg, #1f0d07 0%, #150804 100%);
  border: 2px solid rgba(255, 215, 0, 0.65);
  border-radius: 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(212, 175, 55, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.guide-close-btn {
  position: absolute;
  top: 18px;
  right: 20px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid rgba(255, 215, 0, 0.4);
  color: #fff2b8;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 2;
}

.guide-close-btn:hover {
  background: rgba(220, 50, 40, 0.85);
  border-color: #ff7675;
  color: #fff;
  transform: rotate(90deg);
}

.guide-header {
  padding: 32px 36px 18px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 215, 0, 0.25);
  background: linear-gradient(180deg, rgba(80, 32, 12, 0.4) 0%, transparent 100%);
}

.guide-lotus-icon {
  font-size: 38px;
  margin-bottom: 6px;
  filter: drop-shadow(0 0 12px rgba(255, 190, 50, 0.6));
}

.guide-title {
  font-family: 'Cinzel', serif;
  font-size: 32px;
  font-weight: 900;
  color: #ffd700;
  letter-spacing: 2px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8), 0 0 24px rgba(255, 215, 0, 0.4);
}

.guide-subtitle {
  font-size: 15px;
  color: #e6c88b;
  margin-top: 4px;
  font-weight: 500;
}

.guide-body {
  padding: 24px 36px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
  font-size: 14.5px;
  line-height: 1.6;
  color: #f5eedc;
}

.guide-section {
  border-radius: 18px;
  padding: 20px 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.guide-sec-title {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 9px;
}

.legal-section {
  background: rgba(14, 20, 32, 0.65);
  border-color: rgba(90, 140, 220, 0.35);
}
.legal-section .guide-sec-title {
  color: #89b4fa;
}
.legal-section .guide-sec-text p {
  margin-bottom: 8px;
}
.legal-section .guide-sec-text p:last-child {
  margin-bottom: 0;
}

.free-section {
  background: rgba(18, 30, 20, 0.55);
  border-color: rgba(100, 200, 120, 0.3);
}
.free-section .guide-sec-title {
  color: #a6e3a1;
}

.guide-grid-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.guide-mini-card {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.guide-mini-card .g-icon {
  font-size: 26px;
}
.guide-mini-card strong {
  color: #ffe066;
  font-size: 14px;
}
.guide-mini-card span {
  font-size: 13px;
  color: #d1c7b7;
  line-height: 1.45;
}

.vip-section {
  background: linear-gradient(135deg, rgba(60, 26, 8, 0.7) 0%, rgba(35, 12, 4, 0.7) 100%);
  border-color: rgba(255, 215, 0, 0.45);
  box-shadow: inset 0 0 20px rgba(255, 180, 50, 0.08);
}
.vip-section .guide-sec-title {
  color: #ffd700;
  text-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
}

.vip-benefit-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vip-item {
  background: rgba(0, 0, 0, 0.4);
  border: 1.2px solid rgba(255, 215, 0, 0.25);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 0.2s, background 0.2s;
}

.vip-item:hover {
  border-color: rgba(255, 215, 0, 0.6);
  background: rgba(0, 0, 0, 0.55);
}

.vip-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.vip-badge.gold {
  background: linear-gradient(135deg, #e67e22, #b8860b);
  color: #fff;
}
.vip-badge.diamond {
  background: linear-gradient(135deg, #9b59b6, #e74c3c);
  color: #fff;
}
.vip-badge.platinum {
  background: linear-gradient(135deg, #f1c40f, #d35400);
  color: #000;
}

.vip-desc {
  font-size: 13.5px;
  color: #f3e6d1;
  line-height: 1.5;
}
.vip-desc strong {
  color: #ffe680;
}
.vip-desc em {
  color: #ff9f43;
  font-style: normal;
  font-weight: 700;
}

.guide-footer {
  padding: 18px 36px 26px;
  border-top: 1px solid rgba(255, 215, 0, 0.25);
  display: flex;
  justify-content: center;
  background: rgba(12, 4, 2, 0.6);
}

.guide-action-btn {
  padding: 13px 48px;
  border-radius: 999px;
  background: linear-gradient(135deg, #c9933b, #7d4e13);
  border: 2px solid #ffd700;
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 22px rgba(200, 140, 20, 0.4);
  transition: all 0.2s;
}

.guide-action-btn:hover {
  background: linear-gradient(135deg, #deb04f, #945f1b);
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(255, 200, 40, 0.55);
}
'''

with open('public/css/live.css', 'a', encoding='utf-8') as f:
    f.write(css_rules)
print('Successfully appended CSS rules')
