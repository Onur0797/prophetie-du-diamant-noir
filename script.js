/* ===================================================
   LE DIAMANT NOIR — v9 — Audio iOS Safari compatible
=================================================== */
'use strict';

const CREDENTIALS = { username: 'leDiamantNoir', password: 'souterrain' };
const TARGET_DATE = new Date('2026-06-16T17:15:00Z');

const screenLogin     = document.getElementById('screen-login');
const screenCountdown = document.getElementById('screen-countdown');
const usernameInput   = document.getElementById('username');
const passwordInput   = document.getElementById('password');
const loginBtn        = document.getElementById('login-btn');
const errorMsg        = document.getElementById('error-message');
const daysEl          = document.getElementById('days');
const hoursEl         = document.getElementById('hours');
const minutesEl       = document.getElementById('minutes');
const secondsEl       = document.getElementById('seconds');
const progressBar     = document.getElementById('progress-bar');

// ============================================================
//  MOTEUR AUDIO — compatible iOS Safari
// ============================================================

let ctx          = null;
let audioStarted = false;
const buffers    = {};

// IMPORTANT : chain.flac → chain.wav (FLAC non supporté sur iOS Safari)
const SOUNDS = {
  creak:   'creak.wav',
  chain:   'chain.wav',   // ← converti depuis chain.flac
  whisper: 'whisper.wav',
};

// Charge et décode un fichier audio
// Fallback vers <audio> si fetch échoue (fréquent en local sur iOS)
async function loadBuffer(name, url) {
  // --- Tentative 1 : fetch + decodeAudioData ---
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const raw = await resp.arrayBuffer();
    buffers[name] = await ctx.decodeAudioData(raw);
    console.log('[audio] chargé (fetch) :', name);
    return;
  } catch (e) {
    console.warn('[audio] fetch échoué pour', url, '—', e.message, '— tentative fallback <audio>');
  }

  // --- Tentative 2 : MediaElementSource (fallback iOS) ---
  try {
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.src = url;
    await new Promise((resolve, reject) => {
      el.oncanplaythrough = resolve;
      el.onerror = reject;
      el.load();
      // Timeout de sécurité : certains navigateurs mobiles ne déclenchent
      // pas canplaythrough pour des fichiers courts
      setTimeout(resolve, 3000);
    });
    const mediaSrc = ctx.createMediaElementSource(el);
    // On stocke l'élément HTML audio + son nœud source
    buffers[name] = { _el: el, _mediaSrc: mediaSrc };
    console.log('[audio] chargé (fallback <audio>) :', name);
  } catch (e2) {
    console.warn('[audio] fallback aussi échoué pour', url, '—', e2);
  }
}

// Joue un son — gère les deux cas (AudioBuffer ou MediaElement)
function playBuf(name, { vol = 1, loop = false, rate = 1 } = {}) {
  if (!ctx || !buffers[name]) return null;

  const buf = buffers[name];

  // Cas 1 : AudioBuffer classique
  if (buf instanceof AudioBuffer) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = loop;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(ctx.destination);
    src.start(ctx.currentTime);
    return src;
  }

  // Cas 2 : MediaElement fallback
  if (buf._el) {
    const el = buf._el;
    el.loop = loop;
    el.playbackRate = rate;
    // Reconnecte le gain à chaque lecture (iOS détache parfois le nœud)
    try {
      const g = ctx.createGain();
      g.gain.value = vol;
      buf._mediaSrc.connect(g);
      g.connect(ctx.destination);
    } catch (_) { /* déjà connecté */ }
    el.currentTime = 0;
    el.play().catch(e => console.warn('[audio] play() bloqué :', e));
    return el;
  }

  return null;
}

// ============================================================
//  CRAQUEMENTS DE BOIS
// ============================================================
function playCreak() {
  if (!audioStarted) return;
  playBuf('creak', {
    vol:  0.25 + Math.random() * 0.10,
    rate: 0.75 + Math.random() * 0.5,
  });
  const next = Math.random() < 0.05
    ? 2000 + Math.random() * 3000
    : 8000 + Math.random() * 12000;
  setTimeout(playCreak, next);
}

// ============================================================
//  CHAÎNE D'ANCRE
// ============================================================
function playChain() {
  if (!audioStarted) return;
  playBuf('chain', {
    vol:  0.8 + Math.random() * 0.2,
    rate: 0.8 + Math.random() * 0.4,
  });
  setTimeout(playChain, 5000 + Math.random() * 12000);
}

// ============================================================
//  CHUCHOTEMENTS — loop avec fade in/out
// ============================================================
let whisperNode = null;
let whisperGain = null;

