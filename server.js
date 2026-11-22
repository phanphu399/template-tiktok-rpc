const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const TTS_CACHE_DIR = path.join(DATA_DIR, 'tts-cache');
const STATE_FILE = path.join(DATA_DIR, 'merit-state.json');

// Giọng nam trầm ấm mặc định (ZeroTTS: giahuy). Đổi bằng biến môi trường
// ZEROTTS_VOICE hoặc ngay trong giao diện Admin / bảng điều khiển nhanh.
const DEFAULT_TTS_VOICE = (process.env.ZEROTTS_VOICE || 'giahuy').toLowerCase();
// Danh sách giọng "nam" ưu tiên hiển thị trong bộ chọn (model có nhiều giọng khác).
const MALE_VOICE_ORDER = ['giahuy', 'huuduc', 'quangminh', 'tiendat'];

// Xác thực RPC tuỳ chọn: nếu đặt RPC_TOKEN thì mọi lệnh thay đổi trạng thái
// phải gửi kèm header "x-rpc-token" hoặc "Authorization: Bearer <token>".
// Không đặt biến này = giữ nguyên hành vi cũ (chỉ nên dùng trong LAN).
const RPC_TOKEN = process.env.RPC_TOKEN || '';
const EULER_SIGN_API_KEY = process.env.SIGN_API_KEY || process.env.EULER_API_KEY || '';

fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });

// ============================================================================
// 1. BỘ 10 QUẺ LINH XĂM CHÙA LINH ỨNG (FORTUNE STICKS DECK)
// ============================================================================
const FORTUNE_DECK = [
  {
    number: 1,
    rank: 'Thượng Thượng Cát',
    title: 'Nhật Xuất Đông Phương — Mặt Trời Mọc Phương Đông',
    poem: 'Đông phương nhật xuất chiếu Càn Khôn\nHoa nở đầy cành rạng sắc xuân\nCông danh tài lộc đều viên mãn\nGia đạo bình an phúc lộc tồn.',
    meaning: 'Mọi sự mưu cầu đều đại cát đại lợi. Công việc hanh thông, quý nhân phù trợ, gia đình hòa thuận ấm êm.',
    ttsSummary: 'Quẻ số 1, Thượng Thượng Cát, Nhật Xuất Đông Phương. Mọi sự mưu cầu đều đại cát đại lợi, công danh tài lộc viên mãn, quý nhân phù trợ.'
  },
  {
    number: 8,
    rank: 'Thượng Cát',
    title: 'Kim Liên Khai Nở — Sen Vàng Tỏa Ngát',
    poem: 'Sen vàng nở rộ giữa hồ trong\nHương thơm lan tỏa khắp non sông\nLòng thành thắp nén nhang cầu nguyện\nTrời Phật chứng tri thỏa ước mong.',
    meaning: 'Tâm thiện lành ắt gặp phước báu. Cầu tài đắc tài, cầu bình an đắc bình an, bệnh tật tiêu trừ.',
    ttsSummary: 'Quẻ số 8, Thượng Cát, Kim Liên Khai Nở. Tâm thiện lành ắt gặp phước báu, cầu tài đắc tài, cầu bình an đắc bình an.'
  },
  {
    number: 12,
    rank: 'Đại Cát',
    title: 'Long Vân Tương Hội — Rồng Mây Gặp Gỡ',
    poem: 'Rồng thiêng gặp hội tầng mây xanh\nVượt Vũ Môn Quan rạng rỡ danh\nThí chủ kiên tâm hành thiện đạo\nPhúc dày lộc vượng khắp gia đình.',
    meaning: 'Thời vận đang lên mạnh mẽ. Thi cử đỗ đạt, kinh doanh phát đạt, gặp cơ hội lớn đổi đời.',
    ttsSummary: 'Quẻ số 12, Đại Cát, Long Vân Tương Hội. Thời vận đang lên mạnh mẽ, thi cử đỗ đạt, kinh doanh phát đạt.'
  },
  {
    number: 18,
    rank: 'Thượng Cát',
    title: 'Xuân Phong Đắc Ý — Gió Xuân Thuận Buồm',
    poem: 'Thuận buồm xuôi gió vượt trùng khơi\nBến giác bình yên nắng rạng ngời\nTài lộc dồi dào nhân duyên tốt\nBốn mùa hưng thịnh rộn niềm vui.',
    meaning: 'Đi xa gặp may, buôn bán thuận lợi, tình duyên êm đẹp, người thân mạnh khỏe.',
    ttsSummary: 'Quẻ số 18, Thượng Cát, Xuân Phong Đắc Ý. Thuận buồm xuôi gió, tài lộc dồi dào, nhân duyên tốt đẹp.'
  },
  {
    number: 24,
    rank: 'Trung Cát',
    title: 'Vũ Quá Thiên Thanh — Mưa Tạnh Trời Trong',
    poem: 'Mưa qua trời lại sáng trong ngần\nGian khó lùi xa đón phúc phần\nGiữ vững lòng thành đừng nản chí\nHoa thơm trái ngọt đến mười phân.',
    meaning: 'Khó khăn cũ sắp qua đi, vận may mới đang tới. Hãy kiên nhẫn và giữ tâm bình tĩnh.',
    ttsSummary: 'Quẻ số 24, Trung Cát, Vũ Quá Thiên Thanh. Mưa qua trời lại sáng trong, gian khó lùi xa để đón phúc phần mới.'
  },
  {
    number: 36,
    rank: 'Thượng Thượng Cát',
    title: 'Phúc Tinh Cao Chiếu — Sao Phúc Chiếu Mệnh',
    poem: 'Phúc tinh rực sáng giữa đêm rằm\nTừ bi Phật độ suốt quanh năm\nTài lộc tự nhiên về gõ cửa\nTrăm điều như ý vạn điều lành.',
    meaning: 'Sao Phúc chiếu mạng, tai qua nạn khỏi, tiền tài sung túc, gia đạo hưng long.',
    ttsSummary: 'Quẻ số 36, Thượng Thượng Cát, Phúc Tinh Cao Chiếu. Sao Phúc chiếu mạng, tài lộc tự nhiên gõ cửa, trăm điều như ý.'
  },
  {
    number: 52,
    rank: 'Thượng Cát',
    title: 'Ngọc Xuất Côn Sơn — Ngọc Quý Phát Sáng',
    poem: 'Ngọc quý Côn Sơn tỏa ánh ngời\nBấy lâu rèn giũa nay gặp thời\nTri âm tương ngộ cùng nâng đỡ\nSự nghiệp thăng hoa rạng rỡ đời.',
    meaning: 'Nỗ lực bấy lâu nay sắp được đền đáp xứng đáng. Có người tốt nâng đỡ trong công việc và cuộc sống.',
    ttsSummary: 'Quẻ số 52, Thượng Cát, Ngọc Xuất Côn Sơn. Nỗ lực bấy lâu sắp được đền đáp xứng đáng, sự nghiệp thăng hoa.'
  },
  {
    number: 68,
    rank: 'Đại Cát',
    title: 'Lộc Mã Đồng Hương — Lộc Tài Cùng Tới',
    poem: 'Lộc Mã song hành đến tận nhà\nLàm ăn buôn bán nở như hoa\nTâm thành bố thí thêm công đức\nPhú quý vinh hoa khắp một nhà.',
    meaning: 'Quẻ đại lợi về tài lộc và kinh doanh. Nên làm nhiều việc thiện để phúc đức càng thêm bền vững.',
    ttsSummary: 'Quẻ số 68, Đại Cát, Lộc Mã Đồng Hương. Đại lợi về tài lộc và buôn bán, phú quý vinh hoa khắp một nhà.'
  },
  {
    number: 81,
    rank: 'Thượng Cát',
    title: 'Nguyệt Nhập Trung Thiên — Trăng Rằm Giữa Đỉnh',
    poem: 'Trăng tròn vằng vặc giữa trời thu\nSoi sáng muôn phương sạch mây mù\nTình duyên viên mãn gia đình thuận\nTâm an vạn sự chẳng ưu tư.',
    meaning: 'Tình duyên và gia đạo vô cùng tốt đẹp. Người độc thân dễ gặp ý trung nhân, gia đình thêm tin vui.',
    ttsSummary: 'Quẻ số 81, Thượng Cát, Nguyệt Nhập Trung Thiên. Tình duyên viên mãn, gia đình hòa thuận, tâm an vạn sự lành.'
  },
  {
    number: 99,
    rank: 'Thượng Thượng Cát',
    title: 'Vạn Sự Viên Thành — Cửu Cửu Đại Cát',
    poem: 'Chín tầng mây trắng ánh hào quang\nTừ bi Phật Tổ độ nhân gian\nThí chủ lòng thành dâng lễ bái\nTrọn đời trường thọ hưởng vinh khang.',
    meaning: 'Quẻ tối thượng cát tường. Sức khỏe trường thọ, công danh hiển đạt, vạn sự viên thành.',
    ttsSummary: 'Quẻ số 99, Thượng Thượng Cát, Vạn Sự Viên Thành. Quẻ tối thượng cát tường, sức khỏe trường thọ, vạn sự như ý.'
  }
];

// ============================================================================
// 2. ZEROTTS PYTHON WORKER MANAGER (VOICE: NAM TRẦM ẤM — GIA HUY)
// ============================================================================
class ZeroTTSManager {
  constructor() {
    this.proc = null;
    this.ready = false;
    this.status = 'starting';
    this.voice = DEFAULT_TTS_VOICE;
    this.voices = [DEFAULT_TTS_VOICE];
    this.voiceDetails = [];
    this.model = 'zeroweight-ai/ZeroTTS';
    this.queue = [];           // Hàng đợi tuần tự không để dồn ứ CPU
    this.currentJob = null;     // Job duy nhất đang được Python xử lý
    this.cache = new Map();     // In-memory cache lưu kết quả các câu thoại lặp lại (0ms latency)
    this.inflight = new Map();  // Deduplicate các request giống hệt đang xử lý
    this.reqCounter = 0;
    this.buffer = '';
    this.restartAttempts = 0;
    this.restartTimer = null;
    this.stopping = false;
    this.startWorker();
  }

