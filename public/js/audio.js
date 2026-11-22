/**
 * TempleAudioEngine
 * - Nhạc nền: Phát trực tiếp file "Nam Mô A Di Đà Phật.m4a" (/assets/bg_chant.m4a) lặp vô tận êm dịu,
 *   tự động hạ nhỏ âm lượng (ducking) khi có giọng đọc lời khấn để không bị đè tiếng hay rè/xước.
 * - Pháp khí: Tổng hợp tiếng Mõ gỗ, Đại Hồng Chung, Ống xăm nhẹ nhàng, không vượt ngưỡng 0dBFS.
 * - Giọng đọc: Hàng đợi ZeroTTS phát tuần tự mượt mà.
 */
class TempleAudioEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.sfxEnabled = true;
    this.bgMusicEnabled = localStorage.getItem('temple_bg_music') !== '0';
    this.ttsEnabled = localStorage.getItem('temple_tts_enabled') !== '0';
    this.ttsVoice = localStorage.getItem('temple_tts_voice') || 'giahuy';

    // Âm lượng mặc định vừa phải, nhẹ nhàng (nhạc 35%, giọng đọc 50%)
    const savedMusicVol = parseFloat(localStorage.getItem('temple_music_vol'));
    const savedTtsVol = parseFloat(localStorage.getItem('temple_tts_vol'));
    this.bgBaseVolume = Number.isFinite(savedMusicVol) ? Math.max(0, Math.min(1, savedMusicVol)) : 0.35;
    this.ttsVolume = Number.isFinite(savedTtsVol) ? Math.max(0, Math.min(1, savedTtsVol)) : 0.50;

    this.useSynthMusicFallback = false;
    this.synthBgTimer = null;
    this.bgMusicChecked = false;
    this.bgMusicAvailable = false;
    this.bgAudio = new Audio();
    this.bgAudio.loop = true;
    this.bgAudio.preload = 'none';
    this.bgAudio.volume = this.bgBaseVolume;
    this.bgAudio.onerror = () => {
      this.useSynthMusicFallback = true;
      this.startDefaultZenSynthLoop();
    };
    this.ttsQueue = [];
    this.ttsPlaying = false;
    this.currentAudio = null;
    this.lastWoodenFishTime = 0;
    this.onTtsStateChange = null;
    this.audioUrlCache = new Map();

    const unlockHandler = () => { this.ensureContext(); };
    ['pointerdown', 'click', 'keydown', 'touchstart'].forEach(evt => {
      if (typeof window !== 'undefined') window.addEventListener(evt, unlockHandler, { once: true, passive: true });
    });
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.unlocked = true;
    if (this.bgMusicEnabled) {
      this.startZenAmbience();
    }
    return this.ctx;
  }

  // --------------------------------------------------------------------------
  // 1. NHẠC NỀN "NAM MÔ A DI ĐÀ PHẬT.M4A" (CÓ AUTO-DUCKING KHI ĐỌC LỜI KHẤN)
  // --------------------------------------------------------------------------
  getDuckedVolume() {
    return Math.max(0.08, +(this.bgBaseVolume * 0.35).toFixed(2));
  }

  setMusicVolume(vol) {
    const v = Math.max(0, Math.min(1, Number(vol)));
    if (!Number.isFinite(v)) return;
    this.bgBaseVolume = v;
    try {
      localStorage.setItem('temple_music_vol', String(v));
    } catch (_) {}
    if (this.bgAudio && !this.useSynthMusicFallback) {
      this.bgAudio.volume = this.ttsPlaying ? this.getDuckedVolume() : this.bgBaseVolume;
    }
  }

  setTtsVolume(vol) {
    const v = Math.max(0, Math.min(1, Number(vol)));
    if (!Number.isFinite(v)) return;
    this.ttsVolume = v;
    try {
      localStorage.setItem('temple_tts_vol', String(v));
    } catch (_) {}
    if (this.currentAudio) {
      this.currentAudio.volume = this.ttsVolume;
    }
  }

  setTtsVoice(voice) {
    const v = String(voice || '').trim().toLowerCase();
    if (!v) return;
    this.ttsVoice = v;
    try {
      localStorage.setItem('temple_tts_voice', v);
    } catch (_) {}
  }

  setEnabledFlags({ ttsEnabled, bgMusicEnabled }) {
    if (typeof ttsEnabled === 'boolean') {
      this.ttsEnabled = ttsEnabled;
      try { localStorage.setItem('temple_tts_enabled', ttsEnabled ? '1' : '0'); } catch (_) {}
    }
    if (typeof bgMusicEnabled === 'boolean') {
      this.bgMusicEnabled = bgMusicEnabled;
      try { localStorage.setItem('temple_bg_music', bgMusicEnabled ? '1' : '0'); } catch (_) {}
    }
  }

  // Dò file nhạc nền 1 lần qua API: có thì phát file, không có thì dùng nhạc thiền tổng hợp.
  // Không gán src trực tiếp để tránh request 404 trong console khi thiếu file.
  async checkBgMusic() {
    if (this.bgMusicChecked) return this.bgMusicAvailable;
    this.bgMusicChecked = true;
    try {
      const res = await fetch('/api/bg-music');
      const data = await res.json();
      this.bgMusicAvailable = Boolean(data?.available && data?.url);
      if (this.bgMusicAvailable) {
        this.bgAudio.src = data.url;
        this.bgAudio.preload = 'auto';
      }
    } catch (_) {
      this.bgMusicAvailable = false;
    }
    if (!this.bgMusicAvailable) {
      this.useSynthMusicFallback = true;
    }
    return this.bgMusicAvailable;
  }

  async startZenAmbience() {
    if (!this.bgMusicEnabled) return;
    await this.checkBgMusic();
    if (!this.bgMusicEnabled) return;
    if (this.useSynthMusicFallback) {
      this.startDefaultZenSynthLoop();
      return;
    }
    try {
      this.bgAudio.volume = this.ttsPlaying ? this.getDuckedVolume() : this.bgBaseVolume;
      if (this.bgAudio.paused) {
        const p = this.bgAudio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            if (this.bgAudio.error) {
              this.useSynthMusicFallback = true;
              this.startDefaultZenSynthLoop();
            }
          });
        }
      }
    } catch (_) {
      this.useSynthMusicFallback = true;
      this.startDefaultZenSynthLoop();
    }
  }

  startDefaultZenSynthLoop() {
    if (!this.bgMusicEnabled || this.synthBgTimer) return;
    const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    let step = 0;
    const playZenNote = () => {
      if (!this.bgMusicEnabled || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const freq = PENTATONIC[step % PENTATONIC.length];
        step++;
        const vol = (this.ttsPlaying ? this.getDuckedVolume() : this.bgBaseVolume) * 0.18;
        if (vol <= 0.002) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(now);
        osc.stop(now + 4.25);
      } catch (_) {}
    };
    playZenNote();
    this.synthBgTimer = setInterval(playZenNote, 3600);
  }

  stopZenAmbience() {
    try {
      this.bgAudio.pause();
    } catch (_) {}
    if (this.synthBgTimer) {
      clearInterval(this.synthBgTimer);
      this.synthBgTimer = null;
    }
  }

  setBgDucking(ducked) {
    if (!this.bgMusicEnabled) return;
    try {
      if (!this.useSynthMusicFallback && this.bgAudio) {
        this.bgAudio.volume = ducked ? this.getDuckedVolume() : this.bgBaseVolume;
      }
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // HỖ TRỢ PHÁT FILE ÂM THANH THẬT (.MP3) VỚI TỰ ĐỘNG FALLBACK BỘ TỔNG HỢP SYNTH
  // --------------------------------------------------------------------------
  playRealAudioOrFallback(key, fallbackFn) {
    if (!this.sfxEnabled) return;
    try {
      const audio = new Audio('/assets/audio/' + key + '.mp3');
      audio.volume = 0.9;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(() => {
          fallbackFn();
        });
      }
    } catch (_) {
      fallbackFn();
    }
  }

  // --------------------------------------------------------------------------
  // 2. TIẾNG MÕ GỖ (ĐÃ TẮT THEO YÊU CẦU: CHỈ DÙNG CHUÔNG ĐỒNG & KHÁNH THANH TỊNH)
  // --------------------------------------------------------------------------
  playWoodenFish(_pitchMultiplier = 1.0) {
    // Hoàn toàn tắt tiếng gõ mõ để tránh loạn âm thanh khi đông người xem
    return;
  }

  synthWoodenFish(_pitchMultiplier = 1.0) {
    return;
  }

  // --------------------------------------------------------------------------
  // 3. TIẾNG ĐẠI HỒNG CHUNG (TEMPLE BRONZE BELL)
  // --------------------------------------------------------------------------
  playTempleBell(intensity = 1.0) {
    if (!this.sfxEnabled) return;
    this.playRealAudioOrFallback('bell', () => {
      this.synthTempleBell(intensity);
    });
  }

  synthTempleBell(intensity = 1.0) {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      const base = 174;
      const partials = [
        { ratio: 0.5, amp: 0.22, decay: 4.2 },
        { ratio: 1.0, amp: 0.35, decay: 3.6 },
        { ratio: 1.506, amp: 0.16, decay: 2.4 },
        { ratio: 2.0, amp: 0.18, decay: 1.9 }
      ];

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.28 * Math.min(1.0, intensity), now);
      master.connect(ctx.destination);

      partials.forEach((p, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base * p.ratio, now);

        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(p.amp, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

        osc.connect(g);
        g.connect(master);
        osc.onended = () => {
          osc.disconnect();
          g.disconnect();
          if (idx === 0) master.disconnect();
        };
        osc.start(now);
        osc.stop(now + p.decay + 0.05);
      });
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 4. TIẾNG THỈNH KHÁNH XIN XĂM (FORTUNE CHIME)
  // --------------------------------------------------------------------------
  playFortuneShake() {
    if (!this.sfxEnabled) return;
    // Ngân vang tiếng khánh thanh tao khi gieo quẻ xăm
    this.playIncenseChime();
  }

  // --------------------------------------------------------------------------
  // 5. TIẾNG CHUÔNG NGỌC DÂNG LỄ / THẮP HƯƠNG (SINGING CHIME)
  // --------------------------------------------------------------------------
  playIncenseChime() {
    if (!this.sfxEnabled) return;
    this.playRealAudioOrFallback('chime', () => {
      this.synthIncenseChime();
    });
  }

  synthIncenseChime() {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const notes = [528, 660];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.10, now + idx * 0.1 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 1.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 1.15);
      });
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 6. ZEROTTS VOICE QUEUE & PREFETCHER
  // --------------------------------------------------------------------------
  unlockAudioBanner() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('audioUnlockOverlay')) return;
    const banner = document.createElement('div');
    banner.id = 'audioUnlockOverlay';
    banner.innerHTML = '🔊 <b>Bật Âm Thanh Chánh Điện</b> <span style="font-size:12px;opacity:0.85;">(Nhấn vào đây để mở khóa âm thanh trình duyệt/OBS)</span>';
    banner.style.cssText = `
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      background: rgba(180, 83, 9, 0.95);
      color: #fff;
      padding: 10px 22px;
      border-radius: 999px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1.5px solid #fef08a;
    `;
    banner.onclick = () => {
      this.ensureContext();
      this.playSilentBuffer();
      banner.remove();
    };
    document.body.appendChild(banner);
  }

  playSilentBuffer() {
    try {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.volume = 0.01;
      silentAudio.play().catch(() => {});
    } catch (_) {}
  }

  enqueueTts(text, options = {}) {
    const onStart = typeof options.onStart === 'function' ? options.onStart : null;
    const onEnd = typeof options.onEnd === 'function' ? options.onEnd : null;
    const priority = options.priority != null ? Number(options.priority) : 1;

    if (!this.ttsEnabled) {
      if (onStart) onStart();
      if (onEnd) setTimeout(onEnd, 3000);
      return;
    }
    const clean = String(text || '').trim();
    if (!clean) {
      if (onStart) onStart();
      if (onEnd) setTimeout(onEnd, 3000);
      return;
    }

    // Chống nhận trùng lặp câu thoại đang có trong hàng đợi
    if (this.ttsQueue.some(i => i.text === clean)) {
      return;
    }

    // Giới hạn hàng đợi tối đa 3 câu khi đông người xem để không dồn ứ âm thanh trễ hàng phút
    if (this.ttsQueue.length >= 3) {
      if (priority === 0) {
        // Ưu tiên cao (quà tặng, thông báo): huỷ câu có độ ưu tiên thấp nhất trong hàng đợi
        const dropIdx = this.ttsQueue.findLastIndex(i => (i.priority || 1) > 0);
        if (dropIdx !== -1) {
          const [dropped] = this.ttsQueue.splice(dropIdx, 1);
          if (dropped?.onStart) dropped.onStart();
          if (dropped?.onEnd) dropped.onEnd();
        }
      } else {
        // Câu bình thường: bỏ qua để tránh trễ dồn
        if (onStart) onStart();
        if (onEnd) onEnd();
        return;
      }
    }

    const item = {
      id: `tts_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: clean,
      voice: (options.voice || this.ttsVoice || 'giahuy').toLowerCase(),
      priority,
      url: options.url || null,
      onStart,
      onEnd,
      fetchPromise: null
    };

    if (!item.url) {
      item.fetchPromise = this.fetchZeroTtsAudio(item.text, item.voice, item.priority);
    }

    if (priority === 0) {
      // Ưu tiên cao: chen lên đầu hàng đợi
      this.ttsQueue.unshift(item);
    } else {
      this.ttsQueue.push(item);
    }
    this.processTtsQueue();
  }

  async fetchZeroTtsAudio(text, voice = 'giahuy', priority = 1) {
    const cleanVoice = (voice || this.ttsVoice || 'giahuy').toLowerCase();
    const cacheKey = `${cleanVoice}::${text}`;
    if (this.audioUrlCache && this.audioUrlCache.has(cacheKey)) {
      return { ok: true, url: this.audioUrlCache.get(cacheKey), cached: true };
    }

    const controller = new AbortController();
    // Timeout 12 giây: nếu server không phản hồi thì bỏ qua ngay để không làm tắc nghẽn phiên live
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (window.TEMPLE_RPC_TOKEN) headers['x-rpc-token'] = window.TEMPLE_RPC_TOKEN;
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({ text, voice: cleanVoice, priority })
      });
      const data = await res.json();
      if (data && data.ok && data.url) {
        if (this.audioUrlCache) this.audioUrlCache.set(cacheKey, data.url);
        return data;
      }
      return { ok: false, error: data?.error || 'ZeroTTS unavailable' };
    } catch (err) {
      return { ok: false, error: err.name === 'AbortError' ? 'ZeroTTS timeout' : err.message };
    } finally {
      clearTimeout(timer);
    }
  }

  speakWebSpeechFallback(text) {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) {
        return resolve();
      }
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'vi-VN';
        utter.rate = 0.95;
        utter.pitch = 1.0;
        utter.volume = this.ttsVolume;

        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find((v) => v.lang && (v.lang.includes('vi') || v.lang.includes('VI')));
        if (viVoice) utter.voice = viVoice;

        let finished = false;
        const onDone = () => {
          if (!finished) {
            finished = true;
            resolve();
          }
        };
        utter.onend = onDone;
        utter.onerror = onDone;
        setTimeout(onDone, 9000);
        window.speechSynthesis.speak(utter);
      } catch (_) {
        resolve();
      }
    });
  }

  async processTtsQueue() {
    if (this.ttsPlaying || this.ttsQueue.length === 0) return;
    this.ttsPlaying = true;
    const item = this.ttsQueue.shift();

    try {
      let audioUrl = item.url;
      if (!audioUrl && item.fetchPromise) {
        const res = await item.fetchPromise;
        if (res && res.ok && res.url) {
          audioUrl = res.url;
        }
      }

      // Dừng dứt khoát mọi âm thanh cũ trước khi phát câu mới để không bao giờ bị chồng tiếng
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }

      if (audioUrl) {
        this.setBgDucking(true);
        if (this.onTtsStateChange) {
          this.onTtsStateChange({ speaking: true, synthesizing: false, text: item.text });
        }
        if (item.onStart) item.onStart();
        await this.playWavUrl(audioUrl);
        if (item.onEnd) item.onEnd();
      } else {
        // Chỉ phát Web Speech khi trình duyệt có giọng đọc tiếng Việt thực thụ
        const voices = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
        const hasViVoice = voices.some((v) => v.lang && (v.lang.toLowerCase().includes('vi-vn') || v.lang.toLowerCase().includes('vi_vn')));

        if (hasViVoice) {
          this.setBgDucking(true);
          if (this.onTtsStateChange) {
            this.onTtsStateChange({ speaking: true, synthesizing: false, text: item.text });
          }
          if (item.onStart) item.onStart();
          await this.speakWebSpeechFallback(item.text);
          if (item.onEnd) item.onEnd();
        } else {
          if (item.onStart) item.onStart();
          if (item.onEnd) item.onEnd();
        }
      }
    } catch (err) {
      console.warn('[ZeroTTS Playback Warning]', err);
      if (item.onStart) item.onStart();
      if (item.onEnd) item.onEnd();
    } finally {
      this.ttsPlaying = false;
      if (this.ttsQueue.length === 0) {
        this.setBgDucking(false);
        if (this.onTtsStateChange) {
          this.onTtsStateChange({ speaking: false, synthesizing: false, text: '' });
        }
      } else {
        setTimeout(() => this.processTtsQueue(), 150);
      }
    }
  }

  stopTts() {
    this.ttsQueue = [];
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_) {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    this.ttsPlaying = false;
    this.setBgDucking(false);
    if (this.onTtsStateChange) {
      this.onTtsStateChange({ speaking: false, synthesizing: false, text: '' });
    }
  }

  playWavUrl(url) {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_) {}
      this.currentAudio = null;
    }
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        this.currentAudio = audio;
        audio.volume = this.ttsVolume;
        let resolved = false;
        let safetyTimer = null;
        const done = () => {
          if (!resolved) {
            resolved = true;
            if (safetyTimer) {
              clearTimeout(safetyTimer);
              safetyTimer = null;
            }
            if (this.currentAudio === audio) {
              this.currentAudio = null;
            }
            resolve();
          }
        };

        // Safety timeout: nếu trình duyệt ẩn tab hoặc onended không bắn, tự động giải phóng sau duration+2s hoặc tối đa 14s
        audio.onloadedmetadata = () => {
          const dur = audio.duration;
          const maxWait = (Number.isFinite(dur) && dur > 0) ? Math.max(3000, Math.min(16000, dur * 1000 + 2000)) : 10000;
          if (safetyTimer) clearTimeout(safetyTimer);
          safetyTimer = setTimeout(done, maxWait);
        };
        safetyTimer = setTimeout(done, 12000);

        audio.onended = done;
        audio.onerror = done;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            console.warn('[Audio play caught]', err.name || err.message);
            if (err.name === 'NotAllowedError') {
              this.unlockAudioBanner();
            }
            done();
          });
        }
      } catch (_) {
        resolve();
      }
    });
  }
}

window.TempleAudioEngine = TempleAudioEngine;
