// Menu unggulan (FAB tengah bottom-nav) untuk app siswa.
// Drawer berisi: Hafalanku, Galeriku, Nilaiku, Challenge, Toko.
// Semua panel = full-screen overlay yg dibangun sendiri (pola sama dgn openIzinDrawer di api.js).
import { api, toast, modal, logError } from './api.js';

// Origin FRONTEND utama (tempat file media /shop/* & katalog toko dilayani).
// ponytail: hardcoded — sama seperti link toko-kenangan yg dibagikan guru; ganti kalau domain pindah.
const SHOP_ORIGIN = 'https://yuk-ngaji.vercel.app';
const EVENT_COIN = 20; // base koin challenge dari app siswa (event default, tanpa deadline)

const SUBJ = { tajwid: 'Tajwid', fiqih: 'Fiqih', tauhid: 'Tauhid' };
const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const loading = () => '<p class="caption text-center py-10"><i class="fa-solid fa-spinner fa-spin"></i> Memuat…</p>';
const errorState = (m) => `<p class="caption text-center py-10" style="color:var(--danger)">${esc(m || 'Gagal memuat. Coba lagi ya.')}</p>`;
const emptyState = (m) => `<p class="caption text-center py-10">${esc(m)}</p>`;

// ---- Overlay full-screen reusable ----
function fullOverlay(title, subtitle) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:55;background:var(--canvas);display:flex;flex-direction:column;max-width:480px;margin:0 auto;transform:translateY(100%);transition:transform .28s cubic-bezier(.32,.72,0,1);';
  el.innerHTML = `
    <header class="appbar flex items-center gap-3 px-3 py-2.5 shrink-0">
      <button data-close class="text-xl px-1 active:opacity-70" style="color:var(--accent)"><i class="fa-solid fa-arrow-left"></i></button>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-[15px] leading-tight truncate" style="color:var(--ink)">${esc(title)}</div>
        ${subtitle ? `<div class="text-[11px]" style="color:var(--ink-secondary)">${esc(subtitle)}</div>` : ''}
      </div>
      <div data-head-right class="shrink-0"></div>
    </header>
    <div data-body class="flex-1 overflow-y-auto no-scrollbar px-3 py-4"></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.transform = 'translateY(0)'; });
  const close = () => { el.style.transform = 'translateY(100%)'; setTimeout(() => el.remove(), 300); };
  el.querySelector('[data-close]').addEventListener('click', close);
  return { el, body: el.querySelector('[data-body]'), headRight: el.querySelector('[data-head-right]'), close };
}

// ===================== DRAWER MENU (bottom sheet) =====================
export function openMenuDrawer(me) {
  const ITEMS = [
    { key: 'hafalan',   ic: 'fa-book-quran',   color: 'var(--accent)',  label: 'Hafalanku',  desc: 'Lihat progres hafalanmu' },
    { key: 'galeri',    ic: 'fa-images',        color: '#8b5cf6',        label: 'Galeriku',   desc: 'Semua fotomu' },
    { key: 'nilai',     ic: 'fa-table-list',    color: '#0ea5e9',        label: 'Nilaiku',    desc: 'Nilai tiap tugas' },
    { key: 'challenge', ic: 'fa-bolt',          color: '#f59e0b',        label: 'Challenge',  desc: 'Adu cepat ketik, kumpulkan koin' },
    { key: 'toko',      ic: 'fa-store',         color: '#16a34a',        label: 'Toko',       desc: 'Tukar koin dengan kenangan' },
    { key: 'password',  ic: 'fa-key',           color: '#64748b',        label: 'Password',   desc: 'Ganti atau atur ulang password' },
  ];
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `
    <div class="sheet">
      <div class="sheet-grab"></div>
      <div class="modal-title" style="margin-bottom:0.25rem"><i class="fa-solid fa-compass" style="color:var(--accent)"></i> Menu Lainnya</div>
      <div class="caption" style="margin-bottom:0.85rem">Pilih menu yang mau kamu buka</div>
      <div class="flex flex-col gap-2" data-list></div>
    </div>`;
  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add('show'));
  const shut = () => { back.classList.remove('show'); setTimeout(() => back.remove(), 340); };
  back.addEventListener('click', (e) => { if (e.target === back) shut(); });

  const list = back.querySelector('[data-list]');
  ITEMS.forEach(it => {
    const b = document.createElement('button');
    b.className = 'flex items-center gap-3 p-3 rounded-[var(--r-lg)] text-left active:scale-[0.98] transition';
    b.style.cssText = 'background:var(--surface-sunken);border:1px solid var(--divider)';
    b.innerHTML = `
      <span class="w-11 h-11 rounded-[var(--r-md)] flex items-center justify-center text-lg shrink-0" style="background:${it.color}1a;color:${it.color}"><i class="fa-solid ${it.ic}"></i></span>
      <span class="flex-1 min-w-0">
        <span class="block font-bold text-[15px]" style="color:var(--ink)">${it.label}</span>
        <span class="block text-[12px]" style="color:var(--ink-secondary)">${it.desc}</span>
      </span>
      <i class="fa-solid fa-chevron-right text-[12px]" style="color:var(--ink-tertiary)"></i>`;
    b.addEventListener('click', () => { shut(); openPanel(it.key, me); });
    list.appendChild(b);
  });
}

function openPanel(key, me) {
  if (key === 'hafalan') return openHafalan(me);
  if (key === 'galeri') return openGaleri(me);
  if (key === 'nilai') return openNilai(me);
  if (key === 'challenge') return openChallenge(me);
  if (key === 'toko') return openToko(me);
  if (key === 'password') return openPasswordPanel(me);
}

// ===================== HAFALAN =====================
async function openHafalan() {
  const { body } = fullOverlay('Hafalanku', 'Sampai mana hafalanmu 📖');
  body.innerHTML = loading();
  try {
    const r = await api('/api/student/my/memorization');
    const { current, logs } = r.data || {};
    let html = '';
    if (current) {
      const pct = current.total_ayahs ? Math.min(100, Math.round((current.ayah / current.total_ayahs) * 100)) : 0;
      html += `<div class="rounded-[var(--r-lg)] p-4 mb-4" style="background:var(--accent-soft);border:1px solid var(--accent)">
        <div class="text-[12px] font-bold" style="color:var(--accent-strong)"><i class="fa-solid fa-location-dot"></i> Posisi hafalan terakhir</div>
        <div class="text-[24px] font-black mt-1 leading-tight" style="color:var(--ink)">${esc(current.surah_name)}</div>
        <div class="text-[13px]" style="color:var(--ink-secondary)">sampai ayat <b style="color:var(--ink)">${current.ayah}</b> dari ${current.total_ayahs}</div>
        <div class="h-2 rounded-full mt-2.5 overflow-hidden" style="background:rgba(0,0,0,0.08)"><div style="height:100%;width:${pct}%;background:var(--accent);border-radius:999px"></div></div>
      </div>`;
    } else {
      html += `<div class="rounded-[var(--r-lg)] p-4 mb-4 text-center" style="background:var(--surface-sunken)">
        <div class="text-[15px] font-bold" style="color:var(--ink)">Belum ada data hafalan</div>
        <div class="caption mt-1">Hafalanmu akan muncul di sini setelah dicatat Kak Aziz.</div></div>`;
    }
    if (logs && logs.length) {
      html += `<div class="text-[13px] font-bold mb-2 mt-1" style="color:var(--ink)">Riwayat setoran</div>`;
      html += logs.map(l => {
        const d = l.date ? new Date(l.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
        const range = (l.start_ayah && l.end_ayah) ? `ayat ${l.start_ayah}–${l.end_ayah}` : '';
        const added = l.added_ayahs ? `<span class="badge badge-info">+${l.added_ayahs} ayat</span>` : '';
        return `<div class="task-card p-3 mb-2 flex items-center justify-between gap-2">
          <div class="min-w-0"><div class="font-bold text-[14px] truncate" style="color:var(--ink)">${esc(l.surah_name || '-')}</div>
          <div class="caption">${range}${range ? ' · ' : ''}${d}</div></div>${added}</div>`;
      }).join('');
    }
    body.innerHTML = html;
  } catch (e) { logError('Gagal memuat hafalan', e.message); body.innerHTML = errorState(); }
}

// ===================== GALERI =====================
// Akun tertentu (device dipakai bergantian) → galeri dikunci password = nama depan + "1234".
const GALLERY_LOCKED = ['zidan', 'john', 'xaviera'];
async function openGaleri(me) {
  const first = String(me?.name || '').trim().split(/\s+/)[0].toLowerCase();
  if (GALLERY_LOCKED.includes(first)) {
    const pw = await modal({ type: 'warning', title: 'Galeri terkunci 🔒', message: 'Masukkan password untuk membuka galerimu.', input: true, placeholder: 'Password', confirmText: 'Buka', cancelText: 'Batal' });
    if (pw === null) return;
    if (String(pw).trim().toLowerCase() !== first + '1234') {
      await modal({ type: 'danger', title: 'Password salah', message: 'Password tidak cocok. Coba lagi ya.', confirmText: 'OK' });
      return;
    }
  }
  const { body } = fullOverlay('Galeriku', 'Semua fotomu 📸');
  body.innerHTML = loading();
  try {
    const r = await api('/api/student/my/gallery');
    const photos = r.data || [];
    if (!photos.length) { body.innerHTML = emptyState('Belum ada foto di galerimu.'); return; }
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-3 gap-1.5';
    grid.innerHTML = photos.map(p => `<button class="aspect-square rounded-[var(--r-md)] overflow-hidden active:scale-95 transition" style="background:var(--surface-sunken)" data-src="${esc(p.image_url)}">
      <img src="${esc(p.image_url)}" class="w-full h-full object-cover" loading="lazy" alt=""></button>`).join('');
    body.innerHTML = '';
    body.appendChild(grid);
    grid.querySelectorAll('[data-src]').forEach(b => b.addEventListener('click', () => lightbox(b.dataset.src)));
  } catch (e) { logError('Gagal memuat galeri', e.message); body.innerHTML = errorState(); }
}

function lightbox(src, isVideo) {
  const back = document.createElement('div');
  back.style.cssText = 'position:fixed;inset:0;z-index:70;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:1rem';
  back.innerHTML = isVideo
    ? `<video src="${esc(src)}" controls autoplay playsinline style="max-width:100%;max-height:90%;border-radius:12px"></video>`
    : `<img src="${esc(src)}" style="max-width:100%;max-height:90%;object-fit:contain;border-radius:12px" alt="">`;
  back.addEventListener('click', (e) => { if (e.target === back) back.remove(); });
  document.body.appendChild(back);
}

// ===================== NILAI =====================
const PAGE_ROWS = 7;
const scoreColor = (v) => v == null ? 'var(--ink-tertiary)' : v >= 80 ? '#16a34a' : v >= 60 ? '#d97706' : '#e5484d';
const meanOf = (list) => { const v = list.filter(x => x.score != null); return v.length ? Math.round(v.reduce((s, x) => s + Number(x.score), 0) / v.length) : null; };

async function openNilai(me) {
  const { body } = fullOverlay('Nilaiku', 'Nilai tiap tugas 📊');
  body.innerHTML = loading();
  try {
    const r = await api('/api/student/my/grades');
    const rows = r.data || [];
    if (!rows.length) { body.innerHTML = emptyState('Belum ada nilai. Kerjakan tugas dulu ya!'); return; }
    const bySub = {};
    rows.forEach(x => { (bySub[x.subject] = bySub[x.subject] || []).push(x); });
    Object.keys(bySub).forEach(k => bySub[k].sort((a, b) => a.week - b.week));
    const subjects = Object.keys(bySub);

    body.innerHTML = `
      <select id="mnNilaiSel" class="field" style="width:100%">
        ${subjects.map(s => `<option value="${esc(s)}">${esc(SUBJ[s] || s)}</option>`).join('')}
      </select>
      <div id="mnNilaiTable" style="margin-top:0.9rem"></div>
      <button id="mnNilaiWa" class="btn w-full mt-4" style="background:#25D366;color:#fff;border-radius:var(--r-pill);padding:0.85rem 1.5rem;box-shadow:0 6px 18px rgba(37,211,102,0.3)">
        <i class="fa-brands fa-whatsapp"></i> Kirim nilai ke orang tua</button>`;
    const sel = body.querySelector('#mnNilaiSel');
    const tableEl = body.querySelector('#mnNilaiTable');

    // Tabel polos + paginasi maks 7 baris; baris rata-rata terpisah di bawah dgn UI beda.
    const render = (sub) => {
      const list = bySub[sub] || [];
      const mean = meanOf(list);
      let shown = Math.min(PAGE_ROWS, list.length);
      const draw = () => {
        const cell = (v) => v == null
          ? '<span style="font-style:italic;font-weight:600;color:var(--ink-tertiary);font-size:12px">Belum dikerjakan</span>'
          : `<span style="font-weight:800;color:${scoreColor(v)}">${v}</span>`;
        const rowsHtml = list.slice(0, shown).map(x => `<tr style="border-top:1px solid var(--divider)">
            <td style="padding:10px 14px;color:var(--ink)">Pertemuan ${x.week}</td>
            <td style="padding:10px 14px;text-align:right">${cell(x.score)}</td></tr>`).join('');
        tableEl.innerHTML = `
          <div class="rounded-[var(--r-lg)] overflow-hidden" style="border:1px solid var(--divider-strong)">
            <table style="width:100%;border-collapse:collapse;font-size:13.5px">
              <thead><tr style="background:var(--surface-sunken)">
                <th style="text-align:left;padding:9px 14px;color:var(--ink-secondary);font-weight:700">Pertemuan</th>
                <th style="text-align:right;padding:9px 14px;color:var(--ink-secondary);font-weight:700">Nilai</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
          ${shown < list.length ? `<button id="mnNilaiMore" class="btn btn-secondary w-full !py-2 text-[13px] mt-2">Muat lebih (${list.length - shown} lagi)</button>` : ''}
          <div class="flex items-center justify-between mt-3 px-4 py-3 rounded-[var(--r-lg)]" style="background:linear-gradient(135deg,var(--accent),var(--accent-strong));color:var(--on-accent)">
            <span class="text-[13px] font-bold" style="opacity:.9"><i class="fa-solid fa-star"></i> Rata-rata ${esc(SUBJ[sub] || sub)}</span>
            <span class="text-[22px] font-black">${mean ?? '-'}</span>
          </div>`;
        const more = tableEl.querySelector('#mnNilaiMore');
        if (more) more.addEventListener('click', () => { shown = Math.min(shown + PAGE_ROWS, list.length); draw(); });
      };
      draw();
    };
    sel.addEventListener('change', () => render(sel.value));
    render(subjects[0]);

    // Kirim ke ortu: salin laporan semua mapel → buka WhatsApp mode "teruskan" (pilih kontak).
    body.querySelector('#mnNilaiWa').addEventListener('click', () => {
      const nama = me?.name || 'Ananda';
      let msg = `Assalamualaikum, berikut nilai ${nama}:\n`;
      subjects.forEach(s => {
        const list = bySub[s];
        msg += `\n${SUBJ[s] || s}:\n`;
        list.forEach(x => { msg += `- Pertemuan ${x.week}: ${x.score == null ? 'Belum dikerjakan' : x.score}\n`; });
        const m = meanOf(list);
        msg += `Rata-rata: ${m ?? '-'}\n`;
      });
      // Copy fire-and-forget (jaga user-gesture utk buka scheme di iOS), lalu buka WA pemilih kontak.
      try { navigator.clipboard.writeText(msg); } catch {}
      toast('Nilai disalin — pilih kontak orang tua di WhatsApp', 'success');
      window.location.href = 'whatsapp://send?text=' + encodeURIComponent(msg);
    });
  } catch (e) { logError('Gagal memuat nilai', e.message); body.innerHTML = errorState(); }
}

// ===================== CHALLENGE (typing game native) =====================
// Highlight per-huruf ala challenge asli: benar=menyala, belum=redup, salah=merah, huruf berikutnya=caret.
function charHtml(target, inputRaw) {
  const words = String(target).split(' ');
  let html = '', gi = 0;
  for (let w = 0; w < words.length; w++) {
    html += '<span style="display:inline-block;margin-right:0.5rem">';
    for (let c = 0; c < words[w].length; c++) {
      const tc = words[w][c], ic = inputRaw[gi];
      const caret = gi === inputRaw.length ? ';border-bottom:3px solid var(--accent)' : '';
      if (ic === undefined) html += `<span style="color:var(--accent);opacity:.32${caret}">${esc(tc)}</span>`;
      else if (ic.toLowerCase() === tc.toLowerCase()) html += `<span style="color:var(--accent);opacity:1">${esc(tc)}</span>`;
      else html += `<span style="color:var(--accent);opacity:.5;background:#fecaca;border-radius:3px">${esc(tc)}</span>`;
      gi++;
    }
    if (w < words.length - 1) gi++; // lewati spasi (input mengandung spasi)
    html += '</span>';
  }
  return html;
}

const clientChallengeDate = () => {
  const now = new Date();
  if (now.getHours() < 7) now.setDate(now.getDate() - 1); // hari challenge bergeser jam 7 pagi (samakan dgn app utama)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

async function openChallenge() {
  const { body, headRight, close } = fullOverlay('Challenge ⚡', 'Ketik secepat mungkin, dapat koin!');
  const cDate = clientChallengeDate();
  let level = 1, poin = 0, sid = null, todayCoins = 0, completedCount = 0;
  const walletEl = document.createElement('span');
  walletEl.className = 'px-2.5 py-1 rounded-full text-[12px] font-bold';
  walletEl.style.cssText = 'background:var(--warning-soft);color:var(--warning)';
  headRight.appendChild(walletEl);
  const setWallet = (v) => { poin = v; walletEl.innerHTML = `<i class="fa-solid fa-coins"></i> ${v}`; };

  // Cache kalimat + prefetch level berikutnya → transisi antar-level instan (hilangkan lag request).
  const sentCache = {};
  const prefetch = (lvl) => {
    if (lvl < 1 || lvl > 10 || sentCache[lvl]) return;
    api(`/api/daily-challenge/sentence?level=${lvl}`).then(r => { if (r.data) sentCache[lvl] = r.data; }).catch(() => {});
  };
  const getSentence = async (lvl) => {
    if (sentCache[lvl]) return sentCache[lvl];
    const r = await api(`/api/daily-challenge/sentence?level=${lvl}`);
    if (!r.data) throw new Error('Belum ada kalimat untuk level ini.');
    sentCache[lvl] = r.data;
    return r.data;
  };

  body.innerHTML = loading();
  try {
    // id otoritatif dari token (bukan localStorage yg bisa basi) → cegah "Siswa tidak ditemukan".
    sid = (await api('/api/student/me')).data.id;
    const r = await api(`/api/daily-challenge/state?student_id=${sid}&client_date=${cDate}`);
    const d = r.data || {};
    level = d.current_level || 1;
    todayCoins = d.total_coins_earned || 0;
    completedCount = (d.completed_levels || []).length;
    setWallet(d.student?.poin ?? 0);
    landing();
    prefetch(level); // siapkan kalimat level ini sblm user klik Mulai
  } catch (e) { logError('Gagal memuat challenge', e.message); body.innerHTML = errorState(); }

  function landing() {
    if (level > 10) {
      body.innerHTML = `<div class="text-center py-10">
        <div class="text-5xl mb-3">🏆</div>
        <div class="text-xl font-black" style="color:var(--ink)">Selesai hari ini!</div>
        <div class="caption mt-1">Kamu sudah menuntaskan 10 level. Balik lagi besok ya ✨</div>
        <div class="mt-3 text-[13px]" style="color:var(--ink-secondary)">Koin hari ini: <b style="color:var(--warning)">+${todayCoins}</b></div>
      </div>`;
      return;
    }
    body.innerHTML = `<div class="text-center py-8">
        <div class="w-20 h-20 rounded-[var(--r-xl)] mx-auto flex items-center justify-center text-4xl mb-4" style="background:#f59e0b1a;color:#f59e0b"><i class="fa-solid fa-keyboard"></i></div>
        <div class="text-[22px] font-black" style="color:var(--ink)">Level ${level} / 10</div>
        <div class="caption mt-1 mb-1">${completedCount} level selesai hari ini · base <b>${EVENT_COIN} koin</b>/level</div>
        <div class="caption mb-6">Makin cepat ketik, makin besar bonus kombo (sampai ×4)!</div>
        <button id="mnCPlay" class="btn btn-primary !px-10 !py-3 text-[15px]"><i class="fa-solid fa-play"></i> Mulai Level ${level}</button>
      </div>`;
    body.querySelector('#mnCPlay').addEventListener('click', play);
  }

  async function play() {
    body.innerHTML = loading();
    let sentence;
    try { sentence = await getSentence(level); }
    catch (e) {
      body.innerHTML = `<div class="text-center py-10"><div class="caption" style="color:var(--danger)">${esc(e.message || 'Belum ada kalimat untuk level ini.')}</div>
        <button id="mnCBack" class="btn btn-secondary mt-4">Kembali</button></div>`;
      body.querySelector('#mnCBack').addEventListener('click', () => landing());
      return;
    }
    prefetch(level + 1); // siapkan level berikutnya di latar → next instan
    let startedAt = null, done = false;
    const target = sentence.sentence;
    const norm = (t) => String(t).trim().toLowerCase().replace(/\s+/g, ' ');
    body.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="badge" style="background:#f59e0b1a;color:#f59e0b;font-weight:800">Level ${level}${sentence.subject ? ' · ' + esc(sentence.subject) : ''}</span>
        <span class="text-[13px] font-mono font-bold" id="mnCTimer" style="color:var(--ink-secondary)">0.0s</span>
      </div>
      <div class="caption mb-2">Ketik persis kalimatnya — huruf yang benar akan menyala ✨</div>
      <div class="relative rounded-[var(--r-lg)] p-4" style="background:var(--surface-sunken);min-height:150px">
        <div id="mnCVisual" class="text-[22px] font-black leading-[1.7]" style="letter-spacing:.3px"></div>
        <textarea id="mnCInput" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="none"
          class="absolute inset-0 w-full h-full resize-none outline-none"
          style="opacity:0;cursor:text;padding:1rem;font-size:22px;line-height:1.7;background:transparent"></textarea>
      </div>`;
    const input = body.querySelector('#mnCInput');
    const visual = body.querySelector('#mnCVisual');
    const timerEl = body.querySelector('#mnCTimer');
    let timerId = setInterval(() => { if (startedAt) timerEl.textContent = ((Date.now() - startedAt) / 1000).toFixed(1) + 's'; }, 100);
    const draw = () => { visual.innerHTML = charHtml(target, input.value); };
    draw();
    input.addEventListener('input', () => {
      if (!startedAt) startedAt = Date.now();
      if (input.value.includes('  ')) input.value = input.value.replace(/\s\s+/g, ' ');
      draw();
      if (!done && norm(input.value) === norm(target)) { done = true; finish(); }
    });
    setTimeout(() => input.focus(), 60);

    async function finish() {
      clearInterval(timerId);
      input.disabled = true;
      const secs = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 999;
      body.querySelector('#mnCVisual').insertAdjacentHTML('afterend', '<div class="caption text-center mt-3" id="mnCSending"><i class="fa-solid fa-spinner fa-spin"></i> Menyimpan…</div>');
      try {
        const r = await api('/api/daily-challenge/submit-level', { method: 'POST', body: {
          student_id: sid, level, sentence_id: sentence.id, typed_text: input.value,
          time_taken_seconds: secs, client_date: cDate, event_coin: EVENT_COIN,
        }});
        reward(r.data || {});
      } catch (e) {
        done = false; input.disabled = false;
        const s = body.querySelector('#mnCSending');
        if (s) s.outerHTML = `<div class="caption text-center mt-3" style="color:var(--danger)">${esc(e.message || 'Gagal simpan. Ketik ulang huruf terakhir untuk coba lagi.')}</div>`;
        startedAt = startedAt || Date.now();
        timerId = setInterval(() => { if (startedAt) timerEl.textContent = ((Date.now() - startedAt) / 1000).toFixed(1) + 's'; }, 100);
      }
    }
  }

  // Sukses → confetti + modal reward. Setelah OK baru kembali ke overlay (landing level berikutnya).
  async function reward(d) {
    if (typeof d.new_poin === 'number') setWallet(d.new_poin);
    if (d.is_rewarded) { todayCoins += (d.total_reward || 0); completedCount++; }
    const next = d.next_level || (level + 1);
    if (window.confetti && d.is_rewarded) window.confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 }, zIndex: 99999 });
    const combo = d.combo_reward > 0;
    const msg = d.is_rewarded
      ? `Kamu mendapat <b style="color:var(--warning);font-size:22px">+${d.total_reward}</b> koin 🪙${combo ? `<br><span style="color:#f59e0b;font-weight:700">⚡ termasuk bonus kombo +${d.combo_reward}</span>` : ''}`
      : esc(d.message || 'Level ini sudah dimainkan hari ini, jadi tidak dapat koin lagi.');
    await modal({ type: 'info', title: d.is_rewarded ? '🎉 Luar Biasa!' : '👍 Selesai',
      message: msg, confirmText: d.is_daily_completed ? 'Selesai 🏆' : `Lanjut ke Level ${next}` });
    if (d.is_daily_completed) { level = 11; landing(); return; }
    level = next;
    prefetch(level);
    landing();
  }
}