  resolvePythonBin() {
    const venvWin = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(venvWin)) return venvWin;
    const venvUnix = path.join(__dirname, '.venv', 'bin', 'python');
    if (fs.existsSync(venvUnix)) return venvUnix;
    return process.platform === 'win32' ? 'python' : 'python3';
  }

  startWorker() {
    if (this.stopping) return;
    const pyBin = this.resolvePythonBin();
    const scriptPath = path.join(__dirname, 'tts_worker.py');
    console.log(`[ZeroTTS] Khởi chạy worker với ${pyBin} (Giọng mặc định: ${DEFAULT_TTS_VOICE})...`);

    this.status = 'loading';
    this.ready = false;
    this.buffer = '';

    let proc;
    try {
      proc = spawn(pyBin, ['-X', 'utf8', '-u', scriptPath], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1',
          ZEROTTS_VOICE: DEFAULT_TTS_VOICE
        }
      });
    } catch (err) {
      this.status = 'error';
      console.error('[ZeroTTS] Không spawn được Python:', err.message);
      this.scheduleRestart();
      return;
    }
    this.proc = proc;

    proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      let lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        this.handleWorkerLine(line.trim());
      }
    });

    proc.stderr.on('data', (chunk) => {
      const msg = chunk.toString('utf8').trim();
      if (msg) console.log(`[ZeroTTS stderr] ${msg}`);
    });

    proc.on('error', (err) => {
      console.error('[ZeroTTS] Lỗi tiến trình:', err.message);
      this.status = 'error';
      broadcastNotification('tts.status', this.getStatus());
    });

    proc.on('exit', (code, signal) => {
      console.warn(`[ZeroTTS] Worker thoát (code=${code}, signal=${signal || '-'})`);
      this.ready = false;
      this.status = 'stopped';
      if (this.currentJob) {
        if (this.currentJob.timer) clearTimeout(this.currentJob.timer);
        this.currentJob.resolve({ ok: false, error: 'ZeroTTS worker exited' });
        this.currentJob = null;
      }
      for (const item of this.queue) {
        if (item.timer) clearTimeout(item.timer);
        item.resolve({ ok: false, error: 'ZeroTTS worker exited' });
      }
      this.queue = [];
      this.inflight.clear();
      broadcastNotification('tts.status', this.getStatus());
      if (!this.stopping) this.scheduleRestart();
    });
  }

  // Tự khởi động lại worker khi Python chết (OOM, crash model, cập nhật code...)
  scheduleRestart() {
    if (this.stopping || this.restartTimer) return;
    this.restartAttempts += 1;
    const delay = Math.min(30000, 2000 * Math.pow(1.6, Math.min(this.restartAttempts, 6)));
    console.warn(`[ZeroTTS] Sẽ thử khởi động lại sau ${Math.round(delay / 1000)}s (lần ${this.restartAttempts})`);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.status = 'starting';
      this.startWorker();
    }, delay);
  }

  stop() {
    this.stopping = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.proc) {
      try {
        this.proc.stdin.end();
        this.proc.kill();
      } catch (_) {}
      this.proc = null;
    }
    this.ready = false;
    this.status = 'stopped';
  }

  handleWorkerLine(line) {
    try {
      const msg = JSON.parse(line);
      if (msg.type === 'status') {
        this.status = msg.status;
        this.model = msg.model || this.model;
        broadcastNotification('tts.status', this.getStatus());
      } else if (msg.type === 'ready') {
        this.ready = true;
        this.status = 'ready';
        this.restartAttempts = 0;
        this.voices = Array.isArray(msg.voices) && msg.voices.length ? msg.voices : [DEFAULT_TTS_VOICE];
        this.voiceDetails = Array.isArray(msg.voiceDetails) ? msg.voiceDetails : [];
        // Ưu tiên giọng đang cấu hình, nếu model không có thì lấy giọng nam mặc định
        const wanted = String(state?.settings?.ttsVoice || DEFAULT_TTS_VOICE).toLowerCase();
        this.voice = this.voices.includes(wanted)
          ? wanted
          : (this.voices.includes(DEFAULT_TTS_VOICE) ? DEFAULT_TTS_VOICE : this.voices[0]);
        this.model = msg.model || this.model;
        // Nếu giọng đã lưu không có trong model (hoặc model đổi giọng), đồng bộ lại
        if (state?.settings && state.settings.ttsVoice !== this.voice) {
          state.settings.ttsVoice = this.voice;
          saveState();
        }
        console.log(`[ZeroTTS] Sẵn sàng sau ${msg.loadSec}s! Giọng: ${this.voice} (${this.voices.join(', ')})`);
        broadcastNotification('tts.status', this.getStatus());
        broadcastNotification('temple.state', getPublicState());
        this.pumpQueue();
      } else if (msg.type === 'result' && msg.id != null) {
        if (this.currentJob && this.currentJob.id === msg.id) {
          if (this.currentJob.timer) clearTimeout(this.currentJob.timer);
          const job = this.currentJob;
          this.currentJob = null;

          if (msg.ok && msg.url) {
            const cacheKey = `${job.voice}::${job.text}`;
            if (this.cache.size >= 500) {
              const oldestKey = this.cache.keys().next().value;
              this.cache.delete(oldestKey);
            }
            this.cache.set(cacheKey, msg);
          }

          job.resolve(msg);
          this.pumpQueue();
        }
      } else if (msg.type === 'error') {
        console.error('[ZeroTTS Error]', msg.error);
        this.status = 'error';
        broadcastNotification('tts.status', this.getStatus());
      }
    } catch (err) {
      console.log('[ZeroTTS stdout]', line);
    }
  }

  pumpQueue() {
    if (this.currentJob || this.queue.length === 0) return;
    if (!this.proc || !this.ready) return;

    const job = this.queue.shift();
    this.currentJob = job;

    // Timeout an toàn tuyệt đối (30s): chỉ kích hoạt nếu Python thực sự bị deadlock/treo
    job.timer = setTimeout(() => {
      console.warn(`[ZeroTTS] Job #${job.id} bị treo quá 30s ("${job.text.slice(0, 30)}..."), khởi động lại worker để dọn sạch đường truyền!`);
      const timedOutJob = this.currentJob;
      this.currentJob = null;
      if (timedOutJob) {
        timedOutJob.resolve({ ok: false, error: 'ZeroTTS synthesis timeout' });
      }
      if (this.proc) {
        try { this.proc.kill(); } catch (_) {}
      }
    }, 30000);

    const payload = JSON.stringify({ id: job.id, text: job.text, voice: job.voice }) + '\n';
    try {
      this.proc.stdin.write(payload);
    } catch (err) {
      if (job.timer) clearTimeout(job.timer);
      this.currentJob = null;
      job.resolve({ ok: false, error: `Không gửi được dữ liệu tới ZeroTTS: ${err.message}` });
      this.pumpQueue();
    }
  }

  getStatus() {
    return {
      ready: this.ready,
      status: this.status,
      engine: 'ZeroTTS (zeroweight-ai/ZeroTTS)',
      voice: state?.settings?.ttsVoice || this.voice || DEFAULT_TTS_VOICE,
      voices: this.voices,
      voiceDetails: this.voiceDetails,
      maleVoices: this.voices.filter((v) => MALE_VOICE_ORDER.includes(v)),
      model: this.model,
      queueDepth: this.queue.length,
      isBusy: Boolean(this.currentJob)
    };
  }

  synthesize(text, voiceOverride, priority = 1) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return Promise.resolve({ ok: false, error: 'Empty text' });

    let voice = String(voiceOverride || state?.settings?.ttsVoice || DEFAULT_TTS_VOICE).toLowerCase();
    if (this.voices.length && !this.voices.includes(voice)) {
      voice = this.voices.includes(this.voice) ? this.voice : this.voices[0];
    }
    const dedupKey = `${voice}::${cleanText}`;

    // 1. Nếu đã có trong in-memory cache, trả về tức thì (0ms latency)!
    if (this.cache.has(dedupKey)) {
      const cached = this.cache.get(dedupKey);
      return Promise.resolve({ ...cached, cached: true });
    }

    // 2. Nếu đang có request giống hệt đang xử lý, dùng chung Promise
    if (this.inflight.has(dedupKey)) {
      return this.inflight.get(dedupKey);
    }

    const prio = Number(priority) || 1;
    const promise = new Promise((resolve) => {
      // 3. Quản lý hàng đợi: Tối đa 3 việc chờ để không làm trễ phiên live
      if (this.queue.length >= 3) {
        if (prio === 0) {
          // Ưu tiên cao (Quà tặng, Thông báo trụ trì): Huỷ việc có độ ưu tiên thấp nhất
          const dropIdx = this.queue.findLastIndex(j => j.priority > 0);
          if (dropIdx !== -1) {
            const [dropped] = this.queue.splice(dropIdx, 1);
            if (dropped.timer) clearTimeout(dropped.timer);
            dropped.resolve({ ok: false, error: 'Hàng đợi bận, nhường cho nghi thức quan trọng hơn', dropped: true });
          }
        } else {
          // Độ ưu tiên bình thường hoặc thấp: Loại bỏ ngay lập tức để không gây trễ dồn
          return resolve({ ok: false, error: 'Hàng đợi âm thanh đang bận', dropped: true });
        }
      }

      const id = ++this.reqCounter;
      const job = {
        id,
        text: cleanText,
        voice,
        priority: prio,
        resolve,
        enqueuedAt: Date.now(),
        timer: null
      };

      if (job.priority === 0) {
        const insertIdx = this.queue.findIndex(j => j.priority > 0);
        if (insertIdx === -1) this.queue.push(job);
        else this.queue.splice(insertIdx, 0, job);
      } else {
        this.queue.push(job);
      }

      // Nếu worker đang khởi động, đợi tối đa 12s
      if (!this.ready) {
        const startCheck = Date.now();
        const waitTimer = setInterval(() => {
          if (this.ready) {
            clearInterval(waitTimer);
            this.pumpQueue();
          } else if (Date.now() - startCheck > 12000 || this.status === 'error' || this.status === 'stopped') {
            clearInterval(waitTimer);
            const idx = this.queue.indexOf(job);
            if (idx !== -1) this.queue.splice(idx, 1);
            resolve({ ok: false, error: `ZeroTTS chưa sẵn sàng (${this.status})` });
          }
        }, 250);
        return;
      }

      this.pumpQueue();
    }).finally(() => {
      this.inflight.delete(dedupKey);
    });

    this.inflight.set(dedupKey, promise);
    return promise;
  }
}

// ============================================================================
// 3. TRẠNG THÁI CHÙA ONLINE & BẢNG VÀNG CÔNG ĐỨC
// ============================================================================
const DEFAULT_STATE = {
  totalIncense: 108,
  totalMerit: 1080,
  woodenFishHits: 360,
  bellRings: 36,
  lanternCount: 18,
  fortuneCount: 12,
  activeIncenseSticks: 9,
  haloIntensity: 0.45,
  offerings: {
    lotus: 3,
    fruit: 2,
    lamp: 2,
    dragon: 1
  },
  devotees: {},
  recentEvents: [],
  settings: {
    ttsEnabled: true,
    ttsVoice: DEFAULT_TTS_VOICE,
    bgMusicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.65,
    ttsVolume: 0.95,
    smokeDensity: 1.0,
    autoSim: false,
    autoSimIntervalMs: 9500
  },
  tiktok: {
    connected: false,
    connecting: false,
    username: 'zenfacts_vn',
    roomId: null,
    viewerCount: 0,
    lastError: null
  }
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      const savedSettings = { ...(saved.settings || {}) };
      // Di trú giọng nữ Mai Chi cũ sang giọng nam trầm ấm mặc định
      if (!savedSettings.ttsVoice || String(savedSettings.ttsVoice).toLowerCase() === 'maichi') {
        savedSettings.ttsVoice = DEFAULT_TTS_VOICE;
      }
      return {
        ...DEFAULT_STATE,
        ...saved,
        devotees: saved.devotees || {},
        offerings: { ...DEFAULT_STATE.offerings, ...(saved.offerings || {}) },
        settings: { ...DEFAULT_STATE.settings, ...savedSettings },
        tiktok: { ...DEFAULT_STATE.tiktok }
      };
    }
  } catch (e) {
    console.warn('[State] Không đọc được merit-state.json, dùng mặc định:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let state = loadState();

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const toSave = {
      totalIncense: state.totalIncense,
      totalMerit: state.totalMerit,
      woodenFishHits: state.woodenFishHits,
      bellRings: state.bellRings,
      lanternCount: state.lanternCount,
      fortuneCount: state.fortuneCount,
      activeIncenseSticks: state.activeIncenseSticks,
      offerings: state.offerings,
      devotees: state.devotees,
      settings: state.settings
    };
    fs.promises.writeFile(STATE_FILE, JSON.stringify(toSave, null, 2), 'utf8').catch((e) => {
      console.error('[State] Lỗi lưu file:', e.message);
    });
  }, 1200);
}

function getLeaderboard(limit = 6) {
  return Object.values(state.devotees)
    .sort((a, b) => b.merit - a.merit)
    .slice(0, limit)
    .map((d, index) => ({
      rank: index + 1,
      name: d.name,
      uniqueId: d.uniqueId,
      avatar: d.avatar || '',
      merit: d.merit,
      incense: d.incense || 0,
      lastWish: d.lastWish || ''
    }));
}

function getRecentDevotees(limit = 40) {
  return Object.values(state.devotees)
    .slice(-limit)
    .reverse()
    .map((d, index) => ({
      rank: index + 1,
      name: d.name,
      uniqueId: d.uniqueId,
      avatar: d.avatar || '',
      merit: d.merit,
      incense: d.incense || 0,
      lastWish: d.lastWish || ''
    }));
}

// Giữ bảng thí chủ ở mức hợp lý để file trạng thái và UI không phình vô hạn
const MAX_DEVOTEES = 800;
function pruneDevotees() {
  const entries = Object.entries(state.devotees);
  if (entries.length <= MAX_DEVOTEES) return;
  entries.sort((a, b) => (b[1].merit || 0) - (a[1].merit || 0));
  state.devotees = Object.fromEntries(entries.slice(0, MAX_DEVOTEES));
}
// Bộ lọc chặn ký tự lạ (Cuneiform 𒐫, Zalgo, Braille, ký tự spam) & từ ngữ phản cảm
const WEIRD_SPAM_RE = /[\u1200-\u137F\u2800-\u28FF\u{12000}-\u{123FF}]/u;
const VI_ACCENT_RE = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/;

