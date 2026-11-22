import sys

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add top-guide-btn into minimal-top-bar
old_top_bar = '''          <div class="top-Right-badges">
            <div class="mini-stat-pill">
              🔥 <strong id="statIncense">108</strong> hương • ✨ <strong id="statMerit">1,080</strong> CĐ
            </div>
          </div>'''

new_top_bar = '''          <div class="top-Right-badges">
            <button class="top-guide-btn" id="btnOpenTempleGuide" title="Bấm để xem Giới thiệu phòng Live & Thể lệ cúng dường">
              📜 Thể Lệ & Công Đức
            </button>
            <div class="mini-stat-pill">
              🔥 <strong id="statIncense">108</strong> hương • ✨ <strong id="statMerit">1,080</strong> CĐ
            </div>
          </div>'''
assert old_top_bar in content, 'old_top_bar not found'
content = content.replace(old_top_bar, new_top_bar)

# 2. Add temple-scroll-marquee right below minimal-top-bar
old_header_end = '</header>'
marquee_html = '''</header>

        <!-- 2B. THANH CHỮ CHẠY VĂN HÓA & TUYÊN BỐ PHÁP LÝ & HƯỚNG DẪN TƯƠNG TÁC (SCROLL MARQUEE) -->
        <div class="temple-scroll-marquee" id="templeScrollMarquee" title="Bấm để xem Chi tiết Giới thiệu & Thể lệ cúng dường">
          <div class="marquee-badge">
            <span class="marquee-badge-dot"></span>
            <span>THÔNG ĐIỆP ĐẠO TRÀNG</span>
          </div>
          <div class="marquee-track-container">
            <div class="marquee-track" id="marqueeTrack">
              <span class="marquee-item">🪷 <em>ĐẠO TRÀNG HOA SEN SỐ:</em> Không gian văn hóa tâm linh số tương tác phục vụ cộng đồng, lan tỏa năng lượng bình an. Mọi vật phẩm mang tính chất chúc phúc & giải trí lành mạnh, không mang yếu tố mê tín dị đoan.</span>
              <span class="marquee-sep">•</span>
              <span class="marquee-item">🙏 <em>TƯƠNG TÁC MIỄN PHÍ:</em> Bình luận <strong>"lạy"</strong>, <strong>"thắp nhang"</strong>, <strong>"cầu an"</strong> để nhận vị trí & hiện tên trên Live • Chạm tim gõ Mõ • Gõ <strong>"xin xăm"</strong> để gieo quẻ Linh Xăm đầu tháng!</span>
              <span class="marquee-sep">•</span>
              <span class="marquee-item">🌟 <em>ĐẶC QUYỀN TẶNG QUÀ:</em> Tặng <span class="highlight-gift">Hoa Sen Vàng / Đèn Dầu</span> để bước lên <strong>Bậc Thềm Chánh Điện quỳ lạy</strong> trước Đức Phật, Thầy Trụ Trì đọc sớ xướng danh và vinh danh Bảng Vàng!</span>
              <span class="marquee-sep">•</span>
              <span class="marquee-item">🪷 <em>ĐẠO TRÀNG HOA SEN SỐ:</em> Không gian văn hóa tâm linh số tương tác phục vụ cộng đồng, lan tỏa năng lượng bình an. Mọi vật phẩm mang tính chất chúc phúc & giải trí lành mạnh, không mang yếu tố mê tín dị đoan.</span>
              <span class="marquee-sep">•</span>
              <span class="marquee-item">🙏 <em>TƯƠNG TÁC MIỄN PHÍ:</em> Bình luận <strong>"lạy"</strong>, <strong>"thắp nhang"</strong>, <strong>"cầu an"</strong> để nhận vị trí & hiện tên trên Live • Chạm tim gõ Mõ • Gõ <strong>"xin xăm"</strong> để gieo quẻ Linh Xăm đầu tháng!</span>
              <span class="marquee-sep">•</span>
              <span class="marquee-item">🌟 <em>ĐẶC QUYỀN TẶNG QUÀ:</em> Tặng <span class="highlight-gift">Hoa Sen Vàng / Đèn Dầu</span> để bước lên <strong>Bậc Thềm Chánh Điện quỳ lạy</strong> trước Đức Phật, Thầy Trụ Trì đọc sớ xướng danh và vinh danh Bảng Vàng!</span>
              <span class="marquee-sep">•</span>
            </div>
          </div>
        </div>'''
