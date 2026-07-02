// Helper auth + fetch + toast + logger untuk app siswa. Semua state di localStorage.
export const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

// ===================== PWA (manifest + service worker) =====================
if (typeof document !== 'undefined') {
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest'; link.href = '/manifest.webmanifest';
    document.head.appendChild(link);
    const meta = document.createElement('meta');
    meta.name = 'theme-color'; meta.content = '#0066cc';
    document.head.appendChild(meta);
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
}

const TOKEN_KEY = 'siswa_token';
const STUDENT_KEY = 'siswa_data';

// ===================== LOGGER (grouped, console only) =====================
// Error & warning HANYA ke console (tidak pernah ke toast). Format: [ERROR] : <pesan>
export function logError(msg, detail) {
  console.error('%c[ERROR]', 'color:#e5484d;font-weight:bold', ':', msg, detail ?? '');
}
export function logWarn(msg, detail) {
  console.warn('%c[WARNING]', 'color:#c97a17;font-weight:bold', ':', msg, detail ?? '');
}
export function logInfo(msg, detail) {
  console.info('%c[INFO]', 'color:#16a34a;font-weight:bold', ':', msg, detail ?? '');
}

// ===================== TOAST (info/notif penting saja) =====================
function toastRoot() {
  let el = document.getElementById('toastRoot');
  if (!el) { el = document.createElement('div'); el.id = 'toastRoot'; document.body.appendChild(el); }
  return el;
}
// type: 'success' | 'info' (TIDAK untuk error/warning — itu pakai logError/logWarn)
export function toast(message, type = 'success', ms = 3200) {
  const ic = type === 'info' ? 'fa-circle-info' : 'fa-circle-check';
  const node = document.createElement('div');
  node.className = `toast toast-${type}`;
  node.innerHTML = `<span class="toast-ic"><i class="fa-solid ${ic}"></i></span><span>${message}</span>`;
  toastRoot().appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 320);
  }, ms);
}

// ===================== MODAL (reusable, 3 state) =====================
const MODAL_IC = { info: 'fa-circle-info', warning: 'fa-triangle-exclamation', danger: 'fa-circle-exclamation' };
const MODAL_BTN = { info: 'btn-primary', warning: 'btn-warning', danger: 'btn-danger' };
// opts: { type:'info'|'warning'|'danger', title, message, confirmText, cancelText, input, placeholder, value }
// return Promise: input→string|null ; confirm(cancelText ada)→true/false ; alert→true
export function modal(opts = {}) {
  const type = opts.type || 'info';
  const hasInput = !!opts.input;
  const hasCancel = hasInput || !!opts.cancelText;
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = `modal-backdrop modal-${type}`;
    back.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-ic"><i class="fa-solid ${MODAL_IC[type]}"></i></div>
        ${opts.title ? `<div class="modal-title">${opts.title}</div>` : ''}
        ${opts.message ? `<div class="modal-msg">${opts.message}</div>` : ''}
        ${hasInput ? `<input class="field modal-input" id="__modalInput" placeholder="${opts.placeholder || ''}" value="${opts.value || ''}">` : ''}
        <div class="modal-actions">
          ${hasCancel ? `<button class="btn btn-secondary" data-act="cancel">${opts.cancelText || 'Batal'}</button>` : ''}
          <button class="btn ${MODAL_BTN[type]}" data-act="ok">${opts.confirmText || 'OK'}</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('show'));
    const inputEl = back.querySelector('#__modalInput');
    if (inputEl) setTimeout(() => inputEl.focus(), 80);

    const close = (result) => {
      back.classList.remove('show');
      setTimeout(() => back.remove(), 220);
      resolve(result);
    };
    back.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (e.target === back) return close(hasInput ? null : false);  // klik luar = batal
      if (act === 'cancel') return close(hasInput ? null : false);
      if (act === 'ok') return close(hasInput ? (inputEl.value.trim() || '') : true);
    });
    if (inputEl) inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') close(inputEl.value.trim() || ''); });
  });
}

// ===================== TYPING INDICATOR =====================
// Tambah gelembung "sedang mengetik" ke container; balikin fungsi untuk menghapusnya.
export function showTyping(container) {
  const row = document.createElement('div');
  row.className = 'flex justify-start';
  row.innerHTML = `<div class="bubble bubble-in"><div class="typing"><span></span><span></span><span></span></div></div>`;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
  return () => row.remove();
}

// ===================== SESI + SATPAM (verifikasi wajah) =====================
const SESSION_AT_KEY = 'siswa_session_at';
const SELFIE_KEY = 'siswa_selfie';
const SESSION_MS = 24 * 60 * 60 * 1000; // 24 jam
const TEST_MODE_KEY = 'siswa_test_mode';