// ===================== TOKO (beli item: foto & video) =====================
// Katalog = subset foto+video dari toko-kenangan (tanpa gacha/scratch/gift).
// filename = kunci beli/owned; url = path media di FRONTEND (SHOP_ORIGIN + url).
const SHOP_ITEMS = [
  { filename: 'ICA.jpg', type: 'photo', url: '/shop/ICA.jpg', cost: 150 },
  { filename: 'LINA.jpg', type: 'photo', url: '/shop/LINA.jpg', cost: 150 },
  { filename: 'NABILA.jpg', type: 'photo', url: '/shop/NABILA.jpg', cost: 150 },
  { filename: 'NADIFAH 2.jpg', type: 'photo', url: '/shop/NADIFAH 2.jpg', cost: 150 },
  { filename: 'NADIFAH.jpg', type: 'photo', url: '/shop/NADIFAH.jpg', cost: 150 },
  { filename: 'PUTRI.jpg', type: 'photo', url: '/shop/PUTRI.jpg', cost: 150 },
  { filename: 'SABIRA.jpg', type: 'photo', url: '/shop/SABIRA.jpg', cost: 150 },
  { filename: 'STIKER.jpg', type: 'photo', url: '/shop/STIKER.png', cost: 150 },
  { filename: 'YASMIN.jpg', type: 'photo', url: '/shop/YASMIN.jpg', cost: 150 },
  { filename: 'ARA.jpg', type: 'photo', url: '/shop/ARA.jpg', cost: 150 },
  { filename: 'NABILA COOL.jpg', type: 'photo', url: '/shop/NABILA COOL.png', cost: 150 },
  { filename: 'SALSA.jpg', type: 'photo', url: '/shop/SALSA.jpg', cost: 150 },
  { filename: 'AINI.mp4', type: 'video', url: '/shop/AINI.mp4', cost: 700 },
  { filename: 'DIRA.mp4', type: 'video', url: '/shop/DIRA.mp4', cost: 700 },
  { filename: 'HAIDAR.mp4', type: 'video', url: '/shop/HAIDAR.mp4', cost: 700 },
  { filename: 'WAWA.mp4', type: 'video', url: '/shop/WAWA.mp4', cost: 700 },
];