function formatDevoteeNameForTts(name) {
  let clean = String(name || '').trim();
  if (!clean) return 'thí chủ';

  // 1. Bỏ ký tự @ ở đầu nếu là handle TikTok
  clean = clean.replace(/^@+/, '');

  // 2. Chuyển camelCase thành từ cách nhau (vd: QuynhFinn -> Quynh Finn)
  clean = clean.replace(/([a-zà-ỹ])([A-ZÀ-Ỹ])/g, '$1 $2');

  // 3. Thay thế các ký tự đặc biệt, gạch dưới, chấm bằng khoảng trắng
  clean = clean
    .replace(/[._\-+@#/\\()\[\]{}*&^%$#!~`=<>?|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Nếu là user mặc định kiểu user12345, tiktok_user, hoặc chỉ toàn chữ số
  if (/^(user|tiktok|id)?\d+$/i.test(clean) || /^\d+$/.test(clean) || clean.length < 2) {
    return 'thí chủ';
  }

  // 5. Cắt bỏ các số đuôi năm sinh hoặc số ngẫu nhiên ở cuối (vd: "Quỳnh 2004" -> "Quỳnh", "Minh Tâm 99" -> "Minh Tâm")
  clean = clean.replace(/\s+\d{2,4}$/, '').trim();
  if (!clean || clean.length < 2) {
    return 'thí chủ';
  }

  // 6. Giữ tối đa 3 từ cho tên gọn đẹp, tự nhiên
  const words = clean.split(' ').filter(Boolean);
  if (words.length > 3) {
    clean = words.slice(0, 3).join(' ');
  }

  // 7. Tránh lặp tiền tố xưng hô
  if (/^(thí chủ|thi chu|phật tử|phat tu|bạn|ban)(\s|$)/i.test(clean)) {
    return clean;
  }

  return `thí chủ ${clean}`;
}
const BRACKET_EMOTE_RE = /\[[^\]]{1,24}\]/g;
const ALLOWED_VI_TEXT_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s.,!?]/g;
const ALLOWED_VI_NAME_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s._-]/g;
const VI_LETTER_RE = /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/g;
const BAD_WORDS_RE = /(đá dái|địt|lồn|cặc|buồi|dâm|đụ|đĩ|đm|dcm|clmm|vcl|vl|yamate|kimochi|i cư|lừa đảo|lừa à|te-le gram|telegram|zalo|bố mày|mẹ mày|\bchó\b|\bngu\b|\bmá\b|\bmẹ\b|chửi thề|khốn nạn|hồ chí minh|bác hồ|chính phủ|cộng sản|phản động)/i;

function isBlockedSpamOrToxic(raw) {
  if (!raw) return true;
  const s = String(raw);
  try {
    if (WEIRD_SPAM_RE.test(s)) return true;
  } catch (_) {}
  if (BAD_WORDS_RE.test(s)) return true;
  return false;
}

function sanitizeUserName(rawName) {
  const normalized = String(rawName || '')
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_NAME_RE, ' ')
    .replace(/(.)\1{3,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 26);

  if (!normalized || BAD_WORDS_RE.test(normalized)) {
    return 'Thí Chủ Hữu Duyên';
  }
  const letters = normalized.match(VI_LETTER_RE) || [];
  if (letters.length < 2) {
    return 'Thí Chủ Hữu Duyên';
  }
  return normalized;
}

function sanitizeWishText(rawWish) {
  if (!rawWish) return '';
  const cleaned = String(rawWish)
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_TEXT_RE, ' ')
    .replace(/([.,!?])\1+/g, '$1')
    .replace(/(.)\1{2,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .replace(/^[.,!?\s-]+|[.,!?\s-]+$/g, '')
    .slice(0, 120);

  if (!cleaned || BAD_WORDS_RE.test(cleaned)) return '';
  const letters = cleaned.match(VI_LETTER_RE) || [];
  if (letters.length < 2) return '';
  return cleaned;
}

function sanitizeGiftName(rawName, fallback) {
  const cleaned = String(rawName || '')
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_TEXT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
  return cleaned || fallback;
}

// Danh sách người xem hiện diện trong phiên Live hiện tại (tránh tràn 48 người lịch sử cũ)
const sessionDevoteesMap = new Map();

function registerSessionDevotee(name, uniqueId, avatar) {
  const cleanName = sanitizeUserName(name);
  const key = uniqueId || cleanName;
  if (!key) return;
  sessionDevoteesMap.set(key, {
    name: cleanName,
    uniqueId: uniqueId || cleanName.toLowerCase().replace(/\s+/g, ''),
    avatar: avatar || '',
    lastActive: Date.now()
  });
  if (sessionDevoteesMap.size > 80) {
    const oldestKey = sessionDevoteesMap.keys().next().value;
    sessionDevoteesMap.delete(oldestKey);
  }
}

function getSessionDevotees(limit = 48) {
  return Array.from(sessionDevoteesMap.values())
    .sort((a, b) => b.lastActive - a.lastActive)
    .slice(0, limit);
}

function recordDevotee(user, uniqueId, avatar, meritDelta, incenseDelta = 0, giftDelta = 0, wish = '') {
  const displayName = sanitizeUserName(user || uniqueId);
  registerSessionDevotee(displayName, uniqueId, avatar);
  const cleanWish = sanitizeWishText(wish);
  const key = (uniqueId || displayName).slice(0, 40);
  if (!state.devotees[key]) {
    state.devotees[key] = {
      name: displayName,
      uniqueId: uniqueId || displayName.toLowerCase().replace(/\s+/g, ''),
      avatar: avatar || '',
      merit: 0,
      incense: 0,
      gifts: 0,
      lastWish: ''
    };
  }
  const dev = state.devotees[key];
  dev.name = displayName;
  if (avatar) dev.avatar = avatar;
  dev.merit += meritDelta;
  dev.incense += incenseDelta;
  dev.gifts += giftDelta;
  if (cleanWish) dev.lastWish = cleanWish;

  state.totalMerit += meritDelta;
  state.haloIntensity = Math.min(1.0, 0.35 + (state.totalMerit % 1000) / 1400);
  if (Object.keys(state.devotees).length > MAX_DEVOTEES) pruneDevotees();
  return dev;
}

function pushEventLog(evt) {
  const entry = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...evt
  };
  state.recentEvents.unshift(entry);
  if (state.recentEvents.length > 35) {
    state.recentEvents.length = 35;
  }
  return entry;
}

function getPublicState() {
  return {
    totalIncense: state.totalIncense,
    totalMerit: state.totalMerit,
    woodenFishHits: state.woodenFishHits,
    bellRings: state.bellRings,
    lanternCount: state.lanternCount,
    fortuneCount: state.fortuneCount,
    activeIncenseSticks: state.activeIncenseSticks,
    haloIntensity: state.haloIntensity,
    offerings: state.offerings,
    leaderboard: getLeaderboard(48),
    recentDevotees: getRecentDevotees(40),
    sessionDevotees: getSessionDevotees(48),
    recentEvents: state.recentEvents.slice(0, 15),
    settings: state.settings,
    tiktok: state.tiktok,
    tts: zeroTts ? zeroTts.getStatus() : { ready: false, status: 'init', voice: DEFAULT_TTS_VOICE }
  };
}

// ============================================================================
// HỆ THỐNG LỜI CHÚC PHẬT PHÁP ĐA DẠNG & TRANG NGHIÊM (DIVERSE BLESSINGS ENGINE)
// - Đa dạng hoá lời chúc, không lặp lại câu vừa đọc
// - Ngắn gọn, súc tích (50-80 ký tự) để ZeroTTS tổng hợp siêu tốc (<1.3s)
// - Mang đậm ngôn phong Phật giáo trang nghiêm, an lạc, hoan hỷ
// ============================================================================
const blessingHistoryMap = new Map();

function getDiverseBlessing(category, builderList, context) {
  if (!builderList || builderList.length === 0) return '';
  let history = blessingHistoryMap.get(category);
  if (!history) {
    history = [];
    blessingHistoryMap.set(category, history);
  }
  const availableIndices = [];
  for (let i = 0; i < builderList.length; i++) {
    if (!history.includes(i)) availableIndices.push(i);
  }
  const pool = availableIndices.length > 0 ? availableIndices : Array.from({ length: builderList.length }, (_, i) => i);
  const chosenIndex = pool[Math.floor(Math.random() * pool.length)];
  history.push(chosenIndex);
  if (history.length > Math.min(6, builderList.length - 1)) {
    history.shift();
  }
  const builder = builderList[chosenIndex];
  return typeof builder === 'function' ? builder(context) : builder;
}

function detectWishTopic(text) {
  const s = toAsciiLower(text);
  if (/\b(thi|hoc|do dat|nguyen vong|tot nghiep|bang gioi|hoc bong|qua mon|on thi|diem cao|cap 3|dai hoc|ielts|toeic|lop 10|si tu|truong y|bach khoa)\b/.test(s)) {
    return 'study';
  }
  if (/\b(cong viec|kpi|di lam|phong van|xin viec|sep|dong nghiep|tang luong|thang chuc|su nghiep|cong danh|hop dong|thu viec|bien che)\b/.test(s)) {
    return 'career';
  }
  if (/\b(chot don|buon ban|ban hang|khach|kinh doanh|dat hang|tien ve|tai loc|phat tai|tai tan bao|giau|tien vo|doanh so|dat khach|mua may ban dat)\b/.test(s)) {
    return 'business';
  }
  if (/\b(tinh duyen|thoat e|nguoi yeu|tri ky|nguoi thuong|ket hon|lay chong|lay vo|duyen lanh|ban doi|hon nhan|nguoi yeu cu|gap duyen)\b/.test(s)) {
    return 'love';
  }
  if (/\b(ngu ngon|overthinking|chua lanh|healing|lo au|tram cam|met moi|ap luc|tam an|buong bo|thanh than|an nhien|nang luong|mat ngu|met)\b/.test(s)) {
    return 'healing';
  }
  if (/\b(cha me|bo me|ong ba|con cai|con yeu|gia dinh|gia dao|bao hieu|khoi benh|suc khoe|manh khoe|truong tho|binh phuc|tai qua nan khoi)\b/.test(s)) {
    return 'family';
  }
  return 'general';
}