// Mode testing: buka app dgn ?test=1 → skip verifikasi wajah (satpam). ?test=0 mematikan.
if (typeof location !== 'undefined') {
  const t = new URLSearchParams(location.search).get('test');
  if (t === '1') localStorage.setItem(TEST_MODE_KEY, '1');
  else if (t === '0') localStorage.removeItem(TEST_MODE_KEY);
}
export const isTestMode = () => localStorage.getItem(TEST_MODE_KEY) === '1';

export function getSelfie() { return localStorage.getItem(SELFIE_KEY); }
function sessionValid() {
  const at = Number(localStorage.getItem(SESSION_AT_KEY) || 0);
  return at > 0 && (Date.now() - at) < SESSION_MS && !!localStorage.getItem(SELFIE_KEY);
}

function dataURLtoBlob(d) {
  const [meta, b64] = d.split(',');
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
export function getSelfieBlob() { const d = getSelfie(); return d ? dataURLtoBlob(d) : null; }

const FACEAPI_SRC = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const FACEAPI_MODELS = 'https://justadudewhohacks.github.io/face-api.js/models';
function loadScriptOnce(src) {
  return new Promise((res, rej) => {
    if ([...document.scripts].some(s => s.src === src)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

// Layer "satpam" — REPLIKA logika fill.astro (face-api.js): minta kamera, stream video,
// deteksi wajah harus di tengah + cukup besar + penuh → auto-capture. TIDAK bisa di-skip.
// Foto verifikasi disimpan sbg selfie utk bukti saat mengumpulkan tugas (sesi 5 jam).
export function ensureSession() {
  return new Promise((resolve) => {
    if (isTestMode()) { localStorage.setItem(SESSION_AT_KEY, String(Date.now())); return resolve(); } // mode test: skip satpam
    if (sessionValid()) return resolve();

    const back = document.createElement('div');
    back.className = 'satpam-backdrop';
    back.innerHTML = `
      <div class="satpam-box">
        <div class="satpam-title"><i class="fa-solid fa-user-shield"></i> Verifikasi Wajah</div>
        <div class="satpam-sub">Posisikan wajahmu di tengah kotak. Foto diambil otomatis.</div>
        <div class="satpam-frame" id="satpamFrame">
          <video id="satpamVideo" autoplay playsinline muted></video>
          <div id="satpamScan" class="satpam-scan hidden"><i class="fa-solid fa-spinner fa-spin text-2xl"></i><span>Memverifikasi…</span></div>
        </div>
        <div id="satpamMsg" class="satpam-msg">Mengaktifkan kamera…</div>
        <button id="satpamRetry" class="btn btn-secondary w-full mt-2" style="display:none;">Coba Lagi</button>
      </div>`;
    document.body.appendChild(back);

    const video = back.querySelector('#satpamVideo');
    const frame = back.querySelector('#satpamFrame');
    const scan = back.querySelector('#satpamScan');
    const msg = back.querySelector('#satpamMsg');
    let stream = null, loopId = null, verifying = false;

    const fail = (text) => {
      msg.innerHTML = `<span style="color:#ff8a8a">${text}</span>`;
      frame.style.borderColor = 'var(--danger)';
      back.querySelector('#satpamRetry').style.display = '';
    };
    back.querySelector('#satpamRetry').addEventListener('click', () => location.reload());

    const finish = (dataUrl) => {
      localStorage.setItem(SELFIE_KEY, dataUrl);
      localStorage.setItem(SESSION_AT_KEY, String(Date.now()));
      if (loopId) clearTimeout(loopId);
      if (stream) stream.getTracks().forEach(t => t.stop());
      back.remove(); resolve();
    };

    const capture = () => {
      verifying = true;
      scan.classList.remove('hidden');
      const c = document.createElement('canvas');
      c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', 0.7);
      setTimeout(() => finish(data), 900); // animasi "verifikasi" sebentar
    };

    const runLoop = () => {
      const ai = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
      let progress = 0, noFace = 0;
      const loop = async () => {
        if (!stream || verifying) return;
        try {
          const det = await faceapi.detectSingleFace(video, ai);
          if (det) {
            const b = det.box, vw = video.videoWidth, vh = video.videoHeight;
            const okX = Math.abs((b.x + b.width / 2) - vw / 2) < vw * 0.35;
            const okY = Math.abs((b.y + b.height / 2) - vh / 2) < vh * 0.35;
            const big = b.width > vw * 0.15;
            const r = b.width / b.height; const full = r > 0.5 && r < 1.2;
            if (okX && okY && big && full) {
              noFace = 0; progress += 5;
              frame.style.borderStyle = 'solid';
              frame.style.borderColor = `rgba(22,163,74,${progress / 100})`;
              frame.style.boxShadow = `0 0 ${progress / 4}px rgba(22,163,74,0.6)`;
              msg.innerHTML = progress < 40 ? '<span style="color:#86efac">Bagus, tahan sebentar…</span>'
                : progress < 80 ? '<span style="color:#86efac">Jangan bergerak…</span>'
                : '<span style="color:#86efac">Hampir selesai…</span>';
              if (progress >= 100) { msg.innerHTML = '<span style="color:#86efac;font-weight:800">BERHASIL!</span>'; capture(); return; }
            } else {
              progress = 0; frame.style.boxShadow = 'none'; frame.style.borderStyle = 'dashed'; frame.style.borderColor = '#fb923c';
              msg.innerHTML = !full ? '<span style="color:#fdba74">Wajah harus terlihat penuh!</span>'
                : !big ? '<span style="color:#fdba74">Maju sedikit, wajah terlalu jauh.</span>'
                : '<span style="color:#fdba74">Arahkan wajah ke tengah kotak.</span>';
            }
          } else {
            progress = 0; noFace += 150;
            frame.style.boxShadow = 'none'; frame.style.borderStyle = 'dashed';
            if (noFace > 3000) { frame.style.borderColor = 'var(--danger)'; msg.innerHTML = '<span style="color:#ff8a8a">Wajah tidak terdeteksi.</span>'; }
            else { frame.style.borderColor = 'rgba(255,255,255,0.7)'; msg.textContent = 'Posisikan wajahmu di dalam kotak.'; }
          }
        } catch (e) { /* frame dropped */ }
        loopId = setTimeout(loop, 150);
      };
      loop();
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } } });
      } catch (e1) {
        try { stream = await navigator.mediaDevices.getUserMedia({ video: true }); }
        catch (e2) { logWarn('Kamera gagal diakses'); return fail('Kamera tidak bisa diakses. Tutup aplikasi lain (WA/Kamera) lalu coba lagi, atau ganti device.'); }
      }
      video.srcObject = stream;
      video.onloadedmetadata = async () => {
        video.play();
        msg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat sensor wajah…';
        try { await loadScriptOnce(FACEAPI_SRC); await faceapi.nets.tinyFaceDetector.loadFromUri(FACEAPI_MODELS); }
        catch (e) { return fail('Gagal memuat sensor wajah. Pastikan internet stabil, lalu coba lagi.'); }
        msg.textContent = 'Posisikan wajahmu di dalam kotak.';
        runLoop();
      };
    };
    start();
  });
}

