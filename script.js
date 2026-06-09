/* ===================================================
   LE DIAMANT NOIR — v11 — Audio iOS Safari maximal
   Stratégie : <audio> HTML natif + Web Audio pour effets
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
//  AUDIO — approche ultra-compatible iOS Safari
//  On utilise de simples éléments <audio> sans Web Audio API
//  du tout. iOS Safari joue <audio>.play() après un geste
//  utilisateur sans problème.
// ============================================================

let audioStarted = false;

// Crée un élément <audio> prêt à l'emploi
function makeAudio(src, loop = false) {
  const el = document.createElement('audio');
  el.src    = src;
  el.loop   = loop;
  el.preload = 'auto';
  return el;
}

// On crée plusieurs clones de creak/chain pour permettre
// des déclenchements quasi-simultanés sans couper le son précédent
const sounds = {
  creaks:  [makeAudio('creak.wav'), makeAudio('creak.wav'), makeAudio('creak.wav')],
  chains:  [makeAudio('chain.wav'), makeAudio('chain.wav')],
  whisper: makeAudio('whisper.wav', true),
};

let creakIdx = 0;
let chainIdx = 0;

function playCreakSound() {
  const el = sounds.creaks[creakIdx % sounds.creaks.length];
  creakIdx++;
  el.volume      = Math.min(1, 0.25 + Math.random() * 0.10);
  el.currentTime = 0;
  el.play().catch(() => {});
}

function playChainSound() {
  const el = sounds.chains[chainIdx % sounds.chains.length];
  chainIdx++;
  el.volume      = Math.min(1, 0.8 + Math.random() * 0.2);
  el.currentTime = 0;
  el.play().catch(() => {});
}

function startWhisperLoop() {
  sounds.whisper.volume = 0;
  sounds.whisper.play().catch(() => {});
  // Fade in manuel
  let v = 0;
  const fadeIn = setInterval(() => {
    v = Math.min(0.45, v + 0.01);
    sounds.whisper.volume = v;
    if (v >= 0.45) clearInterval(fadeIn);
  }, 100);
  // Cycle volume pour effet inquiétant
  setTimeout(cycleWhisperVolume, 8000);
}

function cycleWhisperVolume() {
  if (!audioStarted) return;
  const duration  = (3 + Math.random() * 4) * 1000;
  const silence   = (4 + Math.random() * 8) * 1000;
  const fadeInDur = (2 + Math.random() * 3) * 1000;
  const step      = 50;

  // Fade out
  const startVol = sounds.whisper.volume;
  let elapsed = 0;
  const fadeOut = setInterval(() => {
    elapsed += step;
    sounds.whisper.volume = Math.max(0, startVol * (1 - elapsed / duration));
    if (elapsed >= duration) {
      clearInterval(fadeOut);
      sounds.whisper.volume = 0;
      // Silence puis fade in
      setTimeout(() => {
        let v2 = 0;
        const fadeIn = setInterval(() => {
          v2 = Math.min(0.45, v2 + 0.45 / (fadeInDur / step));
          sounds.whisper.volume = v2;
          if (v2 >= 0.45) {
            clearInterval(fadeIn);
            setTimeout(cycleWhisperVolume, 5000 + Math.random() * 5000);
          }
        }, step);
      }, silence);
    }
  }, step);
}

// ============================================================
//  CRAQUEMENTS & CHAÎNE — boucles aléatoires
// ============================================================
function scheduleCreak() {
  if (!audioStarted) return;
  playCreakSound();
  const next = Math.random() < 0.05
    ? 2000 + Math.random() * 3000
    : 8000 + Math.random() * 12000;
  setTimeout(scheduleCreak, next);
}

function scheduleChain() {
  if (!audioStarted) return;
  playChainSound();
  setTimeout(scheduleChain, 5000 + Math.random() * 12000);
}

// ============================================================
//  DÉMARRAGE — déclenché au premier geste utilisateur
// ============================================================
async function startAmbiance() {
  if (audioStarted) return;
  audioStarted = true;

  // iOS : il faut appeler .play() directement dans le handler
  // du geste, donc on joue un silence d'abord pour débloquer
  // le contexte audio, puis on planifie les sons
  try {
    // Déblocage iOS : play() puis pause() immédiat sur chaque élément
    const unlocks = [
      ...sounds.creaks,
      ...sounds.chains,
      sounds.whisper,
    ];
    await Promise.all(unlocks.map(el => {
      el.volume = 0;
      return el.play().then(() => { el.pause(); el.currentTime = 0; }).catch(() => {});
    }));
  } catch (_) {}

  // Remet les volumes à zéro après unlock
  sounds.creaks.forEach(e => { e.volume = 0; });
  sounds.chains.forEach(e => { e.volume = 0; });
  sounds.whisper.volume = 0;

  // Lance les sons avec délais
  setTimeout(scheduleCreak,      4000);
  setTimeout(scheduleChain,      1000);
  setTimeout(() => scheduleChain(), 3500);
  setTimeout(startWhisperLoop,    500);
}

// ============================================================
//  PLAY À LA DEMANDE (pour les effets ponctuels)
// ============================================================
function playBuf(name, { vol = 1 } = {}) {
  if (!audioStarted) return;
  if (name === 'creak') {
    const el = sounds.creaks[creakIdx % sounds.creaks.length];
    creakIdx++;
    el.volume = Math.min(1, vol);
    el.currentTime = 0;
    el.play().catch(() => {});
  } else if (name === 'chain') {
    const el = sounds.chains[chainIdx % sounds.chains.length];
    chainIdx++;
    el.volume = Math.min(1, vol);
    el.currentTime = 0;
    el.play().catch(() => {});
  }
}

// ============================================================
//  DÉTECTION DU PREMIER GESTE
// ============================================================
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
    playBuf('creak', { vol: 0.8 });
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
  playBuf('creak', { vol: 0.9 });
  setTimeout(() => playBuf('chain', { vol: 1.0 }), 400);
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
  playBuf('creak', { vol: 0.8 });
}

window.addEventListener('load', () => { usernameInput.focus(); });