const TOPIC_BLESSINGS = {
  study: [
    ({ name }) => `Thầy kính chúc ${name} tâm trí sáng suốt, trí tuệ mở mang, thi cử hanh thông, tương lai rạng ngời như ý!`,
    ({ name }) => `Nguyện Tam Bảo gia hộ cho ${name} học sâu hiểu rộng, làm bài tự tin, thi đâu đỗ đó, danh đề bảng vàng!`,
    ({ name }) => `Chúc ${name} tâm an trí sáng, vượt qua mọi thử thách học vấn, đón trọn niềm vui đỗ đạt ước mơ!`,
    ({ name }) => `Cầu cho ${name} công thành danh toại, trí tuệ khai hoa, con đường học vấn rộng mở, tương lai tươi sáng!`
  ],
  career: [
    ({ name }) => `Thầy kính chúc ${name} công việc hanh thông, sự nghiệp thăng hoa, gặp quý nhân nâng đỡ, tài lộc dồi dào!`,
    ({ name }) => `Nguyện Tam Bảo gia hộ cho ${name} làm việc gì cũng xuôi chèo mát mái, đồng nghiệp tin yêu, tiền tài tấn tới!`,
    ({ name }) => `Chúc ${name} vững vàng bản lĩnh, vượt qua mọi áp lực, công danh ngày càng rộng mở, lương thưởng đủ đầy!`,
    ({ name }) => `Cầu chúc cho con đường sự nghiệp của ${name} ngày càng vững chãi, tài năng tỏa sáng, vạn sự thành công!`
  ],
  business: [
    ({ name }) => `Thầy kính chúc ${name} kinh doanh thuận buồm xuôi gió, buôn may bán đắt, tài lộc dồi dào, tiền tài tấn tới!`,
    ({ name }) => `Nguyện chư Phật gia hộ cho công việc làm ăn của ${name} ngày càng hưng thịnh, khách quý tin yêu, lộc tài vững bền!`,
    ({ name }) => `Chúc ${name} mua may bán đắt, vạn sự hanh thông, hàng đi tiền về suôn sẻ, làm ăn phát đạt ấm no!`,
    ({ name }) => `Cầu chúc cho cơ nghiệp của ${name} ngày càng phát triển, uy tín lan xa, quý nhân tương trợ, tài lộc sum vầy!`
  ],
  love: [
    ({ name }) => `Chúc ${name} duyên lành hội tụ, gặp được người chân thành thấu hiểu, cùng nhau sẻ chia buồn vui, hạnh phúc bền lâu!`,
    ({ name }) => `Nguyện cho ${name} tình cảm vuông tròn, tìm được bến đỗ bình an của cuộc đời, tâm hồn luôn ấm áp an vui!`,
    ({ name }) => `Cầu cho nhân duyên của ${name} luôn tốt đẹp, gặp người biết trân trọng nâng niu, xây đắp tương lai hòa thuận!`,
    ({ name }) => `Chúc ${name} tâm hồn an yên, sớm tìm thấy tri kỷ đồng điệu, cuộc sống ngập tràn yêu thương và tiếng cười!`
  ],
  healing: [
    ({ name }) => `Tâm an thì vạn sự an. Thầy chúc ${name} buông bỏ mọi muộn phiền, tối nay ngủ thật ngon, thức dậy ngập tràn năng lượng mới!`,
    ({ name }) => `Nơi cửa Phật thanh tịnh, cầu cho tâm hồn ${name} luôn an yên nhẹ nhõm, xua tan áp lực, mỗi ngày đều là một ngày hạnh phúc!`,
    ({ name }) => `Điều gì qua rồi hãy nhẹ nhàng buông tay. Thầy chúc ${name} tìm thấy bình yên tự đáy lòng, cuộc sống luôn thanh thản an nhiên!`,
    ({ name }) => `Hít vào tâm tĩnh lặng, thở ra miệng mỉm cười. Chúc ${name} luôn an lạc, yêu đời và đón nhận vạn điều tốt lành!`
  ],
  family: [
    ({ name }) => `Kính chúc gia đình ${name} trên thuận dưới hòa, cha mẹ mạnh khỏe trường thọ, con cháu hiếu thảo, gia quyến bình an!`,
    ({ name }) => `Nguyện Tam Bảo che chở cho người thân của ${name} thân thể an khang, tai qua nạn khỏi, bệnh tật tiêu trừ, phúc thọ miên viễn!`,
    ({ name }) => `Một nén tâm hương dâng Phật mười phương. Cầu chúc cho mái ấm của ${name} luôn ấm êm, tràn ngập tiếng cười và hỷ lạc!`,
    ({ name }) => `Cảm tạ tấm lòng hiếu nghĩa của ${name}. Chúc cho gia đình thí chủ phúc đức sâu dày, con cháu thành đạt, gia đạo hưng thịnh!`
  ],
  general: [
    ({ name }) => `Nam Mô A Di Đà Phật. Thầy kính chúc ${name} thân tâm thường an lạc, trí tuệ sáng suốt, vạn sự hanh thông, sở cầu như ý!`,
    ({ name }) => `Lành thay thiện niệm của ${name}. Cầu xin Tam Bảo gia hộ cho thí chủ cùng gia quyến luôn bình an, bốn mùa an khang!`,
    ({ name }) => `Tâm an thì vạn sự an. Thầy chúc ${name} cuộc sống luôn nhẹ nhàng thanh thản, gặp nhiều duyên lành và ngập tràn niềm vui!`,
    ({ name }) => `Một nén tâm hương kết vạn niềm phúc. Kính chúc ${name} tai ách tiêu trừ, phước đức tăng trưởng, công việc thuận buồm xuôi gió!`,
    ({ name }) => `Cảm tạ tấm lòng hướng Phật của ${name}. Nguyện chúc thí chủ đi đâu cũng có quý nhân nâng đỡ, mọi sự mưu cầu đều cát tường!`,
    ({ name }) => `Ánh từ quang soi chiếu muôn nơi. Thầy cầu chúc cho ${name} tâm hồn luôn thanh tịnh, gia đạo ấm êm, phúc lộc vững bền!`,
    ({ name }) => `Hữu duyên tương ngộ chốn thiền môn. Chúc ${name} buông bỏ mọi phiền muộn, mỗi ngày trôi qua đều là một ngày bình an may mắn!`,
    ({ name }) => `Tri ân lời nguyện lành của ${name}. Kính chúc thí chủ sức khỏe dồi dào, sở nguyện sớm thành, vạn sự viên mãn!`
  ]
};

function getContextualBlessing(name, wish) {
  const topic = detectWishTopic(wish);
  const list = TOPIC_BLESSINGS[topic] || TOPIC_BLESSINGS.general;
  return getDiverseBlessing(`topic_${topic}`, list, { name, wish });
}

const GIFT_BLESSINGS = [
  ({ name, gift }) => `Công đức vô lượng! Tri ân tấm lòng thơm thảo của ${name} dâng cúng ${gift}. Thầy kính chúc thí chủ thân tâm an lạc, tài lộc hanh thông, vạn sự như ý!`,
  ({ name, gift }) => `Lành thay thiện niệm của ${name} dâng cúng ${gift}. Một phần phát tâm, muôn phần phước báu. Nguyện cho thí chủ công việc thăng hoa, gia đạo ấm êm!`,
  ({ name, gift }) => `Cảm tạ ${name} đã phát tâm cúng dường ${gift} lên Tam Bảo. Kính chúc thí chủ tâm an trí sáng, tai ương hóa giải, cuộc sống ngập tràn hỷ lạc!`,
  ({ name, gift }) => `Nam Mô Hoan Hỷ Tạng Bồ Tát. Tri ân tấm lòng vàng của ${name} dâng ${gift}. Chúc thí chủ mọi sự mưu cầu đều cát tường, tiền tài sung túc!`,
  ({ name, gift }) => `Ánh từ quang chư Phật mười phương chứng tri lòng thành của ${name} dâng ${gift}. Cầu chúc cho gia quyến thí chủ luôn mạnh khỏe, phúc thọ tăng long!`,
  ({ name, gift }) => `Cảm tạ ${name} đã gieo duyên lành cúng dường ${gift}. Nguyện cầu chư Phật gia hộ cho mọi ước nguyện của thí chủ sớm thành hiện thực tốt đẹp!`,
  ({ name, gift }) => `Tri ân sâu sắc tấm lòng thiện lành của ${name} dâng ${gift}. Chúc thí chủ công thành danh toại, phước đức sâu dày, gia đạo thuận hòa yên ấm!`,
  ({ name, gift }) => `Đóa hoa tâm nở rộ nơi cửa Phật. Cảm tạ ${name} dâng ${gift}. Thầy chúc thí chủ mỗi ngày đều an vui, may mắn ngập tràn, vạn điều như ý!`,
  ({ name, gift }) => `Công đức thù thắng! Cảm tạ ${name} phát tâm dâng ${gift}. Nguyện hồng ân Tam Bảo che chở cho thí chủ thân tâm an lạc, tài lộc vững bền!`,
  ({ name, gift }) => `Lành thay tâm thiện của ${name} dâng ${gift}. Cầu cho cha mẹ thí chủ trường thọ bình an, gia đình hưng vượng, bốn mùa cát tường!`
];

const INCENSE_BLESSINGS = [
  ({ name, wish }) => `Khói trầm quyện tỏa Tam Bảo chứng tri. Tri ân ${name} dâng hương. Cầu chúc thí chủ thân tâm an lạc, vạn sự hanh thông: ${wish}!`,
  ({ name, wish }) => `Một nén tâm hương, muôn phần phước báu. Cảm tạ ${name} thành tâm hướng Phật. Chúc thí chủ gia đạo bình an, sở cầu như ý!`,
  ({ name, wish }) => `Nam Mô A Di Đà Phật. Chứng tri lòng thành của ${name} dâng nén hương thơm. Kính chúc thí chủ tai qua nạn khỏi, phúc lộc vững bền!`,
  ({ name, wish }) => `Hương trầm thơm ngát mười phương. Kính chúc ${name} bốn mùa an khang, quý nhân phù trợ, công việc thuận buồm xuôi gió!`,
  ({ name, wish }) => `Lành thay ${name} dâng hương bái Phật cầu an. Nguyện cho lời nguyện lành của thí chủ sớm ngày viên mãn cát tường!`,
  ({ name, wish }) => `Gieo một duyên lành nơi cửa Phật. Cầu chúc cho ${name} cùng gia quyến luôn mạnh khỏe, tâm an trí sáng, ngập tràn hỷ lạc!`,
  ({ name, wish }) => `Tâm thành Phật chứng. Thầy kính chúc ${name} thân thể an khang, tài lộc hanh thông, mọi sự mưu cầu đều đơm hoa kết trái!`
];

const COMMENT_BLESSINGS = [
  ({ name, wish }) => getContextualBlessing(name, wish),
  ({ name, wish }) => `Nam Mô A Di Đà Phật. Chứng tri lòng thành của ${name}: ${wish}. Kính chúc thí chủ thân tâm an lạc, vạn sự cát tường!`,
  ({ name, wish }) => `Cảm tạ thiện niệm của ${name}. Cầu cho sở nguyện ${wish} sớm ngày viên mãn, cuộc sống ngập tràn phước lành!`,
  ({ name, wish }) => `Tri ân lời nguyện lành của ${name}. Chúc thí chủ tâm an trí sáng, phúc đức sâu dày, gia đạo an vui!`
];

const LIKE_BLESSINGS = [
  ({ name }) => `Cảm tạ ${name} hoan hỷ thả tim kết duyên lành cùng đạo tràng. Kính chúc thí chủ thân tâm thường an lạc!`,
  ({ name }) => `Tri ân ${name} đã thả tim kính lễ mười phương chư Phật. Chúc thí chủ vạn sự hanh thông, an khang cát tường!`,
  ({ name }) => `Lành thay công đức thả tim gieo duyên bái Phật của ${name}. Cầu cho thí chủ luôn gặp nhiều may mắn phúc lành!`,
  ({ name }) => `Cảm tạ ${name} hoan hỷ trợ duyên, kính chúc thí chủ tâm an trí sáng, bốn mùa bình an tươi sáng!`,
  ({ name }) => `Tấm lòng hướng Phật, phước báu vô biên. Tri ân ${name} đã thả tim trợ duyên cho phòng Live thanh tịnh!`,
  ({ name }) => `Hoan hỷ tán thán công đức của ${name}. Thầy kính chúc thí chủ mọi sự như ý, gia đạo ấm êm hạnh phúc!`
];

const NEWCOMER_BLESSINGS = [
  ({ name }) => `Chào mừng ${name} đã quang lâm Chánh Điện bái Phật. Kính chúc thí chủ một ngày tràn đầy hỷ lạc và bình an!`,
  ({ name }) => `Hoan hỷ đón chào ${name} hữu duyên ghé thăm Chùa Online. Cầu chúc cho thí chủ vạn sự hanh thông, phúc đức tròn đầy!`,
  ({ name }) => `Kính chào ${name}. Nguyện cầu ánh từ quang chư Phật soi chiếu che chở cho thí chủ cùng gia quyến bình an!`,
  ({ name }) => `Chào mừng thiện nam tín nữ ${name} về nơi cửa thiền thanh tịnh. Chúc thí chủ buông bỏ âu lo, tâm hồn nhẹ nhõm!`,
  ({ name }) => `Hữu duyên tương ngộ nơi Tam Bảo, kính chúc ${name} thân thể an khang, sở cầu như ý, vạn điều tốt lành!`,
  ({ name }) => `Nam Mô A Di Đà Phật. Chào mừng ${name} đã về bái Phật cầu an. Chúc thí chủ cuộc sống ngập tràn an vui!`
];