// ===================== SESSION =====================
export function setSession(token, student) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
}
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function getStudent() {
  try { return JSON.parse(localStorage.getItem(STUDENT_KEY) || 'null'); }
  catch { return null; }
}
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STUDENT_KEY);
  localStorage.removeItem(SESSION_AT_KEY);
  localStorage.removeItem(SELFIE_KEY);
  location.href = '/';
}
export function requireAuth() {
  const t = getToken();
  if (!t) { location.href = '/'; return null; }
  return getStudent();
}

// ===================== PUSH NOTIFICATION (client) =====================
function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64); const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
async function subscribePush(reg) {
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const r = await api('/api/student/push/key');
      const key = r?.data?.key; if (!key) return;
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    }
    await api('/api/student/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
  } catch (e) { logWarn('Gagal subscribe push', e.message); }
}
// Tawarkan push notif. Dipanggil tiap login: kalau sudah granted → pastikan ter-subscribe;
// kalau belum (default) → tampilkan modal ajakan; kalau denied → diam.
export async function offerPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    if (Notification.permission === 'granted') { await subscribePush(reg); return; }
    if (Notification.permission === 'denied') return;
    const ok = await modal({ type: 'info', title: 'Aktifkan Notifikasi?',
      message: 'Biar kamu langsung tahu kalau Kak Aziz menyetujui izinmu, walau app sedang ditutup.',
      confirmText: 'Aktifkan', cancelText: 'Nanti' });
    if (!ok) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') { await subscribePush(reg); toast('Notifikasi aktif 🔔', 'success'); }
  } catch (e) { logWarn('offerPush gagal', e.message); }
}