function startWhispers() {
  if (!audioStarted || !buffers['whisper']) return;

  const buf = buffers['whisper'];

  whisperGain = ctx.createGain();
  whisperGain.gain.value = 0;
  whisperGain.connect(ctx.destination);

  if (buf instanceof AudioBuffer) {
    whisperNode = ctx.createBufferSource();
    whisperNode.buffer = buf;
    whisperNode.loop   = true;
    whisperNode.playbackRate.value = 0.9 + Math.random() * 0.2;
    whisperNode.connect(whisperGain);
    whisperNode.start();
  } else if (buf._el) {
    buf._el.loop = true;
    buf._el.playbackRate = 0.9 + Math.random() * 0.2;
    try { buf._mediaSrc.connect(whisperGain); } catch (_) {}
    buf._el.play().catch(() => {});
    whisperNode = buf._el;
  }

  whisperGain.gain.setValueAtTime(0, ctx.currentTime);
  whisperGain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 3);

  cycleWhispers();
}

function cycleWhispers() {
  if (!audioStarted || !whisperGain) return;
  const t       = ctx.currentTime;
  const fadeOut = 3 + Math.random() * 4;
  const silence = 4 + Math.random() * 8;
  const fadeIn  = 2 + Math.random() * 3;

  whisperGain.gain.cancelScheduledValues(t);
  whisperGain.gain.setValueAtTime(whisperGain.gain.value, t);
  whisperGain.gain.linearRampToValueAtTime(0, t + fadeOut);
  whisperGain.gain.linearRampToValueAtTime(0.55, t + fadeOut + silence + fadeIn);

  setTimeout(cycleWhispers, (fadeOut + silence + fadeIn + 1) * 1000);
}

// ============================================================
//  DÉMARRAGE — iOS exige que AudioContext soit créé
//  dans le même callstack que le geste utilisateur
// ============================================================
async function startAmbiance() {
  if (audioStarted) return;

  // ← Création ET resume dans le handler du geste (obligatoire iOS)
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  try { await ctx.resume(); } catch (_) {}

  await Promise.all(
    Object.entries(SOUNDS).map(([name, url]) => loadBuffer(name, url))
  );

  audioStarted = true;

  setTimeout(playCreak,      4000);
  setTimeout(playChain,      1000);
  setTimeout(playChain,      3500);
  setTimeout(startWhispers,   500);
}

function onFirstInteraction() {
  startAmbiance();
  document.removeEventListener('click',      onFirstInteraction);
  document.removeEventListener('keydown',    onFirstInteractionKey);
  document.removeEventListener('touchstart', onFirstInteraction);
}
function onFirstInteractionKey(e) {
  if (['Shift','Control','Alt','Meta','Tab'].includes(e.key)) return;
  onFirstInteraction();
}
document.addEventListener('click',      onFirstInteraction, { once: false });
document.addEventListener('keydown',    onFirstInteractionKey, { once: false });
document.addEventListener('touchstart', onFirstInteraction, { once: false });

// ============================================================
//  PARTICULES
// ============================================================
(function createParticles() {
  const container = document.getElementById('particles');
  const count = window.innerWidth < 600 ? 22 : 45;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const isEmber = Math.random() < 0.3;
    p.className = 'particle ' + (isEmber ? 'ember' : 'ash');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
    const size = isEmber ? (Math.random() * 3 + 1) + 'px' : (Math.random() * 4 + 1) + 'px';
    p.style.width  = size;
    p.style.height = isEmber ? size : (parseFloat(size) * (0.3 + Math.random() * 0.5)) + 'px';
    p.style.animationDuration = (Math.random() * 25 + 12) + 's';
    p.style.animationDelay    = (Math.random() * 25) + 's';
    container.appendChild(p);
  }
})();

// ============================================================
//  GOUTTES DE SANG
// ============================================================
(function createBloodDrips() {
  const container = document.createElement('div');
  container.className = 'blood-drips';
  document.body.insertBefore(container, document.body.firstChild);
  const count = window.innerWidth < 600 ? 6 : 12;
  for (let i = 0; i < count; i++) {
    const drip = document.createElement('div');
    drip.className = 'drip';
    drip.style.left  = (5 + Math.random() * 90) + '%';
    drip.style.width = (1.5 + Math.random() * 3) + 'px';
    const h = 30 + Math.random() * 80;
    drip.style.setProperty('--drip-h', h + 'px');
    drip.style.animationDuration = (4 + Math.random() * 8) + 's';
    drip.style.animationDelay    = (Math.random() * 10) + 's';
    container.appendChild(drip);
  }
})();

// ============================================================
//  BRUME VERTE
// ============================================================
(function addMoldFog() {
  const fog3 = document.createElement('div');
  fog3.className = 'fog fog-3';
  document.body.appendChild(fog3);
})();