const BELL_BLESSINGS = [
  ({ name, wish }) => `Tiếng chuông Đại Hồng Chung ngân vang, phiền não tiêu tan, trí tuệ sáng ngời. Thầy chúc ${name} thân tâm thanh tịnh, vạn sự an nhiên!`,
  ({ name, wish }) => `Chuông chùa ngân nga mười phương chứng tri. Cảm tạ ${name} thỉnh chuông cầu nguyện: ${wish}. Cầu cho tai ách hóa cát tường!`,
  ({ name, wish }) => `Âm ba chuông đồng thức tỉnh lòng người. Kính chúc ${name} cùng gia quyến luôn bình an, mạnh khỏe, sở cầu như ý!`,
  ({ name, wish }) => `Tiếng chuông Bát Nhã ngân vang dẫn lối. Cầu chúc cho ${name} tâm an trí sáng, công việc thuận buồm xuôi gió, phúc lộc vững bền!`,
  ({ name, wish }) => `Thỉnh một tiếng chuông, tiêu muôn vàn phiền não. Chúc ${name} buông bỏ mọi âu lo, cuộc sống ngập tràn hỷ lạc và bình yên!`
];

const PRAYER_BLESSINGS = [
  ({ name, wish }) => `Ánh hoa đăng lung linh dâng lên Tam Bảo. Nguyện cho lời ước nguyện của ${name}: ${wish} sớm ngày thành tựu viên mãn!`,
  ({ name, wish }) => `Thả ngọn đèn đăng gửi trọn tâm thành. Thầy kính chúc ${name} thân tâm an lạc, tai qua nạn khỏi, gia đạo thuận hòa yên ấm!`,
  ({ name, wish }) => `Hoa đăng tỏ rạng dẫn lối bình an. Cầu cho sở nguyện của ${name} đơm hoa kết trái, cuộc đời ngập tràn ánh sáng và may mắn!`,
  ({ name, wish }) => `Một ngọn đèn lưu ly, vạn lời nguyện ước. Cảm tạ ${name} thành tâm hướng Phật, chúc thí chủ vạn sự cát tường hanh thông!`,
  ({ name, wish }) => `Nguyện ánh sáng hoa đăng soi đường dẫn lối cho ${name}. Chúc thí chủ luôn gặp quý nhân phù trợ, hạnh phúc đong đầy!`
];