// ===================== IZIN DRAWER (reusable) =====================
const escHtml = (s) => (s == null ? '' : String(s)).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// Bottom-sheet izin: cek "sudah izin hari ini?" → kalau belum: pilih alasan → kirim.
// Setelah izin (atau sudah izin) → tombol "Salin & Buka WhatsApp" utk tempel ke grup.
export function openIzinDrawer({ studentId, name, onClose } = {}) {
  const REASONS = ['Sakit', 'Pergi (Mendesak)', 'Haid', 'Belajar', 'Lainnya'];
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `
    <div class="sheet">
      <div class="sheet-grab"></div>
      <div class="flex items-center justify-between">
        <div class="modal-title"><i class="fa-solid fa-hand" style="color:var(--warning)"></i> Izin ke Kak Aziz</div>
        <button data-close class="text-xl active:opacity-70" style="color:var(--ink-tertiary)"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div data-body style="margin-top:0.5rem"></div>
    </div>`;
  document.body.appendChild(back);
  void back.offsetWidth;
  requestAnimationFrame(() => back.classList.add('show'));

  const body = back.querySelector('[data-body]');
  let submitted = false;
  const shut = () => { back.classList.remove('show'); setTimeout(() => back.remove(), 340); if (onClose) onClose(submitted); };
  back.querySelector('[data-close]').addEventListener('click', shut);
  back.addEventListener('click', (e) => { if (e.target === back) shut(); });

  const waText = (reason) => `Nama : ${name || '-'}\nAlasan : ${reason}\nHari : ${today}`;
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      try {
        const ta = document.createElement('textarea'); ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta);
        ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
      } catch { return false; }
    }
  }

  function renderDone(reason, already) {
    submitted = true;
    body.innerHTML = `
      <div class="text-[14px] mb-2 font-semibold" style="color:${already ? 'var(--ink-secondary)' : '#16a34a'}">
        <i class="fa-solid fa-circle-check"></i> ${already ? 'Kamu sudah izin hari ini.' : 'Izin terkirim ke Kak Aziz. Terima kasih 🤲'}
      </div>
      <div class="ans-label">Tempel pesan ini ke grup pengajian</div>
      <pre style="white-space:pre-wrap;background:var(--surface-sunken);border-radius:var(--r-md);padding:0.75rem;font-family:var(--font-sans);font-size:13px;color:var(--ink);margin-top:0.4rem">${escHtml(waText(reason))}</pre>
      <button data-wa class="btn w-full mt-3" style="background:#25D366;color:#fff;"><i class="fa-brands fa-whatsapp"></i> Salin &amp; Buka WhatsApp</button>
      <button data-close2 class="btn btn-secondary w-full mt-2">Tutup</button>`;
    body.querySelector('[data-close2]').addEventListener('click', shut);
    body.querySelector('[data-wa]').addEventListener('click', () => {
      const text = waText(reason);
      // Copy fire-and-forget (jangan await → jaga user-gesture utk buka scheme di iOS).
      copyText(text).then(ok => toast(ok ? 'Pesan disalin' : 'Salin manual ya', ok ? 'success' : 'info'));
      // Buka WhatsApp LANGSUNG di dalam gesture (kalau ditunda pakai setTimeout, iOS blokir).
      // Pakai scheme native + prefill teks (bukan wa.me) → tinggal pilih grup.
      window.location.href = 'whatsapp://send?text=' + encodeURIComponent(text);
    });
  }

  function renderReasons() {
    submitted = false;
    body.innerHTML = `
      <div class="modal-msg" style="text-align:left">${name ? ('Untuk <b>' + escHtml(name) + '</b>. ') : ''}Pilih alasan izinmu:</div>
      <div class="flex flex-wrap gap-2" style="margin-top:0.85rem">
        ${REASONS.map(r => `<button class="chip" data-reason="${escHtml(r)}" style="border-color:var(--warning);color:var(--warning)">${escHtml(r)}</button>`).join('')}
      </div>
      <div data-state class="caption" style="margin-top:0.9rem;min-height:16px;"></div>`;
    const stateEl = body.querySelector('[data-state]');
    body.querySelectorAll('[data-reason]').forEach(btn => btn.addEventListener('click', async () => {
      let reason = btn.dataset.reason;
      if (reason === 'Lainnya') {
        const r = await modal({ type: 'warning', title: 'Alasan lain', input: true, placeholder: 'Tulis alasanmu', confirmText: 'Lanjut', cancelText: 'Batal' });
        if (!r) return; reason = r;
      }
      body.querySelectorAll('[data-reason]').forEach(b => b.disabled = true);
      stateEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim…';
      try {
        await api('/api/student/public/izin', { method: 'POST', body: { student_id: studentId, reason } });
        toast('Izin terkirim ke Kak Aziz', 'success');
        renderDone(reason, false);
      } catch (ex) {
        logError('Gagal kirim izin', ex.message);
        if (/sudah mengajukan izin hari ini/i.test(ex.message || '')) { renderDone(reason, true); return; }
        body.querySelectorAll('[data-reason]').forEach(b => b.disabled = false);
        stateEl.innerHTML = `<span style="color:var(--danger)">${escHtml(ex.message || 'Gagal, coba lagi.')}</span>`;
      }
    }));
  }

  // Cek dulu apakah sudah izin hari ini (izin hanya 1x/hari).
  body.innerHTML = '<div class="caption" style="padding:0.5rem 0"><i class="fa-solid fa-spinner fa-spin"></i> Memuat…</div>';
  api(`/api/student/public/izin-today?student_id=${encodeURIComponent(studentId || '')}`)
    .then(r => { if (r.data && r.data.izined) renderDone(r.data.reason || '-', true); else renderReasons(); })
    .catch(() => renderReasons());
}

