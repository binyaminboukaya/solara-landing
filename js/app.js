/* ═══════════════════════════════════════════════════════════
   SOLARA — scroll-driven canvas animation
   192 frames @ 24fps from solara.mp4 (8s, 1280×720)
═══════════════════════════════════════════════════════════ */

const FRAME_COUNT = 192;
const FRAME_SPEED = 2.0; // product animation completes by ~55% scroll
const IMAGE_SCALE = 1.0;

const canvas          = document.getElementById('canvas');
const ctx             = canvas.getContext('2d');
const canvasWrap      = document.getElementById('canvas-wrap');
const scrollContainer = document.getElementById('scroll-container');
const loaderEl        = document.getElementById('loader');
const loaderBar       = document.getElementById('loader-bar');
const loaderPercent   = document.getElementById('loader-percent');

let frames      = new Array(FRAME_COUNT).fill(null);
let currentFrame = 0;
let sampledBg   = '#000000';
let loadedCount = 0;

/* ─────────────────────────────────────── CANVAS RESIZE */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = window.innerWidth  + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  drawFrame(currentFrame);
}
window.addEventListener('resize', resizeCanvas);

/* ─────────────────────────────────────── BACKGROUND SAMPLER */
function sampleBgColor(img) {
  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = 4; offscreen.height = 4;
    const oc = offscreen.getContext('2d');
    oc.drawImage(img, 0, 0, 4, 4);
    const d = oc.getImageData(0, 0, 1, 1).data;
    sampledBg = `rgb(${d[0]},${d[1]},${d[2]})`;
  } catch (e) {
    sampledBg = '#000000';
  }
}

/* ─────────────────────────────────────── DRAW FRAME */
function drawFrame(index) {
  const img = frames[index];
  if (!img) return;
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.width  / dpr;
  const ch = canvas.height / dpr;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;
  ctx.fillStyle = sampledBg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ─────────────────────────────────────── FRAME LOADER */
function loadFrames() {
  const FIRST_BATCH = 10;

  function loadOne(i) {
    return new Promise((resolve) => {
      const img = new Image();
      const pad = String(i + 1).padStart(4, '0');
      img.src = `frames/frame_${pad}.webp`;
      img.onload = () => {
        frames[i] = img;
        loadedCount++;
        if (i % 20 === 0) sampleBgColor(img);
        const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
        loaderBar.style.width = pct + '%';
        loaderPercent.textContent = pct + '%';
        resolve();
      };
      img.onerror = () => { loadedCount++; resolve(); };
    });
  }

  // Phase 1: first 10 frames for fast first paint
  const firstBatch = Array.from(
    { length: Math.min(FIRST_BATCH, FRAME_COUNT) },
    (_, i) => loadOne(i)
  );

  Promise.all(firstBatch).then(() => {
    resizeCanvas();
    drawFrame(0);

    // Phase 2: remaining frames in background
    const remaining = [];
    for (let i = FIRST_BATCH; i < FRAME_COUNT; i++) remaining.push(loadOne(i));

    Promise.all(remaining).then(() => {
      gsap.to(loaderEl, {
        opacity: 0,
        duration: 0.6,
        onComplete: () => { loaderEl.style.display = 'none'; }
      });
      initSite();
    });
  });
}

/* ─────────────────────────────────────── INIT SITE */
function initSite() {
  initLenis();
  initHeroAnimation();
  initHeroTransition();
  initFrameScroll();
  initSectionAnimations();
  initMarquee();
  initCounters();
  initDarkOverlay(0.68, 0.82);
  initModalAndForm();
}

/* ─────────────────────────────────────── LENIS SMOOTH SCROLL */
function initLenis() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ─────────────────────────────────────── HERO WORD REVEAL */
function initHeroAnimation() {
  const tl = gsap.timeline({ delay: 0.3 });
  tl.to('.hero-heading .word', {
    y: 0,
    opacity: 1,
    stagger: 0.12,
    duration: 1.0,
    ease: 'power3.out'
  })
  .to('.hero-tagline', { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.4')
  .to('.scroll-indicator', { opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.2');
}

/* ─────────────────────────────────────── HERO → CANVAS CIRCLE WIPE */
function initHeroTransition() {
  const heroSection = document.querySelector('.hero-standalone');

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      heroSection.style.opacity = String(Math.max(0, 1 - p * 18));
      const wipeProgress = Math.min(1, Math.max(0, (p - 0.01) / 0.07));
      const radius = wipeProgress * 75;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
    }
  });
}

/* ─────────────────────────────────────── FRAME → SCROLL BINDING */
function initFrameScroll() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }
    }
  });
}