// ============================================================================
// 4. NGHI THỨC TƯƠNG TÁC (RITUAL HANDLERS)
// ============================================================================
const Rituals = {
  burnIncense(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(9, Number(params.count) || 3));
    const wish = sanitizeWishText(params.wish) || 'Thành tâm dâng hương bái Phật, cầu bình an cát tường';
    const merit = count * 5;

    state.totalIncense += count;
    state.activeIncenseSticks = Math.min(36, state.activeIncenseSticks + count);
    const devotee = recordDevotee(user, uniqueId, avatar, merit, count, 0, wish);

    const ttsDevoteeName = formatDevoteeNameForTts(devotee.name);
    const defaultTts = getDiverseBlessing('incense', INCENSE_BLESSINGS, {
      name: ttsDevoteeName,
      count,
      wish
    });
    const ttsText = params.readTts === false
      ? ''
      : (params.customTts || defaultTts);

    const event = pushEventLog({
      type: 'burnIncense',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      count,
      merit,
      wish,
      ttsText,
      ttsPriority: 0,
      ttsVoice: state.settings.ttsVoice || DEFAULT_TTS_VOICE
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  likeBow(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const merit = 5;

    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0, 'Thả tim kính lễ Đức Phật');
    const ttsDevoteeName = formatDevoteeNameForTts(devotee.name);
    const defaultTts = getDiverseBlessing('like', LIKE_BLESSINGS, {
      name: ttsDevoteeName
    });
    const ttsText = params.readTts ? defaultTts : '';

    const event = pushEventLog({
      type: 'likeBow',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      merit,
      wish: 'Thả tim kính lễ Đức Phật',
      ttsText,
      ttsVoice: state.settings.ttsVoice || DEFAULT_TTS_VOICE
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  newcomerBow(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const merit = 2;

    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0, 'Quang lâm Chánh Điện bái Phật');
    const ttsDevoteeName = formatDevoteeNameForTts(devotee.name);
    const defaultTts = getDiverseBlessing('newcomer', NEWCOMER_BLESSINGS, {
      name: ttsDevoteeName
    });
    const ttsText = params.readTts ? defaultTts : '';

    const event = pushEventLog({
      type: 'newcomerBow',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      merit,
      wish: 'Quang lâm Chánh Điện bái Phật',
      ttsText,
      ttsVoice: state.settings.ttsVoice || DEFAULT_TTS_VOICE
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  strikeWoodenFish(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(50, Number(params.count) || 1));
    const merit = count;

    state.woodenFishHits += count;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0);

    const event = pushEventLog({
      type: 'strikeWoodenFish',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      count,
      merit,
      ttsText: params.ttsText || ''
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  ringBell(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(9, Number(params.count) || 1));
    const wish = sanitizeWishText(params.wish) || 'Thỉnh chuông Bát Nhã, phiền não tiêu tan, trí tuệ sáng ngời';
    const merit = count * 10;

    state.bellRings += count;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0, wish);

    const ttsDevoteeName = formatDevoteeNameForTts(devotee.name);
    const defaultTts = getDiverseBlessing('bell', BELL_BLESSINGS, {
      name: ttsDevoteeName,
      wish
    });
    const ttsText = params.readTts ? defaultTts : '';

    const event = pushEventLog({
      type: 'ringBell',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      count,
      merit,
      wish,
      ttsText,
      ttsPriority: 0,
      ttsVoice: state.settings.ttsVoice || DEFAULT_TTS_VOICE
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  sendPrayer(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const wish = sanitizeWishText(params.wish) || 'Cầu cho quốc thái dân an, gia đình mạnh khỏe hạnh phúc';
    const merit = 10;

    state.lanternCount += 1;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 1, 0, wish);

    const defaultTts = getDiverseBlessing('prayer', PRAYER_BLESSINGS, {
      name: devotee.name,
      wish
    });
    const ttsText = params.readTts === false ? '' : defaultTts;

    const event = pushEventLog({
      type: 'sendPrayer',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      wish,
      merit,
      ttsText,
      ttsVoice: state.settings.ttsVoice || DEFAULT_TTS_VOICE
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  offerGift(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const coins = Math.max(1, Number(params.coins) || 10);
    const giftType = ['lotus', 'fruit', 'lamp', 'dragon'].includes(params.giftType)
      ? params.giftType
      : (coins >= 100 ? 'dragon' : coins >= 20 ? 'fruit' : coins >= 5 ? 'lamp' : 'lotus');

    const giftLabels = {
      lotus: 'Đài Hoa Sen Vàng',
      fruit: 'Mâm Ngũ Quả Cát Tường',
      lamp: 'Đèn Lưu Ly Trí Tuệ',
      dragon: 'Đại Lễ Kim Long Chầu Phật'
    };
    const giftName = sanitizeGiftName(params.giftName, giftLabels[giftType]);
    const multiplier = coins >= 100 ? 50 : coins >= 10 ? 30 : 20;
    const merit = Math.max(20, Math.round(coins * multiplier));

    state.offerings[giftType] = (state.offerings[giftType] || 0) + 1;
    state.totalIncense += 3;
    state.activeIncenseSticks = Math.min(36, state.activeIncenseSticks + 3);

    const wish = sanitizeWishText(params.wish) || `Dâng cúng ${giftName} lên Tam Bảo`;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 3, 1, wish);

    const ttsDevoteeName = formatDevoteeNameForTts(devotee.name);
    const defaultTts = getDiverseBlessing('gift', GIFT_BLESSINGS, {
      name: ttsDevoteeName,
      gift: giftName
    });
    const ttsText = params.readTts === false
      ? ''
      : (params.customTts || defaultTts);

    const event = pushEventLog({
      type: giftType === 'dragon' ? 'grandCeremony' : 'offerGift',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      giftType,
      giftName,
      coins,
      merit,
      wish,
      ttsText,
      ttsPriority: 0,
      ttsVoice: state.settings.ttsVoice || DEFAULT_TTS_VOICE
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  drawFortune(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const topic = sanitizeWishText(params.topic) || 'Gia đạo, Tài lộc và Bình an';
    const fortune = FORTUNE_DECK[Math.floor(Math.random() * FORTUNE_DECK.length)];
    const merit = 10;

    state.fortuneCount += 1;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0, `Xin xăm: Quẻ số ${fortune.number} (${fortune.rank})`);

    const ttsDevoteeName = formatDevoteeNameForTts(devotee.name);
    const ttsText = params.readTts === false
      ? ''
      : `${ttsDevoteeName} vừa gieo được ${fortune.ttsSummary}`;

    const event = pushEventLog({
      type: 'drawFortune',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      topic,
      fortune,
      merit,
      ttsText,
      ttsVoice: state.settings.ttsVoice || DEFAULT_TTS_VOICE
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  grandCeremony(params = {}) {
    return this.offerGift({
      ...params,
      giftType: 'dragon',
      coins: Math.max(100, Number(params.coins) || 199),
      giftName: params.giftName || 'Đại Lễ Hào Quang Vạn Trượng'
    });
  },

  adminNotice(params = {}) {
    const title = String(params.title || 'THÔNG BÁO TỪ CHÙA LINH ỨNG').trim().slice(0, 80);
    const message = String(params.message || params.content || '').trim().slice(0, 500);
    const priority = ['high', 'normal', 'urgent'].includes(params.priority) ? params.priority : 'normal';
    const duration = params.duration ? Math.max(5000, Math.min(60000, Number(params.duration))) : 0;
    const readTts = params.readTts !== false;

    if (!message) {
      throw new Error('Nội dung thông báo không được để trống');
    }

    let ttsText = '';
    if (readTts) {
      const fullText = `${title}. ${message}`.trim();
      ttsText = fullText.length > 160 ? fullText.slice(0, 160).replace(/[.,;!?]\s*[^.,;!?]*$/, '') + '.' : fullText;
    }

    const event = pushEventLog({
      type: 'adminNotice',
      title,
      message,
      priority,
      duration,
      ttsText,
      ttsPriority: 0,
      ttsVoice: state.settings.ttsVoice || DEFAULT_TTS_VOICE
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  updateSettings(params = {}) {
    const next = { ...state.settings };
    const boolKeys = ['ttsEnabled', 'bgMusicEnabled', 'sfxEnabled', 'autoSim'];
    const numKeys = { musicVolume: [0, 1], ttsVolume: [0, 1], smokeDensity: [0, 2] };

    for (const key of boolKeys) {
      if (typeof params[key] === 'boolean') next[key] = params[key];
    }
    for (const [key, [min, max]] of Object.entries(numKeys)) {
      const v = Number(params[key]);
      if (Number.isFinite(v)) next[key] = Math.max(min, Math.min(max, v));
    }
    if (Number.isFinite(Number(params.autoSimIntervalMs))) {
      next.autoSimIntervalMs = Math.max(3000, Math.min(120000, Number(params.autoSimIntervalMs)));
    }
    if (typeof params.ttsVoice === 'string') {
      const wanted = params.ttsVoice.trim().toLowerCase();
      const available = zeroTts?.voices?.length ? zeroTts.voices : [];
      if (!available.length || available.includes(wanted)) {
        next.ttsVoice = wanted;
      }
    }

    state.settings = next;
    if (typeof params.autoSim === 'boolean') {
      configureAutoSim(params.autoSim);
    }
    saveState();
    broadcastNotification('temple.state', getPublicState());
    return getPublicState();
  },

  resetMerit() {
    state.totalIncense = 9;
    state.totalMerit = 0;
    state.woodenFishHits = 0;
    state.bellRings = 0;
    state.lanternCount = 0;
    state.fortuneCount = 0;
    state.activeIncenseSticks = 3;
    state.offerings = { lotus: 1, fruit: 1, lamp: 1, dragon: 0 };
    state.devotees = {};
    state.recentEvents = [];
    saveState();
    broadcastNotification('temple.state', getPublicState());
    return getPublicState();
  }
};

// ============================================================================
// 5. TIKTOK LIVE CONNECTOR & COMMENT PARSER
// ============================================================================
let tiktokConn = null;

const commentCooldownMap = new Map();

// Bỏ dấu tiếng Việt để so khớp từ khóa không dấu/có dấu thống nhất một lần
function toAsciiLower(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

let globalLastTtsDispatch = 0;
const KEYWORD_PATTERNS = {
  fortune: /\b(xin xam|gieo que|rut que|que xam|xin que)\b/,
  bell: /\b(thinh chuong|chuong|danh chuong|go chuong)\b/,
  woodenFish: /\b(go mo|tung kinh)\b/,
  prayer: /\b(nam mo|mo phat|a di da|adida|adidaphat|a di da phat|cau|nguyen|binh an|tai loc|chuc|xin loc|cau an|cau phuc|phu ho|do tri|an lanh|suc khoe|may man|thanh cong|hoan hy|an lac|tam an|phat phap|niem phat|sam hoi|gia dao|van su|nhu y|tien tai|khoe manh|hanh phuc|thi|do dat|qua mon|hoc|dai hoc|tot nghiep|kpi|cong viec|tang luong|phong van|chot don|buon ban|ban dat|thoat e|nguoi yeu|healing|chua lanh|ngu ngon|overthinking|cha me|bo me|ong ba|con yeu)\b/,
  incense: /\b(thap huong|dang huong|thap nhang|dang nhang|bai phat|lay phat|le phat|danh le|kinh le|con lay|lay|nhang|cung phat|cung duong|dang le|vai phat)\b/
};

function parseViewerComment(commentText, user, uniqueId, avatar) {
  const raw = String(commentText || '').trim();
  if (!raw || isBlockedSpamOrToxic(raw)) {
    return null;
  }

  const cleanWish = sanitizeWishText(raw);
  if (!cleanWish || cleanWish.length < 3) {
    return null;
  }

  // Chống 1 người spam bình luận liên tục làm nghẽn hàng đợi TTS (cooldown 3 giây/người)
  const userKey = uniqueId || user || '';
  const now = Date.now();
  if (userKey) {
    const lastTs = commentCooldownMap.get(userKey) || 0;
    if (now - lastTs < 3000) {
      return null;
    }
    commentCooldownMap.set(userKey, now);
    if (commentCooldownMap.size > 600) {
      const oldestKey = commentCooldownMap.keys().next().value;
      commentCooldownMap.delete(oldestKey);
    }
  }

  const cleanUser = sanitizeUserName(user);
  registerSessionDevotee(cleanUser, uniqueId, avatar);
  const lower = toAsciiLower(cleanWish);

  // 1. Xin xăm / Gieo quẻ
  if (KEYWORD_PATTERNS.fortune.test(lower)) {
    return Rituals.drawFortune({ user: cleanUser, uniqueId, avatar, topic: cleanWish });
  }
  // 2. Thỉnh chuông
  if (KEYWORD_PATTERNS.bell.test(lower)) {
    return Rituals.ringBell({ user: cleanUser, uniqueId, avatar, count: 1, wish: cleanWish, readTts: false });
  }
  // 3. Gõ mõ
  if (KEYWORD_PATTERNS.woodenFish.test(lower)) {
    return Rituals.strikeWoodenFish({ user: cleanUser, uniqueId, avatar, count: 3 });
  }
  // 4. Thắp hương / Cầu chúc / Bái Phật / Lời nguyện:
  // BƯỚC LÊN BẬC THỀM GỖ ĐẢNH LỄ TAM BÁI & ĐỌC LỜI CẦU CHÚC XƯNG DANH THÍ CHỦ!
  if (KEYWORD_PATTERNS.incense.test(lower) || KEYWORD_PATTERNS.prayer.test(lower)) {
    // Giới hạn tần suất đọc TTS bình luận tối đa 1 câu mỗi 8 giây để không làm nghẽn CPU
    const canReadTts = (now - globalLastTtsDispatch > 8000);
    if (canReadTts) globalLastTtsDispatch = now;

    const ttsDevoteeName = formatDevoteeNameForTts(cleanUser);
    const wishTts = getContextualBlessing(ttsDevoteeName, cleanWish);

    return Rituals.burnIncense({
      user: cleanUser,
      uniqueId,
      avatar,
      count: 3,
      wish: cleanWish,
      readTts: canReadTts,
      customTts: wishTts
    });
  }

  // Bình luận thông thường: vẫn ghi nhận hiện diện, hiển thị bong bóng chat
  const devotee = recordDevotee(cleanUser, uniqueId, avatar, 1, 0, 0, cleanWish);
  broadcastNotification('temple.chat', {
    user: devotee.name,
    uniqueId: devotee.uniqueId,
    avatar: devotee.avatar,
    text: cleanWish,
    timestamp: now
  });
  scheduleStateBroadcast(2000);
  return { chat: true, devotee, text: cleanWish };
}

const giftComboTracker = new Map();
// Debounce broadcast temple.state để tránh nghẽn WebSocket khi đông người xem / vào phòng liên tục
let stateBroadcastTimer = null;
function scheduleStateBroadcast(delayMs = 1200) {
  if (stateBroadcastTimer) return;
  stateBroadcastTimer = setTimeout(() => {
    stateBroadcastTimer = null;
    broadcastNotification('temple.state', getPublicState());
  }, delayMs);
}

const giftComboBuffer = new Map();


// Trạng thái tự kết nối lại TikTok Live (khi streamer chưa mở live / mạng rớt)
let tiktokWanted = false;
let tiktokReconnectTimer = null;
let tiktokReconnectAttempts = 0;
let tiktokSessionId = (process.env.TIKTOK_SESSION_ID || '').trim();

function scheduleTikTokReconnect(reason) {
  if (!tiktokWanted || tiktokReconnectTimer) return;
  tiktokReconnectAttempts += 1;
  // Khi rớt mạng trong lúc live: thử lại siêu tốc sau 2s (3 lần đầu), sau đó nâng dần tránh dồn dập
  const delay = tiktokReconnectAttempts <= 3
    ? 2000
    : Math.min(30000, 4000 * Math.pow(1.3, Math.min(tiktokReconnectAttempts - 3, 5)));
  console.warn(`[TikTok Live] ${reason} — tự kết nối lại sau ${(delay / 1000).toFixed(1)}s (lần ${tiktokReconnectAttempts})`);
  tiktokReconnectTimer = setTimeout(() => {
    tiktokReconnectTimer = null;
    connectTikTokLive(state.tiktok.username || 'zenfacts_vn', { isRetry: true }).catch(() => {});
  }, delay);
}

async function resolveTikTokUsername(rawInput) {
  let input = String(rawInput || '').trim();
  if (!input) {
    throw new Error('Vui lòng nhập @username hoặc link TikTok Live cần kết nối');
  }
  if (input.startsWith('http://') || input.startsWith('https://') || input.includes('tiktok.com/')) {
    const urlToFetch = input.startsWith('http') ? input : `https://${input}`;
    const directMatch = urlToFetch.match(/tiktok\.com\/@([^/?#]+)/i);
    if (directMatch && directMatch[1]) {
      return directMatch[1];
    }
    try {
      const resp = await fetch(urlToFetch, {
        redirect: 'follow',
        signal: AbortSignal.timeout(8000)
      });
      const finalUrl = resp.url || '';
      const resolvedMatch = finalUrl.match(/tiktok\.com\/@([^/?#]+)/i);
      if (resolvedMatch && resolvedMatch[1]) {
        return resolvedMatch[1];
      }
    } catch (e) {
      console.warn('[TikTok URL Resolve Warning]', e.message);
    }
  }
  return input.replace(/^@/, '').split(/[/?#]/)[0].trim();
}

function extractUserFromEvent(data) {
  const u = data?.user || data || {};
  const uniqueId = u.uniqueId || u.displayId || data?.uniqueId || '';
  const user = u.nickname || uniqueId || data?.nickname || 'Thí Chủ';
  const avatar =
    u.profilePictureUrl ||
    u.avatarLarge?.urlList?.[0] ||
    u.avatarThumb?.urlList?.[0] ||
    u.avatarMedium?.urlList?.[0] ||
    data?.profilePictureUrl ||
    '';
  return { user, uniqueId, avatar };
}

async function connectTikTokLive(usernameOrUrl, opts = {}) {
  const cleanUser = await resolveTikTokUsername(usernameOrUrl);
  if (!cleanUser) {
    throw new Error('Không tìm thấy @username hợp lệ từ dữ liệu nhập vào');
  }

  tiktokWanted = true;
  if (tiktokConn) {
    try {
      await tiktokConn.disconnect();
    } catch (_) {}
    tiktokConn = null;
  }

  if (!opts.isRetry) {
    sessionDevoteesMap.clear();
  }
  const prevViewerCount = opts.isRetry ? Number(state.tiktok?.viewerCount || 0) : 0;
  state.tiktok = {
    connected: false,
    connecting: true,
    username: cleanUser,
    roomId: null,
    viewerCount: prevViewerCount,
    lastError: null
  };
  broadcastNotification('temple.state', getPublicState());

  if (opts.sessionId !== undefined) {
    tiktokSessionId = String(opts.sessionId || '').trim();
  }

  const activeSignApiKey = String(opts.signApiKey || EULER_SIGN_API_KEY || '').trim();

  const connOptions = {
    // Không phát lại lịch sử chat cũ khi vừa kết nối (tránh nghi thức bị kích hoạt lại)
    processInitialData: false,
    fetchRoomInfoOnConnect: false,
    enableExtendedGiftInfo: false,
    ...(activeSignApiKey ? { signApiKey: activeSignApiKey } : {}),
    // Giữ nhịp ping chuẩn 10s theo giao thức TikTok Live WebSocket (tránh bị server ngắt sau 5-10 phút)
    wsConfigOverrides: {
      DEFAULT_WS_PING_INTERVAL: 10000
    },
    wsClientOptions: {
      handshakeTimeout: 12000,
      followRedirects: true
    }
  };

  // Nếu người dùng cung cấp session ID (cookie sessionid từ trình duyệt)
  if (tiktokSessionId) {
    connOptions.session = {
      cookie: {
        value: {
          sessionId: tiktokSessionId,
          ttTargetIdc: 'useast2a'
        }
      }
    };
  }

  tiktokConn = new TikTokLiveConnection(cleanUser, connOptions);

  tiktokConn.on(ControlEvent.CONNECTED, (roomState) => {
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || tiktokConn?.roomId || null;
    state.tiktok.lastError = null;
    tiktokReconnectAttempts = 0;
    console.log(`[TikTok Live] Đã kết nối phòng @${cleanUser} (roomId: ${state.tiktok.roomId})`);
    broadcastNotification('temple.state', getPublicState());
  });

  tiktokConn.on(ControlEvent.DISCONNECTED, (evt) => {
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    const reasonMsg = evt?.reason ? ` (Mã: ${evt?.code || 'N/A'}, Lý do: ${evt.reason})` : '';
    console.log(`[TikTok Live] Đã ngắt kết nối @${cleanUser}${reasonMsg}`);
    broadcastNotification('temple.state', getPublicState());
    scheduleTikTokReconnect('Mất kết nối TikTok Live');
  });

  tiktokConn.on(ControlEvent.ERROR, (err) => {
    state.tiktok.lastError = err?.message || String(err);
    console.warn('[TikTok Live Warning]', state.tiktok.lastError);
    broadcastNotification('temple.state', getPublicState());
  });

  tiktokConn.on(WebcastEvent.ROOM_USER, (data) => {
    const viewerCount = Number(data?.viewerCount ?? data?.total ?? 0);
    state.tiktok.viewerCount = viewerCount;
    broadcastNotification('temple.viewerCount', { viewerCount });
  });

  let lastNewcomerTtsDispatch = 0;
  const sessionNewcomerBowed = new Set();

  tiktokConn.on(WebcastEvent.MEMBER, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const cleanUser = sanitizeUserName(user);
    const userKey = uniqueId || cleanUser;

    // Ghi nhận sự hiện diện vào danh sách phiên live
    registerSessionDevotee(cleanUser, uniqueId, avatar);

    // Người mới vô Chánh Điện được đi lên bậc thềm lạy Phật 1 lần
    const now = Date.now();
    if (userKey && !sessionNewcomerBowed.has(userKey)) {
      sessionNewcomerBowed.add(userKey);
      if (sessionNewcomerBowed.size > 1000) {
        const oldest = sessionNewcomerBowed.values().next().value;
        sessionNewcomerBowed.delete(oldest);
      }
      const canReadTts = (now - lastNewcomerTtsDispatch > 12000);
      if (canReadTts) lastNewcomerTtsDispatch = now;

      Rituals.newcomerBow({
        user: cleanUser,
        uniqueId,
        avatar,
        readTts: canReadTts
      });
    } else {
      broadcastNotification('temple.memberJoin', {
        user: cleanUser,
        uniqueId,
        avatar,
        wish: 'Đã vào Chánh Điện lễ Phật'
      });
    }
    scheduleStateBroadcast(1800);
  });

  const recentChatDedupeMap = new Map();
  // Throttle cho tin nhắn chat khi phòng đông người (tối đa 4 cmt/giây xử lý hiệu ứng, tránh tràn hàng đợi)
  let lastChatDispatch = 0;
  tiktokConn.on(WebcastEvent.CHAT, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const commentText = String(data?.content || data?.comment || '').trim();
    if (!commentText) return;

    const chatDedupeKey = `${uniqueId || user}_${commentText}`;
    const now = Date.now();
    if (recentChatDedupeMap.has(chatDedupeKey) && (now - recentChatDedupeMap.get(chatDedupeKey) < 3000)) {
      return;
    }
    recentChatDedupeMap.set(chatDedupeKey, now);
    if (recentChatDedupeMap.size > 600) {
      const oldest = recentChatDedupeMap.keys().next().value;
      recentChatDedupeMap.delete(oldest);
    }

    // Giữ nhịp chat mượt mà, không dồn dập
    if (now - lastChatDispatch < 220) {
      return;
    }
    lastChatDispatch = now;

    console.log(`[TikTok Chat] ${user}: ${commentText}`);
    parseViewerComment(commentText, user, uniqueId, avatar);
  });

  // GOM LIKE (Thả Tim): Cho phép người xem thả tim được đi lên lạy Phật,
  // đồng thời có cơ chế chống spam (mỗi người cách nhau 25s) để nhường lượt cho người khác
  let pendingLikes = 0;
  let lastLikeUser = 'Đạo Tràng Phật Tử';
  let lastLikeUniqueId = '';
  let lastLikeAvatar = '';
  let likeBatchTimer = null;
  const userLikeBowCooldownMap = new Map();
  let lastLikeTtsDispatch = 0;

  tiktokConn.on(WebcastEvent.LIKE, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const likeCount = Math.max(1, Number(data?.count ?? data?.likeCount ?? 1));
    pendingLikes += likeCount;
    if (user) lastLikeUser = user;
    if (uniqueId) lastLikeUniqueId = uniqueId;
    if (avatar) lastLikeAvatar = avatar;

    const cleanUser = sanitizeUserName(user);
    const userKey = uniqueId || cleanUser;
    registerSessionDevotee(cleanUser, uniqueId, avatar);

    // Chống spam: Mỗi người thả tim chỉ được kích hoạt đi lên lạy tối đa 1 lần mỗi 25s
    const now = Date.now();
    const lastBow = userLikeBowCooldownMap.get(userKey) || 0;
    if (now - lastBow > 25000) {
      userLikeBowCooldownMap.set(userKey, now);
      if (userLikeBowCooldownMap.size > 800) {
        const oldest = userLikeBowCooldownMap.keys().next().value;
        userLikeBowCooldownMap.delete(oldest);
      }
      const canReadTts = (now - lastLikeTtsDispatch > 12000);
      if (canReadTts) lastLikeTtsDispatch = now;

      Rituals.likeBow({
        user: cleanUser,
        uniqueId,
        avatar,
        readTts: false // Không gọi TTS khi thả tim để nhường 100% CPU cho quà tặng và bình luận
      });
    }

    if (!likeBatchTimer) {
      likeBatchTimer = setTimeout(() => {
        likeBatchTimer = null;
        if (pendingLikes > 0) {
          const count = Math.min(20, pendingLikes);
          pendingLikes = 0;
          Rituals.strikeWoodenFish({ user: lastLikeUser, uniqueId: lastLikeUniqueId, avatar: lastLikeAvatar, count });
        }
      }, 3000);
    }
  });

  const recentSocialMap = new Map();
  const handleSocialEvent = (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const key = `${uniqueId || user}_social`;
    const now = Date.now();
    if (recentSocialMap.has(key) && (now - recentSocialMap.get(key) < 6000)) {
      return; // Bỏ qua sự kiện trùng lặp từ cả WebcastEvent.FOLLOW và WebcastEvent.SOCIAL
    }
    recentSocialMap.set(key, now);
    if (recentSocialMap.size > 500) {
      const oldest = recentSocialMap.keys().next().value;
      recentSocialMap.delete(oldest);
    }

    // Ghi nhận công đức khi follow/share nhưng KHÔNG rung chuông để tránh tiếng chuông bị lấn át liên tục
    const devotee = recordDevotee(user, uniqueId, avatar, 5, 0, 0, 'Kết duyên lành cùng Chùa Online');
    broadcastNotification('temple.memberJoin', {
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      wish: 'Đã theo dõi / chia sẻ phiên Live'
    });
    scheduleStateBroadcast(1800);
  };
  tiktokConn.on(WebcastEvent.FOLLOW, handleSocialEvent);
  tiktokConn.on(WebcastEvent.SHARE, handleSocialEvent);
  tiktokConn.on(WebcastEvent.SOCIAL, (data) => {
    const action = String(data?.action || '');
    const disp = String(data?.common?.displayText?.displayType || data?.displayType || '').toLowerCase();
    if (action === '1' || action === '3' || disp.includes('follow') || disp.includes('share')) {
      handleSocialEvent(data);
    }
  });

  tiktokConn.on(WebcastEvent.GIFT, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const giftObj = data?.gift || data?.giftDetails || {};
    const giftId = String(data?.giftId || giftObj?.id || 'rose');
    const groupId = String(data?.groupId || `${uniqueId}_${giftId}`);
    const repeatCount = Math.max(1, Number(data?.repeatCount || data?.comboCount || 1));
    const diamondCount = Math.max(1, Number(giftObj?.diamondCount || data?.diamondCount || 1));
    const rawGiftName = giftObj?.name || data?.giftName || giftObj?.describe || 'Hoa Hồng Tâm Thành';
    const isRepeatEnd = Boolean(data?.repeatEnd);

    // Gom combo quà liên tiếp để không bắn trùng lặp hàng chục thông báo TTS / nghi lễ
    let comboEntry = giftComboBuffer.get(groupId);
    if (!comboEntry) {
      comboEntry = {
        user,
        uniqueId,
        avatar,
        giftName: rawGiftName,
        diamondCount,
        maxCount: repeatCount,
        timer: null
      };
      giftComboBuffer.set(groupId, comboEntry);
    } else {
      comboEntry.maxCount = Math.max(comboEntry.maxCount, repeatCount);
      if (comboEntry.timer) {
        clearTimeout(comboEntry.timer);
        comboEntry.timer = null;
      }
    }

    const flushCombo = () => {
      giftComboBuffer.delete(groupId);
      const totalCount = comboEntry.maxCount;
      const totalCoins = comboEntry.diamondCount * totalCount;
      const displayGiftName = totalCount > 1 ? `${totalCount}x ${comboEntry.giftName}` : comboEntry.giftName;

      console.log(`[TikTok Gift Consolidated] ${comboEntry.user} dâng ${displayGiftName} (${totalCoins} xu)`);

      // LUÔN đọc TTS cảm tạ xưng danh người xem khi tặng hoa / quà (kể cả hoa 1 xu)
      Rituals.offerGift({
        user: comboEntry.user,
        uniqueId: comboEntry.uniqueId,
        avatar: comboEntry.avatar,
        coins: totalCoins,
        giftName: displayGiftName,
        readTts: true,
        wish: `Thành tâm dâng cúng ${displayGiftName} kính lễ Đức Phật A Di Đà`
      });
    };

    if (isRepeatEnd) {
      flushCombo();
    } else {
      // Đợi 280ms sau gói quà cuối cùng để gửi tổng kết nhanh chóng, không gây trễ
      comboEntry.timer = setTimeout(flushCombo, 280);
    }
  });

  try {
    const roomState = await tiktokConn.connect();
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || tiktokConn?.roomId || null;
    tiktokReconnectAttempts = 0;
    broadcastNotification('temple.state', getPublicState());
    return state.tiktok;
  } catch (err) {
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    let friendlyError = err?.message || 'Không thể kết nối phòng Live';
    if (friendlyError.includes('rate_limit_account_day') || friendlyError.includes('Rate Limited') || friendlyError.includes('eulerstream')) {
      friendlyError = 'IP của bạn đã chạm hạn mức miễn phí của Sign Server trong ngày. Vui lòng lấy Free API Key tại eulerstream.com hoặc nhập TikTok sessionid.';
    } else if (friendlyError.includes('LIVE has ended') || friendlyError.includes('UserOfflineError') || friendlyError.includes('offline')) {
      friendlyError = `Phòng Live @${cleanUser} hiện đang không phát trực tiếp hoặc đã kết thúc.`;
    }
    state.tiktok.lastError = friendlyError;
    broadcastNotification('temple.state', getPublicState());
    if (opts.isRetry) {
      scheduleTikTokReconnect(`Chưa kết nối được @${cleanUser}`);
      return state.tiktok;
    }
    scheduleTikTokReconnect(`Chưa kết nối được @${cleanUser}`);
    throw new Error(state.tiktok.lastError);
  }
}

function disconnectTikTokLive() {
  tiktokWanted = false;
  tiktokReconnectAttempts = 0;
  if (tiktokReconnectTimer) {
    clearTimeout(tiktokReconnectTimer);
    tiktokReconnectTimer = null;
  }
  if (tiktokConn) {
    try {
      tiktokConn.disconnect();
    } catch (_) {}
    tiktokConn = null;
  }
  state.tiktok.connected = false;
  state.tiktok.connecting = false;
  state.tiktok.viewerCount = 0;
  sessionDevoteesMap.clear();
  broadcastNotification('temple.state', getPublicState());
  return state.tiktok;
}

// ============================================================================
// 6. AUTO-SIMULATION ENGINE (CHẾ ĐỘ TỰ ĐỘNG GIẢ LẬP ĐÔNG NGƯỜI XEM)
// ============================================================================
let autoSimTimer = null;
const SIM_NAMES = [
  'Ngọc Anh Nguyễn', 'Trần Minh Quân', 'Diệu Thảo Tâm An', 'Lê Hoàng Nam', 'Phạm Thanh Hà',
  'Vũ Đức Thịnh', 'Đại Thí Chủ Minh Tâm', 'Phật Tử Diệu Âm', 'Tuệ Minh Cư Sĩ', 'Thanh Trúc Thiện Duyên',
  'Đức Trọng Tâm Lành', 'Nguyên An Tịnh Độ', 'Bảo Trâm Cầu An', 'Hoàng Bách Phát Tâm', 'Mỹ Duyên Phúc Lộc',
  'Vĩnh Khang Tùy Hỷ', 'Hương Giang Cát Tường', 'Khánh Toàn Thiện Duyên', 'Quang Minh Chánh Niệm', 'Diệu Hạnh Tâm Từ',
  'Phúc Lâm Đại Hỷ', 'Thảo Vy Tinh Tấn', 'Minh Triết Huệ Đăng', 'Thiện Nhân Tích Phước', 'Tâm Đức Hoan Hỷ',
  'Hồng Phúc Bình An', 'Thành Đạt Phước Lành', 'Thanh Tùng An Lạc', 'Kim Ngân Vạn Hạnh', 'Bích Thủy Bồ Đề',
  'Trí Dũng Tấn Tới', 'Bảo Long Thuận Buồm', 'Phương Thảo Hạnh Phúc', 'Đăng Khoa Đỗ Đạt', 'Hữu Phước Viên Mãn'
];

const SIM_WISHES = [
  'Con thành tâm cầu cho cha mẹ luôn mạnh khỏe bình an, sống lâu trăm tuổi',
  'Cầu tháng mới công việc thuận buồm xuôi gió, tài lộc hanh thông buôn may bán đắt',
  'Nam Mô A Di Đà Phật, nguyện cầu thế giới hòa bình chúng sinh an lạc',
  'Cầu thi cử đỗ đạt điểm cao, học hành tấn tới, sự nghiệp rộng mở',
  'Cầu gia đạo êm ấm trong ngoài hòa thuận, con cái ngoan ngoãn mạnh giỏi',
  'Con xin gieo một quẻ cầu tài lộc, gia đạo bình an cát tường',
  'Cầu sức khỏe cho cả gia đình, tai qua nạn khỏi, gặp hung hóa cát',
  'Thành tâm dâng hương bái Phật, sám hối nghiệp chướng, tâm hồn thanh tịnh',
  'Cầu cho người thân đang đau ốm sớm ngày bình phục, tai ách tiêu trừ',
  'Cầu công việc làm ăn ngày càng phát đạt, gặp nhiều quý nhân nâng đỡ',
  'Nam mô Quán Thế Âm Bồ Tát từ bi gia hộ độ trì cho gia đình vạn sự cát tường',
  'Cầu duyên lành hội tụ, gia đình sum vầy hạnh phúc an khang',
  'Tâm thành kính lễ mười phương chư Phật, tích lũy công đức phúc báo',
  'Cầu cho con cháu hiếu thảo, gia tộc hưng long thịnh vượng',
  'Cầu buôn bán thuận lợi, tiền vào như nước, vạn sự hanh thông như ý',
  'Cầu cho việc kinh doanh cửa hàng ngày càng đông khách, mua may bán đắt',
  'Cầu mong tâm an định tĩnh, sáng suốt hanh thông trong mọi việc',
  'Cầu cho vợ chồng hòa thuận, gia đình hạnh phúc, trăm năm êm ấm',
  'Cầu cho các con chăm ngoan học giỏi, thi cử đỗ đạt thành tài',
  'Con xin sám hối mọi lỗi lầm, phát nguyện sống lương thiện tích đức',
  'Cầu bình an cho người thân đi đường xa luôn được vạn dặm bình an',
  'Cầu chúc cho toàn thể đạo tràng luôn tràn đầy hỷ lạc, phúc thọ dồi dào',
  'Cầu tài lộc hanh thông, công thành danh toại, phúc lộc song toàn',
  'Cầu cho cha mẹ kính yêu sức khỏe dồi dào, an yên thanh nhàn',
  'Cầu nguyện cửu huyền thất tổ siêu sinh tịnh độ, gia đạo hưng long'
];

const recentSimNameHistory = [];
const recentSimWishHistory = [];

function getNextSimDevotee() {
  const availableNames = SIM_NAMES.filter(n => !recentSimNameHistory.includes(n));
  const namePool = availableNames.length > 0 ? availableNames : SIM_NAMES;
  const name = namePool[Math.floor(Math.random() * namePool.length)];
  recentSimNameHistory.push(name);
  if (recentSimNameHistory.length > 18) recentSimNameHistory.shift();

  const availableWishes = SIM_WISHES.filter(w => !recentSimWishHistory.includes(w));
  const wishPool = availableWishes.length > 0 ? availableWishes : SIM_WISHES;
  const wish = wishPool[Math.floor(Math.random() * wishPool.length)];
  recentSimWishHistory.push(wish);
  if (recentSimWishHistory.length > 10) recentSimWishHistory.shift();

  const uniqueId = toAsciiLower(name).replace(/[^a-z0-9]/g, '_');
  return { user: name, uniqueId, wish };
}

function runSingleSimulationStep() {
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
}

function configureAutoSim(enabled) {
  state.settings.autoSim = Boolean(enabled);
  if (autoSimTimer) {
    clearInterval(autoSimTimer);
    autoSimTimer = null;
  }
  if (state.settings.autoSim) {
    runSingleSimulationStep();
    autoSimTimer = setInterval(runSingleSimulationStep, state.settings.autoSimIntervalMs || 6500);
  }
}

// ============================================================================
// 7. JSON-RPC 2.0 DISPATCHER
// ============================================================================
async function handleRpcCall(method, params = {}) {
  switch (method) {
    case 'temple.getState':
      return getPublicState();
    case 'temple.simulateWave': {
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
      return Rituals.burnIncense(params);
    case 'temple.strikeWoodenFish':
      return Rituals.strikeWoodenFish(params);
    case 'temple.ringBell':
      return Rituals.ringBell(params);
    case 'temple.sendPrayer':
      return Rituals.sendPrayer(params);
    case 'temple.offerGift':
      return Rituals.offerGift(params);
    case 'temple.likeBow':
      return Rituals.likeBow(params);
    case 'temple.newcomerBow':
      return Rituals.newcomerBow(params);
    case 'temple.drawFortune':
      return Rituals.drawFortune(params);
    case 'temple.grandCeremony':
      return Rituals.grandCeremony(params);
    case 'temple.adminNotice':
    case 'admin.announce':
      return Rituals.adminNotice(params);
    case 'temple.updateSettings':
      return Rituals.updateSettings(params);
    case 'temple.resetMerit':
      return Rituals.resetMerit();
    case 'temple.comment':
      return parseViewerComment(params.comment, params.user, params.uniqueId, params.avatar);
    case 'temple.speak': {
      const priority = params.priority != null ? Number(params.priority) : 0;
      const res = await zeroTts.synthesize(params.text, params.voice || state.settings.ttsVoice || DEFAULT_TTS_VOICE, priority);
      if (res.ok && params.broadcast !== false) {
        broadcastNotification('tts.play', {
          text: params.text,
          voice: res.voice,
          url: res.url
        });
      }
      return res;
    }
    case 'temple.ttsStatus':
      return zeroTts.getStatus();
    case 'live.connect':
      return await connectTikTokLive(params.username, {
        sessionId: params.sessionId,
        signApiKey: params.signApiKey
      });
    case 'live.disconnect':
      return disconnectTikTokLive();
    case 'live.setAutoSim':
      configureAutoSim(Boolean(params.enabled));
      saveState();
      broadcastNotification('temple.state', getPublicState());
      return getPublicState();
    default:
      throw new Error(`Không tìm thấy phương thức JSON-RPC: ${method}`);
  }
}

// ============================================================================
// 8. EXPRESS + WEBSOCKET SERVER
// ============================================================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/tts-cache', express.static(TTS_CACHE_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

function requestToken(req) {
  const header = req.headers['x-rpc-token'] || req.headers.authorization || '';
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return String(header || req.query?.token || '').trim();
}

function requireAuth(req, res, next) {
  if (!RPC_TOKEN) return next();
  if (requestToken(req) === RPC_TOKEN) return next();
  return res.status(401).json({
    jsonrpc: '2.0',
    id: req.body?.id ?? null,
    error: { code: -32001, message: 'Unauthorized: thiếu hoặc sai RPC token' }
  });
}

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// HTTP JSON-RPC 2.0 Endpoint
app.post('/rpc', requireAuth, async (req, res) => {
  const { jsonrpc, id, method, params } = req.body || {};
  if (!method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code: -32600, message: 'Invalid JSON-RPC Request: thiếu method' }
    });
  }
  try {
    const result = await handleRpcCall(method, params || {});
    res.json({
      jsonrpc: jsonrpc || '2.0',
      id: id ?? null,
      result
    });
  } catch (err) {
    res.status(200).json({
      jsonrpc: jsonrpc || '2.0',
      id: id ?? null,
      error: { code: -32000, message: err.message || 'Server error' }
    });
  }
});

// ZeroTTS HTTP Endpoint (giọng nam trầm ấm mặc định)
app.all('/api/tts', requireAuth, async (req, res) => {
  const text = String(req.body?.text || req.query?.text || '').trim();
  const voice = String(req.body?.voice || req.query?.voice || state.settings.ttsVoice || DEFAULT_TTS_VOICE).trim().toLowerCase();
  const priority = req.body?.priority != null ? Number(req.body.priority) : (req.query?.priority != null ? Number(req.query.priority) : 1);
  if (!text) {
    return res.status(400).json({ ok: false, error: 'Thiếu nội dung text cần đọc' });
  }
  const result = await zeroTts.synthesize(text, voice, priority);
  res.json(result);
});

app.get('/api/voices', (_req, res) => {
  res.json({
    default: state.settings.ttsVoice || DEFAULT_TTS_VOICE,
    maleVoices: zeroTts.getStatus().maleVoices,
    voices: zeroTts.getStatus().voiceDetails,
    ready: zeroTts.ready,
    status: zeroTts.status
  });
});

// Cho client biết file nhạc nền tuỳ chọn có tồn tại hay không (tránh request 404)
app.get('/api/bg-music', (_req, res) => {
  const candidateFiles = [
    'bg_chant.m4a',
    'bg_chant.mp3',
    'bg_music.mp3',
    'bg_music.m4a',
    'bg_chant.wav',
    'nhac_thien.mp3'
  ];
  for (const filename of candidateFiles) {
    const filePath = path.join(__dirname, 'public', 'assets', filename);
    if (fs.existsSync(filePath)) {
      return res.json({ available: true, url: `/assets/${filename}` });
    }
  }
  res.json({ available: false, url: null });
});

app.get('/api/state', (_req, res) => {
  res.json(getPublicState());
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastNotification(method, params) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method,
    params
  });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws, req) => {
  if (RPC_TOKEN) {
    let token = '';
    try {
      token = new URL(req.url || '/ws', 'http://localhost').searchParams.get('token') || '';
    } catch (_) {}
    if (!token) token = String(req.headers['x-rpc-token'] || '').trim();
    if (token !== RPC_TOKEN) {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'error',
        params: { error: 'Unauthorized: thiếu hoặc sai RPC token' }
      }));
      ws.close(1008, 'Unauthorized');
      return;
    }
  }

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.send(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'temple.state',
      params: getPublicState()
    })
  );

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf8'));
    } catch (_) {
      return;
    }
    if (!msg || !msg.method) return;
    try {
      const result = await handleRpcCall(msg.method, msg.params || {});
      if (msg.id !== undefined) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result
          })
        );
      }
    } catch (err) {
      if (msg.id !== undefined) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32000, message: err.message || 'RPC Error' }
          })
        );
      }
    }
  });
});

// Dọn các WebSocket "zombie" (đóng tab, mất mạng) để không giữ kết nối vô hạn
const wsHeartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      try { ws.terminate(); } catch (_) {}
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  }
}, 30000);
wss.on('close', () => clearInterval(wsHeartbeat));