// ============================================================
//  CONNEXION
// ============================================================
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('visible');
  void errorMsg.offsetWidth;
  errorMsg.classList.add('visible');
}
function clearError() {
  errorMsg.classList.remove('visible');
  setTimeout(() => { errorMsg.textContent = ''; }, 400);
}
function handleLogin() {
  const u = usernameInput.value.trim();
  const p = passwordInput.value;
  if (!u || !p) { showError('⚠ Les deux champs doivent être remplis, matelot.'); return; }
  if (u === CREDENTIALS.username && p === CREDENTIALS.password) {
    clearError(); transitionToCountdown();
  } else {
    showError('Le sang des Ganseman ne coule pas en toi. La Prophétie rejette les imposteurs.');
    passwordInput.value = ''; passwordInput.focus();
    const box = document.querySelector('.login-box');
    box.style.animation = 'error-shake 0.4s ease';
    setTimeout(() => { box.style.animation = ''; }, 500);
    if (audioStarted) playBuf('creak', { vol: 0.8, rate: 0.9 + Math.random() * 0.3 });
  }
}
loginBtn.addEventListener('click', handleLogin);
[usernameInput, passwordInput].forEach(inp => {
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); else clearError(); });
});

// ============================================================
//  TRANSITION
// ============================================================
function transitionToCountdown() {
  screenLogin.classList.add('screen-exit');
  if (audioStarted) {
    playBuf('creak', { vol: 0.9 });
    setTimeout(() => playBuf('chain', { vol: 1.0 }), 400);
  }
  setTimeout(() => {
    screenLogin.classList.remove('active', 'screen-exit');
    screenLogin.style.display = 'none';
    screenCountdown.style.display = 'flex';
    screenCountdown.classList.add('screen-enter', 'active');
    setTimeout(() => screenCountdown.classList.remove('screen-enter'), 1400);
    startCountdown();
  }, 900);
}

// ============================================================
//  COMPTE À REBOURS
// ============================================================
const START_DATE = new Date(TARGET_DATE.getTime() - 365 * 24 * 60 * 60 * 1000);
function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }
function updateCountdown() {
  const now  = Date.now();
  const diff = TARGET_DATE.getTime() - now;
  if (diff <= 0) {
    daysEl.textContent = hoursEl.textContent = minutesEl.textContent = secondsEl.textContent = '00';
    progressBar.style.width = '100%';
    const lore = document.querySelector('.countdown-lore');
    if (lore) lore.innerHTML = '<strong style="color:var(--blood-bright);font-size:1.3rem;text-shadow:0 0 20px rgba(180,0,0,0.8)">L\'heure est venue. Le Diamant Noir s\'éveille.</strong>';
    return;
  }
  const s = diff / 1000;
  daysEl.textContent    = pad(s / 86400);
  hoursEl.textContent   = pad((s % 86400) / 3600);
  minutesEl.textContent = pad((s % 3600) / 60);
  secondsEl.textContent = pad(s % 60);
  const total = TARGET_DATE.getTime() - START_DATE.getTime();
  progressBar.style.width = Math.min(100, Math.max(0, ((now - START_DATE.getTime()) / total) * 100)) + '%';
}
function startCountdown() { updateCountdown(); setInterval(updateCountdown, 1000); }

// ============================================================
//  KONAMI
// ============================================================
const KONAMI = [38,38,40,40,37,39,37,39,66,65]; let konamiIdx = 0;
document.addEventListener('keydown', e => {
  konamiIdx = e.keyCode === KONAMI[konamiIdx] ? konamiIdx + 1 : 0;
  if (konamiIdx === KONAMI.length) { konamiIdx = 0; showKonamiMessage(); }
});
function showKonamiMessage() {
  const msg = document.createElement('div');
  msg.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(4,2,6,0.98);border:1px solid #8b0000;color:#e8cca0;font-family:'Special Elite',monospace;padding:2rem;z-index:9999;text-align:center;font-size:0.9rem;line-height:1.8;max-width:340px;box-shadow:0 0 60px rgba(100,0,0,0.6);`;
  msg.innerHTML = `<div style="font-size:2rem;margin-bottom:1rem;color:#cc1111">☠</div><strong style="font-family:'Cinzel',serif;letter-spacing:0.2em;color:#d4a843">INDICE SECRET</strong><br><br><em style="color:#c8b090">"La clé des abysses est cachée là où les étoiles se reflètent dans la nuit sans lune."</em><br><br><small style="color:#806040">— Archives du Capitaine Ganseman, Page 7</small><div style="margin-top:1.5rem"><button onclick="this.parentElement.parentElement.remove()" style="background:transparent;border:1px solid #6b0000;color:#aa2020;padding:0.4rem 1.2rem;font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.2em;cursor:pointer;">FERMER</button></div>`;
  document.body.appendChild(msg);
  if (audioStarted) playBuf('creak', { vol: 0.8 });
}

window.addEventListener('load', () => { usernameInput.focus(); });
