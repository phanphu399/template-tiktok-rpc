#!/usr/bin/env python3
"""
Persistent ZeroTTS Worker Daemon (voice='giahuy' — nam trầm ấm mặc định).
- Strict Vietnamese-only text sanitizer: strips all Cuneiform (𒐫), Zalgo, emojis, and foreign scripts
  before passing to ZeroTTS so the model never chokes or glitches.
- Single-pass continuous synthesis + soft peak normalization (<= 0.90) + cosine fade-in/out.
- Low CPU configuration: intra_op_num_threads=3 + OMP_WAIT_POLICY=PASSIVE (0% CPU when idle).
"""
import gc
import hashlib
import json
import os
import re
import sys
import time
import traceback
import unicodedata
from pathlib import Path

# Force UTF-8 encoding on Windows stdin/stdout to prevent Mojibake
if sys.platform == 'win32':
    try:
        sys.stdin.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
        sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
    except Exception:
        pass

# Fix Windows pathlib.Path.read_text() defaulting to cp1252 (charmap) causing ZeroTTS crash
_orig_read_text = Path.read_text
def _utf8_read_text(self, encoding=None, errors=None):
    return _orig_read_text(self, encoding=encoding or "utf-8", errors=errors or "replace")
Path.read_text = _utf8_read_text

os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")
os.environ.setdefault("MKL_NUM_THREADS", "4")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "4")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "4")

import numpy as np
from zerotts import ZeroTTS, normalize_vi_text
from zerotts.chunking import normalize_punctuation

CACHE_DIR = Path(__file__).resolve().parent / "data" / "tts-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Giọng nam trầm ấm mặc định; có thể đổi qua biến môi trường ZEROTTS_VOICE
DEFAULT_VOICE = (os.environ.get("ZEROTTS_VOICE") or "giahuy").strip().lower()
MALE_VOICES = ["giahuy", "huuduc", "quangminh", "tiendat"]
# Giới hạn số file WAV trong cache để ổ đĩa không phình mãi
MAX_CACHE_FILES = int(os.environ.get("ZEROTTS_CACHE_FILES") or 400)

LOCAL_MODEL_CANDIDATES = [
    os.environ.get("ZEROTTS_MODEL_PATH", ""),
    "/Users/zens/Work/UIT/Projects/f1-metrics-explainer/models/zerotts",
]

# Chỉ giữ lại chữ cái tiếng Việt (Latin + dấu tiếng Việt), chữ số và dấu câu cơ bản
VIETNAMESE_ALLOWED_RE = re.compile(
    r"[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s.,!?]"
)
BRACKET_EMOTE_RE = re.compile(r"\[[^\]]{1,24}\]")
REPEATED_CHARS_RE = re.compile(r"(.)\1{2,}", re.IGNORECASE)
MULTI_PUNCT_RE = re.compile(r"([.,!?])\1+")
MULTI_SPACE_RE = re.compile(r"\s+")


def resolve_model_source() -> str:
    for candidate in LOCAL_MODEL_CANDIDATES:
        if candidate and os.path.isdir(candidate) and os.path.isfile(os.path.join(candidate, "config.json")):
            return candidate
    return "zeroweight-ai/ZeroTTS"


def emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def load_voice_details(voices_root: Path, names: list) -> list:
    """Đọc meta.json của từng voice pack để UI hiển thị tên/giới tính/mô tả."""
    details = []
    for name in names:
        meta = {}
        try:
            meta_path = voices_root / name / "meta.json"
            if meta_path.is_file():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            meta = {}
        details.append({
            "name": name,
            "displayName": meta.get("display_name") or name,
            "gender": meta.get("gender") or "",
            "description": meta.get("description") or "",
            "tags": meta.get("tags") or [],
            "male": (meta.get("gender") == "nam") or (name in MALE_VOICES),
        })
    # Giọng nam trầm ấm lên đầu danh sách cho dễ chọn
    details.sort(key=lambda v: (0 if v["name"] in MALE_VOICES else 1,
                                MALE_VOICES.index(v["name"]) if v["name"] in MALE_VOICES else 99,
                                v["name"]))
    return details