const zeroTts = new ZeroTTSManager();

function shutdown(signal) {
  console.log(`\n[Server] Nhận ${signal}, đang tắt an toàn...`);
  clearInterval(wsHeartbeat);
  tiktokWanted = false;
  if (tiktokReconnectTimer) {
    clearTimeout(tiktokReconnectTimer);
    tiktokReconnectTimer = null;
  }
  try {
    if (tiktokConn) tiktokConn.disconnect();
  } catch (_) {}
  zeroTts.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err?.message || err);
});

server.listen(PORT, HOST, () => {
  console.log(`============================================================`);
  console.log(`🪷 CHÙA ONLINE TIKTOK LIVE RPC ĐÃ KHỞI ĐỘNG`);
  console.log(`📺 Màn hình Live (9:16 OBS): http://localhost:${PORT}`);
  console.log(`🎛️ Bảng điều khiển RPC Admin: http://localhost:${PORT}/admin`);
  console.log(`🔌 JSON-RPC 2.0 Endpoint   : http://localhost:${PORT}/rpc (ws://localhost:${PORT}/ws)`);
  console.log(`🎙️ Giọng đọc mặc định      : ${DEFAULT_TTS_VOICE} (nam trầm ấm)`);
  if (RPC_TOKEN) console.log(`🔒 RPC token               : ĐANG BẬT (header x-rpc-token)`);
  console.log(`============================================================`);

  // Tự động bật Auto-Sim nếu được cấu hình trong settings
  if (state.settings?.autoSim) {
    console.log('[Auto-Sim] Tự động Giả lập Người xem: ĐANG BẬT');
    configureAutoSim(true);
  }

  // Tự động kết nối kênh TikTok Live nếu có cấu hình TIKTOK_USER
  const defaultChannel = process.env.TIKTOK_USER || '';
  if (defaultChannel) {
    connectTikTokLive(defaultChannel).catch((err) => {
      console.warn(`[Auto-Connect @${defaultChannel}] Chưa kết nối được ngay:`, err.message);
    });
  }
});