// ===================== NOTIF WAJIB (blocking gate) =====================
// App tidak jalan sampai izin notifikasi diberikan. Skip di mode test / browser tak mendukung.
export function requireNotif() {
  return new Promise((resolve) => {
    if (isTestMode()) return resolve();
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return resolve();
    (async () => {
      const reg = await navigator.serviceWorker.ready;
      if (Notification.permission === 'granted') { await subscribePush(reg); return resolve(); }
      const back = document.createElement('div');
      back.className = 'notif-gate';
      // mode: 'default' (belum diminta) | 'denied' (coba minta lagi) | 'blocked' (mentok → reload)
      const render = (mode) => {
        const sub = mode === 'default'
          ? 'Notifikasi <b>wajib</b> aktif untuk memakai aplikasi ini (biar kamu tahu tugas baru & status izin). Ketuk tombol di bawah, lalu pilih <b>Izinkan</b>.'
          : mode === 'denied'
            ? 'Notifikasi masih nonaktif. Coba aktifkan lagi. Kalau pilihan izin tidak muncul, artinya diblokir browser — izinkan lewat pengaturan situs, lalu muat ulang.'
            : 'Notifikasi diblokir browser. Buka <b>pengaturan situs</b> (ikon gembok di address bar) → izinkan <b>Notifikasi</b> → lalu muat ulang.';
        const primaryLabel = mode === 'default' ? 'Aktifkan Notifikasi' : mode === 'denied' ? 'Coba Aktifkan Lagi' : 'Muat Ulang';
        back.innerHTML = `
          <div class="notif-gate-box">
            <div class="notif-gate-ic"><i class="fa-solid fa-bell"></i></div>
            <div class="notif-gate-title">Aktifkan Notifikasi</div>
            <div class="notif-gate-sub">${sub}</div>
            <button id="ngPrimary" class="btn btn-primary w-full mt-1">${primaryLabel}</button>
            ${mode === 'denied' ? '<button id="ngReload" class="btn btn-secondary w-full mt-2">Muat Ulang Halaman</button>' : ''}
          </div>`;
        const attempt = async () => {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') { await subscribePush(reg); back.remove(); resolve(); return; }
          // Masih belum granted. Kalau tadi sudah 'denied' & tetap denied → mentok (reload only).
          render(perm === 'denied' && mode === 'denied' ? 'blocked' : 'denied');
        };
        back.querySelector('#ngPrimary').addEventListener('click', () => {
          if (mode === 'blocked') { location.reload(); return; }
          attempt();
        });
        back.querySelector('#ngReload')?.addEventListener('click', () => location.reload());
      };
      render(Notification.permission === 'denied' ? 'denied' : 'default');
      document.body.appendChild(back);
    })();
  });
}

// ===================== FETCH WRAPPER =====================
// Auto Bearer + parse JSON + lempar error dgn pesan BE.
// 401 hanya memicu logout kalau kita MEMANG sedang pegang token (sesi habis).
// Tanpa token (mis. endpoint /login), 401 cuma dilempar sebagai error biasa
// supaya pemanggil bisa menampilkan pesan — bukan malah redirect (refresh).
export async function api(path, opts = {}) {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }

  if (res.status === 401) {
    if (token) { toast('Sesi habis, silakan login lagi.', 'info'); logout(); }
    throw new Error(json?.message || 'Username atau password salah.');
  }
  if (!res.ok) throw new Error(json?.message || `Error ${res.status}`);
  return json;
}