def prune_cache() -> None:
    """Giữ tối đa MAX_CACHE_FILES file WAV mới nhất."""
    try:
        files = sorted(
            (p for p in CACHE_DIR.glob("*.wav") if p.is_file()),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        for old in files[MAX_CACHE_FILES:]:
            try:
                old.unlink()
            except OSError:
                pass
    except Exception:
        pass


def clean_and_normalize_text(raw_text: str) -> str:
    if not raw_text:
        return ""
    # 1. Chuẩn hóa NFKC (biến chữ kiểu toán học 𝒯𝒽𝒾ê𝓃 𝒯â𝓂 -> Thiên Tâm) rồi NFC
    text = unicodedata.normalize("NFC", unicodedata.normalize("NFKC", str(raw_text)))
    # 2. Xóa các mã emote kiểu [thanks], [rose]
    text = BRACKET_EMOTE_RE.sub(" ", text)
    # 3. Xóa sạch ký tự lạ (𒐫, emoji, ký tự ngoại ngữ, ký tự điều khiển)
    text = VIETNAMESE_ALLOWED_RE.sub(" ", text)
    # 4. Thu gọn ký tự lặp quá 2 lần (ví dụ: aaaaa -> aa, ..... -> .)
    text = MULTI_PUNCT_RE.sub(r"\1", text)
    text = REPEATED_CHARS_RE.sub(r"\1\1", text)
    text = MULTI_SPACE_RE.sub(" ", text).strip(" .,!?-")

    # Phải có ít nhất 2 chữ cái hợp lệ mới đọc
    letters = re.findall(r"[a-zA-ZÀ-ỹĂăĐđĨĩŨũƠơƯư]", text)
    if len(letters) < 2:
        return ""

    # Giới hạn tối đa 100 ký tự để tổng hợp CPU luôn nhanh (<4s), không bao giờ nghẽn luồng live
    if len(text) > 100:
        clipped = text[:100]
        last_space = max(clipped.rfind('.'), clipped.rfind(','), clipped.rfind('!'), clipped.rfind('?'), clipped.rfind(' '))
        if last_space > 40:
            clipped = clipped[:last_space]
        text = clipped.rstrip(" .,!?-") + "."

    # Giới hạn độ dài an toàn cho 1 câu đọc TTS (tối đa 160 ký tự)
    if len(text) > 160:
        text = text[:160].rsplit(" ", 1)[0]

    normalized = normalize_vi_text(text)
    normalized = normalize_punctuation(normalized).strip()
    normalized = VIETNAMESE_ALLOWED_RE.sub(" ", normalized)
    normalized = MULTI_SPACE_RE.sub(" ", normalized).strip()
    if normalized and normalized[-1] not in ".!?":
        normalized += "."
    return normalized


def polish_waveform(wav: np.ndarray, sample_rate: int) -> np.ndarray:
    """De-click ends and prevent PCM_16 digital clipping ('xước/rè')."""
    arr = np.asarray(wav, dtype=np.float32).reshape(-1)
    if arr.size == 0:
        return arr.reshape(1, 0)

    arr = arr - np.mean(arr)

    peak = float(np.max(np.abs(arr)))
    if peak > 0.90:
        arr = arr * (0.90 / peak)

    fade_in = min(int(sample_rate * 0.012), arr.size // 4)
    fade_out = min(int(sample_rate * 0.020), arr.size // 4)
    if fade_in > 1:
        ramp_in = 0.5 * (1.0 - np.cos(np.linspace(0, np.pi, fade_in, dtype=np.float32)))
        arr[:fade_in] *= ramp_in
    if fade_out > 1:
        ramp_out = 0.5 * (1.0 + np.cos(np.linspace(0, np.pi, fade_out, dtype=np.float32)))
        arr[-fade_out:] *= ramp_out

    return arr.reshape(1, -1)


def main() -> None:
    t0 = time.time()
    model_src = resolve_model_source()
    emit({"type": "status", "status": "loading", "model": model_src})

    try:
        tts = ZeroTTS.from_pretrained(model_src, intra_op_num_threads=4)
        voices = tts.list_voices()
        default_voice = DEFAULT_VOICE if DEFAULT_VOICE in voices else (
            "maichi" if "maichi" in voices else (voices[0] if voices else None))
        voice_details = load_voice_details(getattr(tts, "voices_root", Path(".")), voices)
        load_sec = round(time.time() - t0, 2)
        emit({
            "type": "ready",
            "model": model_src,
            "voice": default_voice,
            "voices": voices,
            "voiceDetails": voice_details,
            "maleVoices": [v["name"] for v in voice_details if v.get("male")],
            "sampleRate": int(tts.sample_rate),
            "loadSec": load_sec,
        })
    except Exception as exc:
        emit({
            "type": "error",
            "fatal": True,
            "error": str(exc),
            "trace": traceback.format_exc(),
        })
        sys.exit(1)

    synth_count = 0
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            text = (req.get("text") or "").strip()
            voice = str(req.get("voice") or DEFAULT_VOICE).strip().lower()
            if voice not in voices:
                voice = default_voice or voices[0]

            norm_text = clean_and_normalize_text(text)
            if not norm_text:
                emit({"type": "result", "id": req_id, "ok": False, "error": "Filtered empty/spam text"})
                continue

            cache_key = hashlib.sha1(f"v3::{voice}::{norm_text}".encode("utf-8")).hexdigest()[:20]
            out_name = f"{voice}_{cache_key}.wav"
            out_path = CACHE_DIR / out_name

            if out_path.is_file() and out_path.stat().st_size > 200:
                emit({
                    "type": "result",
                    "id": req_id,
                    "ok": True,
                    "cached": True,
                    "voice": voice,
                    "file": out_name,
                    "url": f"/tts-cache/{out_name}",
                    "synthSec": 0.0,
                })
                continue

            t_synth = time.time()
            raw_wav = tts.synthesize(norm_text, voice=voice, eoa_extra_frames=2)
            if raw_wav is None or raw_wav.size == 0:
                emit({"type": "result", "id": req_id, "ok": False, "error": "No audio generated"})
                continue

            clean_audio = polish_waveform(raw_wav, int(tts.sample_rate))
            tts.save_audio(clean_audio, str(out_path))
            synth_count += 1
            if synth_count % 10 == 0:
                gc.collect()
            if synth_count % 20 == 0:
                prune_cache()
            synth_sec = round(time.time() - t_synth, 2)
            duration_sec = round(clean_audio.shape[-1] / float(tts.sample_rate), 2)

            emit({
                "type": "result",
                "id": req_id,
                "ok": True,
                "cached": False,
                "voice": voice,
                "file": out_name,
                "url": f"/tts-cache/{out_name}",
                "synthSec": synth_sec,
                "durationSec": duration_sec,
            })
        except Exception as exc:
            emit({
                "type": "result",
                "id": req_id,
                "ok": False,
                "error": str(exc),
                "trace": traceback.format_exc(),
            })


if __name__ == "__main__":
    main()
