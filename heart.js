(() => {
  'use strict';

  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const TAU = Math.PI * 2;
  const overlayEl = document.getElementById('overlay');
  const hintEl = document.getElementById('hint');
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');
  const celebrationEl = document.getElementById('celebration');
  const introEl = document.getElementById('intro');
  const envelopeEl = document.getElementById('envelope');
  const notesStage = document.getElementById('notes-stage');
  const toHeartBtn = document.getElementById('toHeartBtn');
  const storyEl = document.getElementById('story');
  const storyInner = document.getElementById('story-inner');
  const scrollCueEl = document.getElementById('scrollCue');
  const CONTENT = window.LOVE_CONTENT || {};
  const LETTER = CONTENT.letter || {};
  const PHOTOS = Array.isArray(CONTENT.photos) ? CONTENT.photos : [];

  let W = 0;
  let H = 0;
  let DPR = 1;
  let CX = 0;
  let CY = 0;
  let baseScale = 1;
  let lastBeat = 1;
  let t = 0;
  let hold = null;
  let holdTimer = 0;
  let pointerX = 0;
  let pointerY = 0;
  let viewShiftX = 0;
  let viewShiftY = 0;
  let keyBuf = '';
  let audioCtx = null;

  let phase = 'heart';
  let phaseT = 0;
  let targets = null;
  let secretLocked = false;
  let awaitingProposal = false;
  let proposalOpen = false;
  let noClicks = 0;
  let yesScale = 1;
  let noScale = 1;
  let celebrateAt = -99;
  let hintTimer = null;
  let celebrationTimer = null;
  let started = false;
  let notesSpawned = false;
  let storyBuilt = false;
  let storyOpen = false;
  let storyObserver = null;
  let cueTimer = null;

  const MOVE_DUR = 2.1;
  const TEXT_DUR = 4.8;
  const GLOW_DUR = 1.1;
  const SECRET_CODE = '5201314';
  const NO_LABELS = ['不愿意', '再想想嘛', '真的不要吗', '呜呜呜', '不可以拒绝哦', '认命吧'];
  const LOVE_NOTES = [
    '遇见你之后，风都是甜的',
    '今天也想见你',
    '你是我藏在星星里的心动',
    '想把所有的温柔都给你',
    '晚安，我梦里也有你',
    '和你在一起，每天都是好天气',
    '你一笑，我的世界就亮了',
    '我喜欢你，比昨天多一点，比明天少一点',
    '宇宙很大，我只想围着你转',
    '你是我的例外和偏爱',
    '想和你一起，看很久很久的星星',
    '你一来，花就开了',
    '你的名字，是我写过最美的字',
    '想牵你的手，走很久很久',
    '每天醒来，第一个想到的都是你',
    '你在我心里，住了很久了',
    '所有浪漫的事，都想和你做一遍',
    '你回头看我的时候，星星都在躲',
    '春风十里，不如你',
    '想把月亮摘给你，再把星星铺成路',
    '我爱你，不是说说而已',
    '你是我枯燥生活里的糖',
    '和你说话的时候，时间都变慢了',
    '我的愿望很简单：你在身边',
    '你笑的时候，我的世界都亮了',
    '无论多晚，我都会等你',
    '你是我永远的心动',
    '遇见你，是我最大的运气',
    '想陪你从清晨到日暮',
    '我的未来计划里，每一页都有你',
    '你是我的光',
    '今天也是超级喜欢你的一天',
    '你不在的时候，我在想你',
    '一起看雪、看海、看日落，好不好',
    '你是我心里最柔软的地方',
    '往后余生，都是你',
    '你是我写过最长的情书',
    '心跳的节奏，都是你的名字',
    '想把你介绍给每一颗星星',
    '喜欢你这件事，藏不住',
    '你是春天，也是月光',
    '我的开心和难过，都想第一个告诉你',
    '你靠近一点，我的心就软一点',
    '想成为你生活里最温柔的日常',
    '你是答案，也是起点',
    '我们之间，连沉默都刚好',
    '你的手，我想牵一辈子',
    '只要是你，晚一点也没关系',
  ];
  const NOTES_SOURCE = Array.isArray(CONTENT.notes) && CONTENT.notes.length ? CONTENT.notes : LOVE_NOTES;
  const NOTE_COLORS = ['#fff3d6', '#ffdce5', '#d9f2ec', '#e3dcff', '#d9ecff', '#ffe9d1', '#ffd9c9'];
  const HIDDEN_TEXT = [0x59d0, 0x59d0, 0x5927, 0x4eba, 0xff0c, 0x6211, 0x559c, 0x6b22, 0x4f60]
    .map((code) => String.fromCharCode(code));

  const PALETTE = ['#ff5f7e', '#ff8a5c', '#ffd166', '#ff9eb5', '#ff3d6e', '#6fe3e3', '#fff6f7'];
  const SPRITES = PALETTE.map(makeSprite);

  const P = {
    count: 0,
    bx: new Float32Array(0),
    by: new Float32Array(0),
    ph: new Float32Array(0),
    sp: new Float32Array(0),
    sz: new Float32Array(0),
    dr: new Float32Array(0),
    ci: new Uint8Array(0),
    tw: new Float32Array(0),
    edge: new Uint8Array(0),
  };

  let bgLayer = null;
  let glowLayer = null;
  let stars = [];
  let embers = [];
  let sparks = [];
  let shooting = null;
  let nextShootAt = 4;

  // ---------- helpers ----------

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function makeSprite(hex) {
    const s = 64;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const g = c.getContext('2d');
    const rgb = hexToRgb(hex);
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`);
    grad.addColorStop(0.22, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
    grad.addColorStop(0.55, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.18)`);
    grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return c;
  }

  function lerp(a, b, u) {
    return a + (b - a) * u;
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function easeInOut(u) {
    return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  }

  // ---------- heart geometry ----------

  function heartInside(x, y) {
    const xx = x * x;
    const yy = y * y;
    const s = xx + yy - 1;
    return s * s * s - xx * yy * yy <= 0;
  }

  function sampleHeart() {
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 2.7 - 1.35;
      const y = Math.random() * 2.5 - 1.28;
      if (heartInside(x, y)) return [x, y];
    }
    return [0, 0.2];
  }

  function heartEdge() {
    const a = Math.random() * TAU;
    return [
      1.12 * Math.pow(Math.sin(a), 3),
      (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16.5,
    ];
  }

  // ---------- setup ----------

  function buildBackground() {
    bgLayer = document.createElement('canvas');
    bgLayer.width = Math.max(2, Math.round(W * DPR));
    bgLayer.height = Math.max(2, Math.round(H * DPR));
    const g = bgLayer.getContext('2d');
    g.scale(DPR, DPR);

    const base = g.createLinearGradient(0, 0, W * 0.9, H);
    base.addColorStop(0, '#070313');
    base.addColorStop(0.42, '#140a20');
    base.addColorStop(0.72, '#241021');
    base.addColorStop(1, '#0e0718');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);

    const wash = g.createLinearGradient(W * 0.08, H * 0.78, W * 0.92, H * 0.12);
    wash.addColorStop(0, 'rgba(255,84,124,0.10)');
    wash.addColorStop(0.45, 'rgba(144,66,148,0.06)');
    wash.addColorStop(1, 'rgba(60,190,190,0.07)');
    g.fillStyle = wash;
    g.fillRect(0, 0, W, H);

    const vignette = g.createLinearGradient(0, 0, W, H);
    vignette.addColorStop(0, 'rgba(0,0,0,0.55)');
    vignette.addColorStop(0.5, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = vignette;
    g.fillRect(0, 0, W, H);

    g.fillStyle = '#ffffff';
    for (let i = 0; i < 140; i++) {
      g.globalAlpha = 0.06 + Math.random() * 0.24;
      g.beginPath();
      g.arc(Math.random() * W, Math.random() * H, 0.2 + Math.random() * 0.9, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  function buildStars() {
    stars = [];
    const colors = ['#ffffff', '#ffe9b0', '#bdf4f4', '#ffd9e2'];
    for (let i = 0; i < 110; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.5 + Math.random() * 1.3,
        ph: Math.random() * TAU,
        sp: 0.4 + Math.random() * 1.6,
        a: 0.25 + Math.random() * 0.6,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * TAU;
      const ex = Math.pow(Math.sin(ang), 3);
      const ey = (13 * Math.cos(ang) - 5 * Math.cos(2 * ang) - 2 * Math.cos(3 * ang) - Math.cos(4 * ang)) / 16.5;
      stars.push({
        x: CX + ex * baseScale * 1.12,
        y: CY - ey * baseScale * 1.12,
        r: 0.9 + Math.random() * 0.6,
        ph: Math.random() * TAU,
        sp: 0.5 + Math.random() * 0.8,
        a: 0.55,
        color: '#ffd9e2',
      });
    }
  }

  function spawnEmbers() {
    embers = [];
    const n = Math.min(46, Math.max(24, Math.floor((W * H) / 38000)));
    for (let i = 0; i < n; i++) {
      embers.push({
        x: Math.random() * W,
        y: H + 10 + Math.random() * 60,
        sp: 8 + Math.random() * 18,
        ph: Math.random() * TAU,
        r: 0.8 + Math.random() * 1.5,
        ci: Math.random() < 0.8 ? 2 : 5,
      });
    }
  }

  function buildHeartGlow() {
    glowLayer = document.createElement('canvas');
    const s = 512;
    glowLayer.width = s;
    glowLayer.height = s;
    const g = glowLayer.getContext('2d');
    const pts = [];
    const steps = 220;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * TAU;
      const x = 16 * Math.pow(Math.sin(a), 3);
      const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      pts.push([s / 2 + (x / 16) * s * 0.42, s / 2 - (y / 17) * s * 0.42]);
    }
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= steps; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    const grad = g.createRadialGradient(s / 2, s / 2, s * 0.04, s / 2, s / 2, s * 0.44);
    grad.addColorStop(0, 'rgba(255,95,126,0.55)');
    grad.addColorStop(0.5, 'rgba(255,120,150,0.22)');
    grad.addColorStop(1, 'rgba(255,150,175,0)');
    g.fillStyle = grad;
    g.fill();
  }

  function initParticles() {
    let count = Math.floor((W * H) / 600);
    count = Math.max(900, Math.min(3000, count));
    P.count = count;
    P.bx = new Float32Array(count);
    P.by = new Float32Array(count);
    P.ph = new Float32Array(count);
    P.sp = new Float32Array(count);
    P.sz = new Float32Array(count);
    P.dr = new Float32Array(count);
    P.ci = new Uint8Array(count);
    P.tw = new Float32Array(count);
    P.edge = new Uint8Array(count);

    for (let i = 0; i < count; i++) {
      const edge = Math.random() < 0.22;
      const pt = edge ? heartEdge() : sampleHeart();
      P.bx[i] = pt[0];
      P.by[i] = pt[1];
      P.ph[i] = Math.random() * TAU;
      P.sp[i] = 0.15 + Math.random() * 0.45;
      if (edge) {
        P.sz[i] = 4.4 + Math.random() * 3.4;
        P.edge[i] = 1;
      } else {
        P.sz[i] = 1.8 + Math.random() * 3.4;
      }
      P.dr[i] = 0.03 + Math.random() * 0.1;
      P.ci[i] = (Math.random() * PALETTE.length) | 0;
      P.tw[i] = Math.random() * TAU;
    }
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2;
    CY = H / 2;
    baseScale = Math.min(W, H) * 0.33;
    buildBackground();
    buildStars();
    spawnEmbers();
    buildHeartGlow();
    initParticles();
    sparks.length = 0;
    if (phase !== 'heart') buildTextTargets();
  }

  // ---------- secret ----------

  function buildTextTargets() {
    const ow = 1180;
    const oh = 380;
    const off = document.createElement('canvas');
    off.width = ow * 2;
    off.height = oh * 2;
    const g = off.getContext('2d');
    g.scale(2, 2);
    g.fillStyle = '#ffffff';
    g.font = `${Math.floor(ow / 9.5)}px "KaiTi","STKaiti","Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(HIDDEN_TEXT.join(''), ow / 2, oh / 2);

    const data = g.getImageData(0, 0, off.width, off.height).data;
    const raw = [];
    for (let y = 0; y < off.height; y += 2) {
      for (let x = 0; x < off.width; x += 2) {
        if (data[(y * off.width + x) * 4 + 3] > 150) raw.push([x * 0.5, y * 0.5]);
      }
    }
    for (let i = raw.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = raw[i];
      raw[i] = raw[j];
      raw[j] = tmp;
    }

    targets = new Float32Array(P.count * 2);
    const k = Math.min((W * 0.94) / ow, (H * 0.46) / oh);
    const n = Math.min(P.count, raw.length);
    for (let i = 0; i < n; i++) {
      targets[i * 2] = CX + (raw[i][0] - ow / 2) * k;
      targets[i * 2 + 1] = CY * 0.95 + (raw[i][1] - oh / 2) * k;
    }
    for (let i = n; i < P.count; i++) {
      targets[i * 2] = CX + (Math.random() - 0.5) * 12;
      targets[i * 2 + 1] = CY + (Math.random() - 0.5) * 12;
    }
  }

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return true;
    } catch (_) {
      return false;
    }
  }

  function tone(freq, at, dur, vol) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(vol, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(at);
      osc.stop(at + dur + 0.05);
    } catch (_) {
      // audio is optional
    }
  }

  function chime() {
    if (!ensureAudio()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99];
    notes.forEach((freq, i) => tone(freq, audioCtx.currentTime + i * 0.11, 1.3, 0.11));
  }

  function playNoSound() {
    if (!ensureAudio()) return;
    const at = audioCtx.currentTime;
    tone(311.13, at, 0.35, 0.09);
    tone(233.08, at + 0.12, 0.45, 0.09);
  }

  function playYesSound() {
    if (!ensureAudio()) return;
    const at = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => tone(freq, at + i * 0.09, 1.1, 0.12));
  }

  function triggerSecret() {
    if (!started || phase !== 'heart' || secretLocked) return;
    secretLocked = true;
    buildTextTargets();
    phase = 'glow';
    phaseT = 0;
    hold = null;
    holdTimer = 0;
    keyBuf = '';
    chime();
    if (navigator.vibrate) navigator.vibrate(70);
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * TAU;
      const sp = 70 + Math.random() * 60;
      sparks.push({
        x: CX,
        y: CY,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 30,
        life: 0.9 + Math.random() * 0.5,
        decay: 0.55 + Math.random() * 0.3,
        ci: i % 2 === 0 ? 2 : 5,
        r: 1.2 + Math.random() * 1.2,
      });
    }
    console.log('%c姐姐大人，我喜欢你', 'color:#ff5f7e;font-weight:bold;font-size:18px;');
  }

  function showHint() {
    hintEl.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hintEl.classList.remove('show'), 4000);
  }

  function hideHint() {
    clearTimeout(hintTimer);
    hintEl.classList.remove('show');
  }

  function pickNotes(count) {
    const pool = NOTES_SOURCE.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, count);
  }

  function buildStory() {
    if (storyBuilt) return;
    storyBuilt = true;
    const frag = document.createDocumentFragment();

    if (LETTER.to) {
      const h = document.createElement('p');
      h.className = 'story-title reveal-target';
      h.textContent = LETTER.to;
      frag.appendChild(h);
    }

    const paras = Array.isArray(LETTER.paragraphs) ? LETTER.paragraphs : [];
    for (const text of paras) {
      const p = document.createElement('p');
      p.className = 'para reveal-target';
      p.textContent = text;
      frag.appendChild(p);
    }

    if (LETTER.signature) {
      const sign = document.createElement('div');
      sign.className = 'story-sign reveal-target';
      sign.textContent = LETTER.signature;
      frag.appendChild(sign);
    }

    for (const item of PHOTOS) {
      if (!item || (!item.src && !item.text)) continue;
      const card = document.createElement('figure');
      card.className = 'photo-card reveal-target';

      const frame = document.createElement('div');
      frame.className = 'photo-frame pending';

      if (item.type === 'video') {
        const video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.controls = true;
        video.preload = 'auto';
        video.src = item.src;
        video.addEventListener('loadeddata', () => frame.classList.remove('pending'));
        video.addEventListener('error', () => frame.classList.add('pending'));
        frame.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.decoding = 'async';
        img.alt = '';
        img.addEventListener('load', () => frame.classList.remove('pending'));
        img.addEventListener('error', () => frame.classList.add('pending'));
        if (item.src) img.src = item.src;
        frame.appendChild(img);
      }

      const ph = document.createElement('span');
      ph.className = 'placeholder';
      ph.textContent = '这里等一张照片';
      frame.appendChild(ph);

      if (item.label) {
        const label = document.createElement('span');
        label.className = 'photo-label';
        label.textContent = item.label;
        frame.appendChild(label);
      }
      card.appendChild(frame);

      if (item.text) {
        const cap = document.createElement('figcaption');
        cap.className = 'photo-text';
        cap.textContent = item.text;
        card.appendChild(cap);
      }
      frag.appendChild(card);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'story-btn reveal-target';
    btn.textContent = LETTER.nextLabel || '还有些小纸条，想给你看';
    btn.addEventListener('click', closeStory);
    frag.appendChild(btn);

    storyInner.appendChild(frag);
    observeStory();

    const settleFrames = setInterval(() => {
      const frames = storyInner.querySelectorAll('.photo-frame.pending');
      let dirty = false;
      for (const frame of frames) {
        const img = frame.querySelector('img');
        const video = frame.querySelector('video');
        const done = img
          ? (img.complete && img.naturalWidth > 0)
          : video && video.readyState >= 2;
        if (done) {
          frame.classList.remove('pending');
          dirty = true;
        }
      }
      if (!dirty || !storyInner.querySelector('.photo-frame.pending')) clearInterval(settleFrames);
    }, 400);
  }

  function observeStory() {
    const targets = storyInner.querySelectorAll('.reveal-target');
    if (!('IntersectionObserver' in window)) {
      for (const el of targets) el.classList.add('reveal');
      return;
    }
    storyObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal');
          storyObserver.unobserve(entry.target);
        }
      }
    }, { root: storyEl, rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    for (const el of targets) storyObserver.observe(el);
  }

  function openStory() {
    if (storyOpen) return;
    storyOpen = true;
    buildStory();
    for (const item of PHOTOS) {
      if (item && item.src && item.type !== 'video') {
        const warm = new Image();
        warm.decoding = 'async';
        warm.src = item.src;
      }
    }
    storyEl.scrollTop = 0;
    storyEl.classList.add('show');
    storyEl.setAttribute('aria-hidden', 'false');
    clearTimeout(cueTimer);
    cueTimer = setTimeout(() => scrollCueEl.classList.add('show'), 2200);
    storyEl.addEventListener('scroll', onStoryScroll, { passive: true });
  }

  function onStoryScroll() {
    if (storyEl.scrollTop > 40) {
      clearTimeout(cueTimer);
      scrollCueEl.classList.remove('show');
    }
  }

  function closeStory() {
    if (!storyOpen) return;
    storyOpen = false;
    clearTimeout(cueTimer);
    scrollCueEl.classList.remove('show');
    storyEl.classList.remove('show');
    storyEl.setAttribute('aria-hidden', 'true');
    storyEl.removeEventListener('scroll', onStoryScroll);
    ensureAudio();
    setTimeout(spawnNotes, 700);
  }

  function resetStory() {
    storyOpen = false;
    clearTimeout(cueTimer);
    scrollCueEl.classList.remove('show');
    storyEl.classList.remove('show');
    storyEl.setAttribute('aria-hidden', 'true');
    storyEl.removeEventListener('scroll', onStoryScroll);
    if (storyObserver) {
      storyObserver.disconnect();
      storyObserver = null;
    }
    storyBuilt = false;
    storyInner.innerHTML = '';
    storyEl.scrollTop = 0;
  }

  function openEnvelope() {
    if (started || notesSpawned) return;
    envelopeEl.classList.add('open');
    setTimeout(openStory, 900);
  }

  function computeNoteTargets(count) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const isMobile = W < 520;
    const cols = isMobile ? 4 : 6;
    const rows = Math.ceil(count / cols);
    const spanX = isMobile ? 0.8 : 0.86;
    const spanY = 0.72;
    const pts = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      let x = W * (0.10 + spanX * col / Math.max(1, cols - 1)) + (Math.random() - 0.5) * W * 0.03;
      let y = H * (0.08 + spanY * row / Math.max(1, rows - 1)) + (Math.random() - 0.5) * H * 0.03;
      x = Math.max(70, Math.min(W - 70, x));
      y = Math.max(56, Math.min(H - 110, y));
      pts.push([x, y]);
    }
    return pts;
  }

  function spawnNotes() {
    if (notesSpawned) return;
    notesSpawned = true;
    const rect = envelopeEl.getBoundingClientRect();
    envelopeEl.classList.add('burst');
    const envX = rect.left + rect.width / 2;
    const envY = rect.top + rect.height / 2;
    const isMobile = window.innerWidth < 520;
    const count = Math.min(isMobile ? 20 : 36, NOTES_SOURCE.length);
    const size = isMobile ? 100 : 118;
    const targets = computeNoteTargets(count);
    const notes = pickNotes(count);
    for (let i = 0; i < count; i++) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = notes[i];
      notes[i] = notes[j];
      notes[j] = tmp;
    }
    targets.forEach((target, i) => {
      const note = document.createElement('div');
      note.className = 'note';
      note.style.left = target[0] + 'px';
      note.style.top = target[1] + 'px';
      note.style.width = size + 'px';
      note.style.height = size + 'px';
      note.style.marginLeft = (-size / 2) + 'px';
      note.style.marginTop = (-size / 2) + 'px';
      note.style.setProperty('--dx', (envX - target[0]) + 'px');
      note.style.setProperty('--dy', (envY - target[1]) + 'px');
      note.style.setProperty('--rot', (Math.random() * 24 - 12).toFixed(1) + 'deg');
      note.style.background = NOTE_COLORS[i % NOTE_COLORS.length];
      note.style.transitionDelay = (0.045 * i).toFixed(2) + 's';
      note.textContent = notes[i];
      note.setAttribute('aria-hidden', 'true');
      notesStage.appendChild(note);
      requestAnimationFrame(() => requestAnimationFrame(() => note.classList.add('land')));
    });
    const lastDelay = 0.045 * count + 1.1;
    setTimeout(() => toHeartBtn.classList.add('show'), lastDelay * 1000);
  }

  function continueToHeart() {
    if (started) return;
    started = true;
    toHeartBtn.classList.remove('show');
    const notes = notesStage.querySelectorAll('.note');
    for (const note of notes) {
      note.style.transitionDelay = '0s';
      note.classList.add('leave');
    }
    setTimeout(() => {
      introEl.classList.add('hide');
      introEl.setAttribute('aria-hidden', 'true');
      notesStage.innerHTML = '';
    }, 650);
  }

  function startProposal() {
    if (!started || proposalOpen) return;
    proposalOpen = true;
    awaitingProposal = false;
    keyBuf = '';
    hideHint();
    overlayEl.classList.add('show');
    overlayEl.setAttribute('aria-hidden', 'false');
    chime();
    if (navigator.vibrate) navigator.vibrate(60);
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * TAU;
      const sp = 60 + Math.random() * 60;
      sparks.push({
        x: CX,
        y: CY,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 40,
        life: 1.1 + Math.random() * 0.6,
        decay: 0.5 + Math.random() * 0.3,
        ci: i % 2 === 0 ? 2 : 5,
        r: 1.1 + Math.random() * 1.2,
      });
    }
  }

  function onNoClick(e) {
    e.preventDefault();
    e.stopPropagation();
    noClicks++;
    yesScale = Math.min(2.6, yesScale * 1.18);
    noScale = Math.max(0.38, noScale * 0.8);
    yesBtn.style.transform = 'scale(' + yesScale.toFixed(3) + ')';
    noBtn.style.transform = 'scale(' + noScale.toFixed(3) + ') translate(' +
      (Math.random() * 24 - 12).toFixed(1) + 'px,' + (Math.random() * 24 - 12).toFixed(1) + 'px)';
    noBtn.textContent = NO_LABELS[Math.min(noClicks, NO_LABELS.length - 1)];
    noBtn.style.opacity = noScale <= 0.45 ? '0.35' : '1';
    playNoSound();
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function onYesClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!proposalOpen) return;
    proposalOpen = false;
    overlayEl.classList.remove('show');
    overlayEl.setAttribute('aria-hidden', 'true');
    celebrationEl.classList.add('show');
    celebrationEl.setAttribute('aria-hidden', 'false');
    celebrateAt = t;
    clearTimeout(celebrationTimer);
    celebrationTimer = setTimeout(resetToIntro, 8000);
    playYesSound();
    if (navigator.vibrate) navigator.vibrate([40, 70, 50]);
    for (let i = 0; i < 110; i++) {
      const ang = Math.random() * TAU;
      const sp = 40 + Math.random() * 150;
      sparks.push({
        x: CX + (Math.random() - 0.5) * baseScale,
        y: CY + (Math.random() - 0.5) * baseScale,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 30,
        life: 1.2 + Math.random() * 1.2,
        decay: 0.45 + Math.random() * 0.35,
        ci: (Math.random() * PALETTE.length) | 0,
        r: 1.2 + Math.random() * 2.0,
      });
    }
  }

  function hideCelebration() {
    clearTimeout(celebrationTimer);
    celebrationEl.classList.remove('show');
    celebrationEl.setAttribute('aria-hidden', 'true');
  }

  function resetToIntro() {
    clearTimeout(celebrationTimer);
    clearTimeout(hintTimer);
    hideCelebration();
    if (proposalOpen) {
      overlayEl.classList.remove('show');
      overlayEl.setAttribute('aria-hidden', 'true');
    }
    proposalOpen = false;
    awaitingProposal = false;
    secretLocked = false;
    noClicks = 0;
    yesScale = 1;
    noScale = 1;
    yesBtn.style.transform = '';
    noBtn.style.transform = '';
    noBtn.style.opacity = '1';
    noBtn.textContent = NO_LABELS[0];
    phase = 'heart';
    phaseT = 0;
    targets = null;
    keyBuf = '';
    hold = null;
    holdTimer = 0;
    celebrateAt = -99;
    started = false;
    notesSpawned = false;
    notesStage.innerHTML = '';
    resetStory();
    envelopeEl.classList.remove('open', 'burst');
    introEl.classList.remove('hide');
    introEl.setAttribute('aria-hidden', 'false');
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function spawnBurst() {
    const a = Math.random() * TAU;
    const ex = 1.12 * Math.pow(Math.sin(a), 3);
    const ey = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16.5;
    const x = CX + viewShiftX + ex * baseScale * lastBeat;
    const y = CY + viewShiftY - ey * baseScale * lastBeat;
    const baseAngle = Math.atan2(-ey, ex) + (Math.random() - 0.5) * 1.6;
    const n = 6 + ((Math.random() * 7) | 0);
    for (let i = 0; i < n; i++) {
      const ang = baseAngle + (Math.random() - 0.5) * 2.2;
      const sp = 20 + Math.random() * 45;
      sparks.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.9 + Math.random() * 1.0,
        decay: 0.55 + Math.random() * 0.4,
        ci: (Math.random() * PALETTE.length) | 0,
        r: 1 + Math.random() * 1.6,
      });
    }
  }

  // ---------- update / draw ----------

  function update(dt) {
    lastBeat = 1 + 0.022 * Math.sin(t * 0.5) + 0.009 * Math.sin(t * 1.1 + 0.8);

    const px = pointerX / Math.max(1, W) - 0.5;
    const py = pointerY / Math.max(1, H) - 0.5;
    viewShiftX += (px * 24 - viewShiftX) * Math.min(1, dt * 3.2);
    viewShiftY += (py * 16 - viewShiftY) * Math.min(1, dt * 3.2);

    if (phase !== 'heart') {
      phaseT += dt;
      if (phase === 'glow' && phaseT >= GLOW_DUR) {
        phase = 'toText';
        phaseT = 0;
      } else if (phase === 'toText' && phaseT >= MOVE_DUR) {
        phase = 'text';
        phaseT = 0;
      } else if (phase === 'text' && phaseT >= TEXT_DUR) {
        phase = 'toHeart';
        phaseT = 0;
      } else if (phase === 'toHeart' && phaseT >= MOVE_DUR) {
        phase = 'heart';
        phaseT = 0;
        secretLocked = false;
        if (!proposalOpen) {
          awaitingProposal = true;
          showHint();
        }
      }
    }

    for (const e of embers) {
      e.y -= e.sp * dt;
      e.x += Math.sin(t * 0.9 + e.ph) * 0.28;
      if (e.y < -30) {
        e.y = H + 20;
        e.x = Math.random() * W;
      }
    }

    if (sparks.length < 100 && Math.random() < dt * 2.4) spawnBurst();
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 1 - dt * 1.2;
      s.vy *= 1 - dt * 1.2;
      s.vy += 26 * dt;
      s.life -= s.decay * dt;
      if (s.life <= 0) sparks.splice(i, 1);
    }

    if (!shooting && t > nextShootAt) {
      const fromLeft = Math.random() < 0.5;
      shooting = {
        x: fromLeft ? -40 : W + 40,
        y: Math.random() * H * 0.3 + 10,
        vx: (fromLeft ? 1 : -1) * (320 + Math.random() * 260),
        vy: (Math.random() < 0.5 ? 1 : -1) * (40 + Math.random() * 60),
        life: 1.1,
      };
      nextShootAt = t + 5 + Math.random() * 7;
    }
    if (shooting) {
      shooting.x += shooting.vx * dt;
      shooting.y += shooting.vy * dt;
      shooting.life -= dt;
      if (shooting.life <= 0) shooting = null;
    }

    if (hold && phase === 'heart') {
      holdTimer += dt;
      if (holdTimer >= 1.25 && Math.hypot(hold.x - pointerX, hold.y - pointerY) < 130) {
        if (awaitingProposal) startProposal();
        else triggerSecret();
      }
    }
  }

  function draw() {
    ctx.drawImage(bgLayer, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const fadeIn = clamp01(t / 1.6);

    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
      ctx.globalAlpha = s.a * (0.35 + 0.65 * tw);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }

    if (shooting && shooting.life > 0) {
      const tail = 0.16 + shooting.life * 0.05;
      const gx1 = shooting.x - shooting.vx * tail * 0.12;
      const gy1 = shooting.y - shooting.vy * tail * 0.12;
      const grad = ctx.createLinearGradient(shooting.x, shooting.y, gx1, gy1);
      grad.addColorStop(0, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shooting.x, shooting.y);
      ctx.lineTo(gx1, gy1);
      ctx.stroke();
    }

    for (const e of embers) {
      const a = 0.14 + 0.1 * Math.sin(t * 2 + e.ph);
      ctx.globalAlpha = a;
      const d = e.r * 8;
      ctx.drawImage(SPRITES[e.ci], e.x - d / 2, e.y - d / 2, d, d);
    }

    const holdBoost = hold ? 1 + Math.min(1, holdTimer / 1.25) * 0.16 : 1;
    const glowBoost = phase === 'glow' ? 1 + 0.2 * easeInOut(clamp01(phaseT / GLOW_DUR)) : 1;
    const glowSize = baseScale * lastBeat * 3.4 * holdBoost * glowBoost;
    ctx.globalAlpha = (0.12 + 0.035 * Math.sin(t * 1.1)) * glowBoost * fadeIn;
    ctx.drawImage(glowLayer, CX + viewShiftX - glowSize / 2, CY + viewShiftY - glowSize / 2, glowSize, glowSize);
    const since = t - celebrateAt;
    if (since >= 0 && since < 4.5) {
      const p = since / 4.5;
      const gs = baseScale * (1.8 + p * 3.4);
      ctx.globalAlpha = (1 - p) * 0.32;
      ctx.drawImage(glowLayer, CX + viewShiftX - gs / 2, CY + viewShiftY - gs / 2, gs, gs);
    }

    const beat = lastBeat;
    const breathe = 1 + 0.016 * Math.sin(t * 0.9 + 0.6);
    const sc = baseScale * beat * breathe;

    let u = 0;
    let e = 0;
    if (phase === 'toText' || phase === 'toHeart') {
      u = clamp01(phaseT / MOVE_DUR);
      e = easeInOut(u);
    }

    for (let i = 0; i < P.count; i++) {
      const bx = P.bx[i];
      const by = P.by[i];
      const baseX = CX + viewShiftX + bx * sc;
      const baseY = CY + viewShiftY - by * sc;
      let x;
      let y;

      if (phase === 'heart' || phase === 'glow') {
        const rot = 0.055 * Math.sin(t * 0.42);
        const cosr = Math.cos(rot);
        const sinr = Math.sin(rot);
        const lx = bx * sc;
        const ly = -by * sc;
        const hx = CX + viewShiftX + lx * cosr - ly * sinr;
        const hy = CY + viewShiftY + lx * sinr + ly * cosr;
        const a = t * P.sp[i] + P.ph[i];
        const ang = Math.atan2(P.by[i], P.bx[i]);
        const wave = Math.sin(t * 0.75 - ang * 3 + P.ph[i]) * P.dr[i];
        x = hx + Math.cos(a) * (2.2 + P.dr[i] * 7) + Math.cos(ang) * wave * sc * 0.55;
        y = hy + Math.sin(a * 1.37 + 0.7) * (1.8 + P.dr[i] * 6) + Math.sin(ang) * wave * sc * 0.55;
      } else if (phase === 'toText') {
        const tx = targets[i * 2];
        const ty = targets[i * 2 + 1];
        const swirl = Math.sin(phaseT * 7 + P.ph[i]) * (1 - e) * 0.22;
        x = lerp(baseX, tx, e) + swirl * sc;
        y = lerp(baseY, ty, e) + Math.cos(phaseT * 9 + P.tw[i]) * (1 - e) * 0.15 * sc;
      } else if (phase === 'text') {
        const ts = 1 + 0.008 * Math.sin(t * 0.7);
        x = CX + (targets[i * 2] - CX) * ts + Math.sin(t * 1.4 + P.ph[i]) * 1.5;
        y = CY * 0.95 + (targets[i * 2 + 1] - CY * 0.95) * ts + Math.cos(t * 1.8 + P.tw[i]) * 1.5;
      } else {
        const tx = targets[i * 2];
        const ty = targets[i * 2 + 1];
        const swirl = Math.sin(phaseT * 8 + P.tw[i]) * e * 0.22;
        x = lerp(tx, baseX, e) + swirl * sc;
        y = lerp(ty, baseY, e) + Math.cos(phaseT * 6 + P.ph[i]) * e * 0.16 * sc;
      }

      const tw = 0.72 + 0.28 * Math.sin(t * 1.6 + P.tw[i]);
      const d = (1.6 + P.sz[i] * 0.5) * (sc / baseScale) * tw * holdBoost * glowBoost;
      ctx.globalAlpha = (P.edge[i] ? 0.9 + 0.1 * tw : 0.58 + 0.22 * tw) * fadeIn;
      ctx.drawImage(SPRITES[P.ci[i]], x - d / 2, y - d / 2, d, d);
    }

    for (const s of sparks) {
      ctx.globalAlpha = clamp01(s.life * 1.8) * 0.8;
      const d = s.r * 7;
      ctx.drawImage(SPRITES[s.ci], s.x - d / 2, s.y - d / 2, d, d);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- events ----------

  function endHold(e) {
    if (hold && hold.id === e.pointerId) hold = null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (awaitingProposal) hideHint();
    pointerX = e.clientX;
    pointerY = e.clientY;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {
      // ignore
    }
    hold = { x: e.clientX, y: e.clientY, id: e.pointerId };
    holdTimer = 0;
  });
  canvas.addEventListener('pointerup', endHold);
  canvas.addEventListener('pointercancel', endHold);
  canvas.addEventListener('pointerleave', endHold);

  window.addEventListener('pointermove', (e) => {
    pointerX = e.clientX;
    pointerY = e.clientY;
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (/^[0-9]$/.test(e.key)) {
      keyBuf = (keyBuf + e.key).slice(-8);
      if (keyBuf === SECRET_CODE) {
        if (awaitingProposal) startProposal();
        else triggerSecret();
      }
    }
  });

  envelopeEl.addEventListener('pointerup', openEnvelope);
  envelopeEl.addEventListener('click', openEnvelope);
  envelopeEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEnvelope();
    }
  });
  toHeartBtn.addEventListener('click', continueToHeart);

  yesBtn.addEventListener('click', onYesClick);
  noBtn.addEventListener('click', onNoClick);
  celebrationEl.addEventListener('click', resetToIntro);

  window.addEventListener('blur', () => {
    hold = null;
    keyBuf = '';
  });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // ---------- boot ----------

  resize();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
