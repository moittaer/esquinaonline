/* ============================================================
   PAGE LOADER — Logo Fill Animation + Glass Card
   ============================================================ */
(function initLoader() {

  function run() {
    const wrap       = document.getElementById('page-loader');
    const bgCanvas   = document.getElementById('loaderBg');
    const logoCanvas = document.getElementById('loaderLogoCanvas');
    const pctEl      = document.getElementById('loaderPct');
    if (!wrap || !logoCanvas) return;
    startLoader(wrap, bgCanvas, logoCanvas, pctEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }

  /* ============================================================ */
  function startLoader(wrap, bgCanvas, logoCanvas, pctEl) {

    document.body.classList.add('loader-active');

    /* ── Progresso global (0 → 1) ── */
    let progress  = 0;
    let loadDone  = false;
    let dismissed = false;
    let rafId;

    const START_TIME   = performance.now();
    const MIN_DURATION = 2400;

    let browserProg = 0;
    document.addEventListener('DOMContentLoaded', () => { browserProg = Math.max(browserProg, 0.55); });
    window.addEventListener('load', () => { browserProg = 1; loadDone = true; });

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const lerp    = (a, b, t) => a + (b - a) * t;

    function calcProgress(now) {
      const elapsed  = now - START_TIME;
      const timeFrac = Math.min(elapsed / MIN_DURATION, 1);
      const timeProg = easeOut(timeFrac) * (loadDone ? 1 : 0.85);
      const target   = Math.max(timeProg, browserProg * (loadDone ? 1 : 0.8));
      progress = Math.min(1, Math.max(progress, lerp(progress, target, 0.045)));
    }

    /* ── Background canvas — partículas leves ── */
    let bgW, bgH, bgDpr;
    const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
    const PARTICLES = Array.from({ length: 55 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - .5) * .00018,
      vy: (Math.random() - .5) * .00018,
      r: .5 + Math.random() * 1.2,
      a: .04 + Math.random() * .09,
    }));
    const EDGES_BG = [];
    for (let i = 0; i < PARTICLES.length; i++)
      for (let j = i + 1; j < PARTICLES.length; j++)
        if (Math.hypot(PARTICLES[i].x - PARTICLES[j].x, PARTICLES[i].y - PARTICLES[j].y) < .18)
          EDGES_BG.push([i, j]);

    function resizeBg() {
      if (!bgCanvas) return;
      bgDpr = window.devicePixelRatio || 1;
      bgW = window.innerWidth; bgH = window.innerHeight;
      bgCanvas.width  = bgW * bgDpr; bgCanvas.height = bgH * bgDpr;
      bgCanvas.style.width = bgW + 'px'; bgCanvas.style.height = bgH + 'px';
      bgCtx.setTransform(bgDpr, 0, 0, bgDpr, 0, 0);
    }
    resizeBg();
    window.addEventListener('resize', resizeBg);

    function drawBg() {
      if (!bgCtx) return;
      bgCtx.clearRect(0, 0, bgW, bgH);

      const grd = bgCtx.createRadialGradient(bgW/2, bgH/2, 0, bgW/2, bgH/2, Math.max(bgW, bgH) * .55);
      grd.addColorStop(0,   'rgba(139,92,246,.07)');
      grd.addColorStop(.6,  'rgba(139,92,246,.02)');
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.fillStyle = grd;
      bgCtx.fillRect(0, 0, bgW, bgH);

      PARTICLES.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      });

      EDGES_BG.forEach(([i, j]) => {
        const a = PARTICLES[i], b = PARTICLES[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const alpha = (1 - dist / .18) * .08;
        bgCtx.strokeStyle = `rgba(139,92,246,${alpha})`;
        bgCtx.lineWidth   = .6;
        bgCtx.beginPath();
        bgCtx.moveTo(a.x * bgW, a.y * bgH);
        bgCtx.lineTo(b.x * bgW, b.y * bgH);
        bgCtx.stroke();
      });

      PARTICLES.forEach(p => {
        bgCtx.fillStyle = `rgba(167,139,250,${p.a})`;
        bgCtx.beginPath();
        bgCtx.arc(p.x * bgW, p.y * bgH, p.r, 0, Math.PI * 2);
        bgCtx.fill();
      });
    }

    /* ── Logo canvas — fill animation ── */
    const lCtx    = logoCanvas.getContext('2d');
    const logoImg = new Image();
    let logoLoaded = false;
    let lW, lH, lDpr;
    const LOGO_ASPECT = 1293 / 327;

    function resizeLogo() {
      lDpr = window.devicePixelRatio || 1;
      const cardEl = wrap.querySelector('.loader-card');
      const cardW  = cardEl ? cardEl.clientWidth - 128 : Math.min(window.innerWidth * .75, 420);
      lW = Math.round(Math.min(cardW, 420));
      lH = Math.round(lW / LOGO_ASPECT);
      logoCanvas.width  = lW * lDpr;
      logoCanvas.height = lH * lDpr;
      logoCanvas.style.width  = lW + 'px';
      logoCanvas.style.height = lH + 'px';
      lCtx.setTransform(lDpr, 0, 0, lDpr, 0, 0);
    }
    resizeLogo();
    window.addEventListener('resize', () => { resizeLogo(); });

    logoImg.src = 'assets/logo.webp';
    logoImg.onload = () => { logoLoaded = true; };

    let maskCanvas;
    function buildMask() {
      maskCanvas = document.createElement('canvas');
      maskCanvas.width  = lW * lDpr;
      maskCanvas.height = lH * lDpr;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.setTransform(lDpr, 0, 0, lDpr, 0, 0);
      mCtx.drawImage(logoImg, 0, 0, lW, lH);
    }

    function drawLogo(p) {
      lCtx.clearRect(0, 0, lW, lH);
      if (!logoLoaded) return;
      if (!maskCanvas) buildMask();

      /* CAMADA 1: fantasma (logo original bem transparente) */
      lCtx.save();
      lCtx.globalAlpha = 0.07;
      lCtx.drawImage(logoImg, 0, 0, lW, lH);
      lCtx.restore();

      /* CAMADA 2: preenchimento da forma esquerda → direita */
      const fillX = lW * p;
      const tmp   = document.createElement('canvas');
      tmp.width   = lW * lDpr; tmp.height = lH * lDpr;
      const tCtx  = tmp.getContext('2d');
      tCtx.setTransform(lDpr, 0, 0, lDpr, 0, 0);

      tCtx.drawImage(maskCanvas, 0, 0, lW, lH);
      tCtx.globalCompositeOperation = 'source-in';

      const fillGrad = tCtx.createLinearGradient(0, 0, lW, 0);
      fillGrad.addColorStop(0,    '#ffffff');
      fillGrad.addColorStop(0.45, '#c4b5fd');
      fillGrad.addColorStop(1,    '#8B5CF6');
      tCtx.fillStyle = fillGrad;
      tCtx.fillRect(0, 0, fillX, lH);

      lCtx.drawImage(tmp, 0, 0, lW, lH);

      /* Shimmer na fronteira da onda */
      if (p > 0.01 && p < 0.99) {
        const shimTmp  = document.createElement('canvas');
        shimTmp.width  = lW * lDpr; shimTmp.height = lH * lDpr;
        const sCtx     = shimTmp.getContext('2d');
        sCtx.setTransform(lDpr, 0, 0, lDpr, 0, 0);
        sCtx.drawImage(maskCanvas, 0, 0, lW, lH);
        sCtx.globalCompositeOperation = 'source-in';
        const shimW  = lW * 0.06;
        const shimX  = fillX - shimW * .5;
        const shimGr = sCtx.createLinearGradient(shimX, 0, shimX + shimW, 0);
        shimGr.addColorStop(0,   'rgba(255,255,255,0)');
        shimGr.addColorStop(0.5, 'rgba(255,255,255,0.6)');
        shimGr.addColorStop(1,   'rgba(255,255,255,0)');
        sCtx.fillStyle = shimGr;
        sCtx.fillRect(Math.max(0, shimX - shimW), 0, shimW * 3, lH);
        lCtx.drawImage(shimTmp, 0, 0, lW, lH);
      }
    }

    function updatePct(p) {
      if (pctEl) pctEl.textContent = Math.round(p * 100);
    }

    /* ── Loop principal ── */
    function frame(now) {
      if (dismissed) return;
      calcProgress(now);
      drawBg();
      drawLogo(progress);
      updatePct(progress);

      if (progress >= 1) {
        drawLogo(1); updatePct(1);
        setTimeout(dismissLoader, 480);
        dismissed = true;
        return;
      }
      rafId = requestAnimationFrame(frame);
    }

    function dismissLoader() {
      cancelAnimationFrame(rafId);
      document.body.classList.remove('loader-active');
      wrap.classList.add('loader-hidden');
      wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
    }

    setTimeout(() => { if (!dismissed) { dismissed = true; dismissLoader(); } }, 7000);

    rafId = requestAnimationFrame(frame);

  } // end startLoader
})();