/* ─────────────────────────────────────── SECTION ANIMATIONS */
function initSectionAnimations() {
  const scrollH = scrollContainer.offsetHeight;

  document.querySelectorAll('.scroll-section').forEach((section) => {
    const enter  = parseFloat(section.dataset.enter)  / 100;
    const leave  = parseFloat(section.dataset.leave)  / 100;
    const persist = section.dataset.persist === 'true';
    const midPct  = (enter + leave) / 2;

    section.style.top = (midPct * scrollH) + 'px';
    section.style.transform = 'translateY(-50%)';

    const type = section.dataset.animation;
    const children = section.querySelectorAll(
      '.section-label, .section-heading, .section-body, .cta-button, .stat, .cta-inner > *'
    );

    const tl = gsap.timeline({ paused: true });

    switch (type) {
      case 'fade-up':
        tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
        break;
      case 'slide-left':
        tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
        break;
      case 'slide-right':
        tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
        break;
      case 'scale-up':
        tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
        break;
      case 'stagger-up':
        tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out' });
        break;
      case 'clip-reveal':
        tl.from(children, {
          clipPath: 'inset(100% 0 0 0)',
          opacity: 0,
          stagger: 0.15,
          duration: 1.2,
          ease: 'power4.inOut'
        });
        break;
    }

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: false,
      onUpdate: (self) => {
        const p = self.progress;
        if (p >= enter && p <= leave) {
          if (tl.progress() < 1) tl.play();
        } else if (!persist) {
          if (tl.progress() > 0) tl.reverse();
        }
      }
    });
  });
}

/* ─────────────────────────────────────── MARQUEE */
function initMarquee() {
  const marquee     = document.getElementById('marquee');
  const marqueeText = marquee.querySelector('.marquee-text');
  const speed       = parseFloat(marquee.dataset.scrollSpeed) || -22;

  gsap.to(marqueeText, {
    xPercent: speed,
    ease: 'none',
    scrollTrigger: {
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true
    }
  });

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;
      if (p > 0.08 && p < 0.75) {
        opacity = Math.min(1, (p - 0.08) / 0.06) * Math.min(1, (0.75 - p) / 0.06);
      }
      marquee.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    }
  });
}

/* ─────────────────────────────────────── COUNTER ANIMATIONS */
function initCounters() {
  document.querySelectorAll('.stat-number').forEach((el) => {
    const decimals = parseInt(el.dataset.decimals || '0');
    const targetValue = parseFloat(el.dataset.value || 0);

    gsap.to(el, {
      textContent: targetValue,
      duration: 2,
      ease: 'power1.out',
      snap: { textContent: decimals === 0 ? 1 : 0.01 },
      scrollTrigger: {
        trigger: el.closest('.scroll-section'),
        start: 'top 70%',
        toggleActions: 'play none none reverse'
      },
      onUpdate: function () {
        el.textContent = decimals === 0
          ? Math.round(parseFloat(el.textContent))
          : parseFloat(el.textContent).toFixed(decimals);
      }
    });
  });
}

/* ─────────────────────────────────────── DARK OVERLAY */
function initDarkOverlay(enter, leave) {
  const overlay   = document.getElementById('dark-overlay');
  const fadeRange = 0.04;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;
      if (p >= enter - fadeRange && p <= enter) {
        opacity = (p - (enter - fadeRange)) / fadeRange;
      } else if (p > enter && p < leave) {
        opacity = 0.91;
      } else if (p >= leave && p <= leave + fadeRange) {
        opacity = 0.91 * (1 - (p - leave) / fadeRange);
      }
      overlay.style.opacity = String(Math.max(0, Math.min(0.91, opacity)));
    }
  });
}

/* ─────────────────────────────────────── MODAL & FORM HANDLING */
function initModalAndForm() {
  const contactModal = document.getElementById('contact-modal');
  const closeBtns = document.querySelectorAll('.modal-close');
  const openBtns = document.querySelectorAll('.nav-cta, .cta-button');
  const legalLinks = document.querySelectorAll('.legal-link');
  const form = document.getElementById('lead-form');
  const submitBtn = document.getElementById('submit-btn');
  const successMsg = document.getElementById('form-success');

  // Open Contact Modal
  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      contactModal.classList.add('is-open');
    });
  });

  // Open Legal Modals
  legalLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      document.getElementById(targetId).classList.add('is-open');
    });
  });

  // Close ALL Modals
  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('is-open'));
  }

  closeBtns.forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  // Smooth Scroll for Nav Links
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        // Calculate the scroll position based on scroll trigger's percentage
        const enterPct = parseFloat(targetElement.dataset.enter) / 100;
        const scrollH = scrollContainer.offsetHeight;
        const targetScroll = enterPct * scrollH;
        
        // Use Lenis or window scroll
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    });
  });

  // Form submit via AJAX
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const originalText = submitBtn.querySelector('.btn-text').textContent;
      submitBtn.disabled = true;
      submitBtn.querySelector('.btn-text').textContent = 'שולח...';

      try {
        const response = await fetch(form.action, {
          method: form.method,
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          form.reset();
          successMsg.style.display = 'block';
          submitBtn.style.display = 'none';
        } else {
          alert('אירעה שגיאה. אנא נסה שוב.');
        }
      } catch (error) {
        alert('אירעה שגיאה בחיבור לשרת.');
      } finally {
        if(submitBtn.style.display !== 'none') {
           submitBtn.disabled = false;
           submitBtn.querySelector('.btn-text').textContent = originalText;
        }
      }
    });
  }
}

/* ─────────────────────────────────────── BOOT */
gsap.registerPlugin(ScrollTrigger);
loadFrames();