assert old_header_end in content, 'old_header_end not found'
content = content.replace(old_header_end, marquee_html, 1)

# 3. Add templeGuideModal right after fortuneModal
old_fortune_end = '''        <!-- MODAL TỜ GIẢI QUẺ LINH XĂM -->
        <div class="fortune-modal-overlay" id="fortuneModal">
          <div class="fortune-scroll-card">
            <div class="fortune-badge" id="fortuneRankBadge">THƯỢNG THƯỢNG CÁT</div>
            <div class="fortune-heading" id="fortuneTitle">Quẻ Số 1 — Nhật Xuất Đông Phương</div>
            <div class="fortune-devotee" id="fortuneDevotee">Thí chủ xin quẻ: Minh Tâm</div>
            <div class="fortune-poem" id="fortunePoem"></div>
            <div class="fortune-meaning" id="fortuneMeaning"></div>
          </div>
        </div>'''

guide_modal_html = '''        <!-- MODAL TỜ GIẢI QUẺ LINH XĂM -->
        <div class="fortune-modal-overlay" id="fortuneModal">
          <div class="fortune-scroll-card">
            <div class="fortune-badge" id="fortuneRankBadge">THƯỢNG THƯỢNG CÁT</div>
            <div class="fortune-heading" id="fortuneTitle">Quẻ Số 1 — Nhật Xuất Đông Phương</div>
            <div class="fortune-devotee" id="fortuneDevotee">Thí chủ xin quẻ: Minh Tâm</div>
            <div class="fortune-poem" id="fortunePoem"></div>
            <div class="fortune-meaning" id="fortuneMeaning"></div>
          </div>
        </div>

        <!-- MODAL CẨM NANG & THỂ LỆ CÔNG ĐỨC PHÒNG LIVE -->
        <div class="temple-guide-modal-overlay" id="templeGuideModal">
          <div class="temple-guide-card">
            <button class="guide-close-btn" id="btnCloseTempleGuide" title="Đóng">✕</button>
            <div class="guide-header">
              <div class="guide-lotus-icon">🪷</div>
              <div class="guide-title">ĐẠO TRÀNG HOA SEN SỐ</div>
              <div class="guide-subtitle">Không Gian Văn Hóa Tâm Linh & Cẩm Nang Tương Tác</div>
            </div>

            <div class="guide-body">
              <!-- KHỐI 1: Ý NGHĨA & PHÁP LÝ MINH BẠCH (BẢO VỆ PHÁP LÝ STREAMER) -->
              <div class="guide-section legal-section">
                <div class="guide-sec-title">⚖️ Tuyên Bố Pháp Lý & Ý Nghĩa Văn Hóa</div>
                <div class="guide-sec-text">
                  <p>• <strong>Bản chất phòng Live:</strong> Đây là chương trình mô phỏng nghệ thuật & trải nghiệm văn hóa tâm linh số hóa trên TikTok Live, phục vụ cộng đồng tĩnh tâm, gieo duyên lành và lan tỏa những lời chúc tốt đẹp.</p>
                  <p>• <strong>Minh bạch cúng dường:</strong> Mọi hình ảnh nghi thức (thắp hương, gõ mõ, gieo quẻ) và điểm <em>"Công Đức"</em> hoàn toàn là thông số mô phỏng trong chương trình. Toàn bộ quà tặng hoặc cúng dường từ người xem mang ý nghĩa chúc phúc, giải trí và ủng hộ người sáng tạo nội dung, <strong>hoàn toàn KHÔNG mang tính chất mê tín dị đoan, buôn thần bán thánh hay đại diện cho bất kỳ tổ chức tôn giáo chính thức nào</strong>.</p>
                  <p>• Phòng Live nghiêm túc tuân thủ pháp luật Việt Nam và tiêu chuẩn cộng đồng TikTok.</p>
                </div>
              </div>

              <!-- KHỐI 2: HƯỚNG DẪN TƯƠNG TÁC MIỄN PHÍ -->
              <div class="guide-section free-section">
                <div class="guide-sec-title">🎮 Cách Thức Tương Tác Miễn Phí</div>
                <div class="guide-grid-cards">
                  <div class="guide-mini-card">
                    <span class="g-icon">💬</span>
                    <strong>Bình luận Tự Do</strong>
                    <span>Gõ <em>"lạy"</em>, <em>"thắp nhang"</em>, <em>"cầu an"</em> để được cấp ghế ngồi, hiện tên và lời chúc phúc trên Live.</span>
                  </div>
                  <div class="guide-mini-card">
                    <span class="g-icon">🪵</span>
                    <strong>Chạm Tim Gõ Mõ</strong>
                    <span>Mỗi lượt thả tim trên màn hình tự động ngân vang tiếng Mõ gỗ, tích phước an lạc cho đạo tràng.</span>
                  </div>
                  <div class="guide-mini-card">
                    <span class="g-icon">🎋</span>
                    <strong>Gieo Quẻ Linh Xăm</strong>
                    <span>Bình luận <em>"xin xăm"</em> hoặc <em>"gieo quẻ"</em> để bốc quẻ đầu tháng, nghe Thầy Trụ Trì đọc thơ giải quẻ.</span>
                  </div>
                </div>
              </div>

              <!-- KHỐI 3: ĐẶC QUYỀN CÚNG DƯỜNG & TẶNG QUÀ (TỐI ƯU HÓA CHUYỂN ĐỔI QUÀ TẶNG) -->
              <div class="guide-section vip-section">
                <div class="guide-sec-title">🌟 Đặc Quyền Phát Tâm Cúng Dường (Quà Tặng)</div>
                <div class="vip-benefit-card">
                  <div class="vip-item">
                    <div class="vip-badge gold">🪷 BẬC THỀM CHÁNH ĐIỆN</div>
                    <div class="vip-desc">
                      <strong>Tặng Hoa Sen Vàng / Đèn Dầu (10+ Xu):</strong> Nhân vật đại diện của bạn sẽ được <em>đặc cách bước lên Bậc Thềm Gỗ Chánh Điện</em> trực tiếp trước Đức Phật A Di Đà thực hiện Đại Lễ Đảnh Lễ Tam Bái trang nghiêm! Thầy Trụ Trì đứng nhường lối và chúc phúc!
                    </div>
                  </div>
                  <div class="vip-item">
                    <div class="vip-badge diamond">🐉 ĐẠI LỄ KIM LONG & SỚ KHẤN</div>
                    <div class="vip-desc">
                      <strong>Tặng Đỉnh Rồng / Quà Lớn (100+ Xu):</strong> Kích hoạt <em>Đại Lễ Kim Long Chầu Phật</em> toàn màn hình. Thầy Trụ Trì <em>đích thân xướng tên thí chủ và tuyên đọc toàn văn lời khấn cầu an</em> vang vọng đạo tràng!
                    </div>
                  </div>
                  <div class="vip-item">
                    <div class="vip-badge platinum">📜 BẢNG VÀNG VĨNH CỬU</div>
                    <div class="vip-desc">
                      Khắc tên thí chủ trang trọng trên <em>Bảng Vàng Tấm Lòng Thành</em> ở vị trí dẫn đầu, được hàng nghìn người xem cùng chiêm bái và hoan hỷ trợ duyên trong suốt phiên Live!
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="guide-footer">
              <button class="guide-action-btn" id="btnGuideUnderstood">🙏 ĐÃ HIỂU & HOAN HỶ CHIÊM BÁI</button>
            </div>
          </div>
        </div>'''
assert old_fortune_end in content, 'old_fortune_end not found'
content = content.replace(old_fortune_end, guide_modal_html)

# 4. Add test buttons to quickDock
old_dock_rpc = '''        <button class="dock-btn gold" id="btnRpcGrandCeremony">
          🐉 Đại Lễ Kim Long Chầu Phật (Quà Lớn)
        </button>'''

new_dock_rpc = '''        <button class="dock-btn gold" id="btnRpcGrandCeremony">
          🐉 Đại Lễ Kim Long Chầu Phật (Quà Lớn)
        </button>
        <button class="dock-btn" id="btnRpcWave7" style="margin-top: 6px; background: linear-gradient(135deg, #2b1d0c, #4a3014); border: 1.5px solid #d4af37; color: #ffe599; font-weight: 700;">
          🙏 Test 7 Vị Cùng Lên Thềm Gỗ Hành Lễ
        </button>'''
assert old_dock_rpc in content, 'old_dock_rpc not found'
content = content.replace(old_dock_rpc, new_dock_rpc)

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Successfully updated public/index.html')