/* ============================================================
   /PAGE LOADER
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    // 1. Cursor Customizado - Ativação Apenas para Desktop Pointers
    const cursor = document.getElementById('cursor');
    if (cursor && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        document.addEventListener('mousemove', e => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        const hoverTargets = document.querySelectorAll('a, button, .tag, .process-video-box, .client-logo, .ctrl-btn, .c-dot');
        hoverTargets.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
    }

    // 2. Animação de Blob e Transmutação do Header no Scroll Limitada (Debounce R.A.F)
    const header = document.querySelector('header');
    const blob = document.querySelector('.gradient-blob');
    let isTicking = false;

    // 2a. Parallax elegante nas imagens de serviço — scale + translateY suave
    const parallaxItems = Array.from(document.querySelectorAll('[data-parallax]'));

    // Estado atual interpolado por cartão (lerp para suavidade extra)
    const parallaxState = parallaxItems.map(() => ({ cur: 0, target: 0 }));
    let rafId = null;
    let isParallaxRunning = false;

    const calcTargets = () => {
        const vH = window.innerHeight;
        parallaxItems.forEach((wrap, i) => {
            const visual = wrap.closest('.service-visual');
            if (!visual) return;
            const rect = visual.getBoundingClientRect();
            // Progresso: -1 (card acima da viewport) → +1 (card abaixo)
            const progress = ((rect.top + rect.height / 2) - vH / 2) / (vH * 0.7);
            const clamped = Math.min(Math.max(progress, -1), 1);
            // ±14px de deslocamento dentro da margem de scale(1.20)
            parallaxState[i].target = clamped * 14;
        });
    };

    const applyParallax = () => {
        let stillMoving = false;
        parallaxState.forEach((state, i) => {
            // Lerp: suaviza a transição (fator 0.08 = muito fluido)
            state.cur += (state.target - state.cur) * 0.08;
            if (Math.abs(state.target - state.cur) > 0.05) stillMoving = true;
            // scale(1.20) constante + translateY variável
            parallaxItems[i].style.transform = `scale(1.20) translateY(${state.cur.toFixed(3)}px)`;
        });
        if (stillMoving) {
            rafId = requestAnimationFrame(applyParallax);
        } else {
            isParallaxRunning = false;
        }
    };

    const updateServiceParallax = () => {
        if (!parallaxItems.length) return;
        calcTargets();
        if (!isParallaxRunning) {
            isParallaxRunning = true;
            rafId = requestAnimationFrame(applyParallax);
        }
    };

    const onScroll = () => {
        // Toggle de transparência de Header
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Parallax na camada do blob (opcional/embelezamento)
        if (blob) {
            blob.style.transform = `translateY(calc(-50% + ${window.scrollY * 0.12}px))`;
        }

        // Parallax das imagens de serviço
        updateServiceParallax();

        isTicking = false;
    };

    // Roda uma vez no carregamento para estado inicial correto
    updateServiceParallax();

    window.addEventListener('scroll', () => {
        if (!isTicking) {
            window.requestAnimationFrame(onScroll);
            isTicking = true;
        }
    });

    // 3. Efeitos Texto: Troca de Palavras Animadas
    const swapModules = document.querySelectorAll('.hl-swap');
    swapModules.forEach(swapEl => {
        const words = ['& Dados Online', '& Criatividade', '& Mídia Online'];
        let currentIndex = 0;
        const nextText = swapEl.querySelector('.s-nxt');
        const currText = swapEl.querySelector('.s-cur');

        if (currText && nextText) {
            setInterval(() => {
                swapEl.classList.remove('go');
                currText.textContent = words[currentIndex];
                currentIndex = (currentIndex + 1) % words.length;
                nextText.textContent = words[currentIndex];

                setTimeout(() => swapEl.classList.add('go'), 50);
            }, 4000);
        }
    });

    // 4. Reveal Components Animados Usando Observers Nativos
    const obsOptions = { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 };
    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                obs.unobserve(entry.target);
            }
        });
    }, obsOptions);

    document.querySelectorAll('.reveal, .service-card, .process-step, .btn-play').forEach(el => {
        revealObserver.observe(el);
    });

    // 5. Motor Moderno do Carrossel de Liderança (Alavancando API Nativa Smooth Scroll)
    const leaderCarousel = document.querySelector('.leader-carousel-wrap');
    const leaderCards = document.querySelectorAll('.leader-card');
    const prevCtrl = document.getElementById('leaderPrev');
    const nextCtrl = document.getElementById('leaderNext');
    const dotsContainer = document.getElementById('leaderDots');

    if (leaderCarousel && leaderCards.length > 0) {
        let dots = [];
        // Gera as bolinhas dinamicamente com base na quantidade de cards
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            leaderCards.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.classList.add('c-dot');
                dot.addEventListener('click', () => {
                    leaderCards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                });
                dotsContainer.appendChild(dot);
                dots.push(dot);
            });
        }

        // Atualiza bolinhas magicamente ativando card que está no meio da tela
        const snapObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = Array.from(leaderCards).indexOf(entry.target);
                    dots.forEach(d => d.classList.remove('active'));
                    if (dots[idx]) dots[idx].classList.add('active');
                }
            });
        }, { root: leaderCarousel, threshold: 0.6 });

        leaderCards.forEach(card => snapObserver.observe(card));

        // Controle por setas
        const scrollSize = () => window.innerWidth > 900 ? (leaderCarousel.clientWidth / 2) + 12 : leaderCarousel.clientWidth;
        if (prevCtrl) {
            prevCtrl.addEventListener('click', () => {
                leaderCarousel.scrollBy({ left: -scrollSize(), behavior: 'smooth' });
            });
        }
        if (nextCtrl) {
            nextCtrl.addEventListener('click', () => {
                leaderCarousel.scrollBy({ left: scrollSize(), behavior: 'smooth' });
            });
        }
    }
});