async function openToko(me) {
  const { body, headRight } = fullOverlay('Toko Kenangan 🛍️', 'Tukar koinmu dengan foto & video');
  const walletEl = document.createElement('span');
  walletEl.className = 'px-2.5 py-1 rounded-full text-[12px] font-bold';
  walletEl.style.cssText = 'background:var(--warning-soft);color:var(--warning)';
  headRight.appendChild(walletEl);
  let poin = 0, owned = [], sid = null;
  const setWallet = (v) => { poin = v; walletEl.innerHTML = `<i class="fa-solid fa-coins"></i> ${v}`; };

  body.innerHTML = loading();
  try {
    const meRes = await api('/api/student/me');
    sid = meRes.data.id; // id otoritatif dari token
    setWallet(meRes.data?.poin ?? 0);
    const unlockedRes = await api(`/api/digital-rewards/unlocked/${sid}`);
    owned = (unlockedRes.data || []).map(x => x.filename || x); // unlocked = array filename
    render();
  } catch (e) { logError('Gagal memuat toko', e.message); body.innerHTML = errorState(); }

  function render() {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-2.5';
    grid.innerHTML = SHOP_ITEMS.map((it, i) => {
      const isOwned = owned.includes(it.filename);
      const media = SHOP_ORIGIN + it.url;
      const isVideo = it.type === 'video';
      const thumb = isOwned
        ? (isVideo ? `<div class="w-full h-full flex items-center justify-center" style="background:#000"><i class="fa-solid fa-circle-play text-3xl" style="color:#fff"></i></div>`
                   : `<img src="${esc(media)}" class="w-full h-full object-cover" loading="lazy" alt="">`)
        : `<div class="w-full h-full flex flex-col items-center justify-center" style="background:var(--surface-sunken)">
             <i class="fa-solid fa-lock text-2xl" style="color:var(--ink-tertiary)"></i></div>`;
      const badge = isVideo ? '<span class="badge" style="background:#0006;color:#fff;position:absolute;top:6px;left:6px"><i class="fa-solid fa-video"></i> Video</span>' : '';
      const foot = isOwned
        ? `<button class="btn btn-secondary w-full !py-2 text-[12px]" data-view="${i}"><i class="fa-solid fa-eye"></i> Lihat</button>`
        : `<button class="btn btn-primary w-full !py-2 text-[12px]" data-buy="${i}"><i class="fa-solid fa-coins"></i> ${it.cost}</button>`;
      return `<div class="task-card !p-0 overflow-hidden">
        <div class="relative aspect-square">${thumb}${badge}${isOwned ? '<span class="badge" style="background:#16a34a;color:#fff;position:absolute;top:6px;right:6px"><i class="fa-solid fa-check"></i></span>' : ''}</div>
        <div class="p-2">${foot}</div></div>`;
    }).join('');
    body.innerHTML = '';
    body.appendChild(grid);
    grid.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
      const it = SHOP_ITEMS[+b.dataset.view];
      lightbox(SHOP_ORIGIN + it.url, it.type === 'video');
    }));
    grid.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => buy(SHOP_ITEMS[+b.dataset.buy], b)));
  }

  async function buy(it, btn) {
    if (poin < it.cost) {
      modal({ type: 'warning', title: 'Koin belum cukup', message: `Butuh <b>${it.cost}</b> koin, kamu punya <b>${poin}</b>. Kumpulkan lagi dari tugas & challenge ya!`, confirmText: 'OK' });
      return;
    }
    const ok = await modal({ type: 'info', title: 'Beli item ini?', message: `Tukar <b>${it.cost} koin</b> untuk membuka ${it.type === 'video' ? 'video' : 'foto'} kenangan ini?`, confirmText: 'Beli', cancelText: 'Batal' });
    if (!ok) return;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
      const r = await api('/api/digital-rewards/buy', { method: 'POST', body: { student_id: sid, filename: it.filename, type: it.type, cost: it.cost } });
      if (typeof r.data?.new_poin === 'number') setWallet(r.data.new_poin);
      owned.push(it.filename);
      toast('Item terbuka! 🎉', 'success');
      render();
    } catch (e) {
      logError('Gagal beli item', e.message);
      modal({ type: 'danger', title: 'Gagal', message: e.message || 'Coba lagi ya.', confirmText: 'OK' });
      render();
    }
  }
}
